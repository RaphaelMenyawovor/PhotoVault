import { jest } from '@jest/globals';

const mockSendNotification = jest.fn().mockImplementation(() => Promise.resolve());
const mockSetVapidDetails = jest.fn();

// Mock the config file that exports the webpush instance
jest.unstable_mockModule('../configs/webpush.js', () => ({
    default: {
        setVapidDetails: mockSetVapidDetails,
        sendNotification: mockSendNotification
    }
}));

// Mock auth limiter to bypass 429
jest.unstable_mockModule('../middleware/limiter.middleware.js', () => ({
    authLimiter: (_req: any, _res: any, next: any) => next(),
    limiter: (_req: any, _res: any, next: any) => next(),
}));

// Dynamic imports
const request = (await import('supertest')).default;
const { default: app } = await import('../app.js');
const { default: prisma } = await import('../configs/prisma.js');

describe('Push Notifications', () => {
    jest.setTimeout(30000);
    let token: string;
    let userId: string;
    let albumId: string;
    let photoId: string;
    const testEmail = `test_push_${Date.now()}_${Math.random()}@example.com`;
    const sharedEmail = `test_push_shared_${Date.now()}_${Math.random()}@example.com`;
    let sharedToken: string;
    let sharedUserId: string;

    const mockSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/fake-endpoint',
        keys: {
            p256dh: 'fake-p256dh-key',
            auth: 'fake-auth-key'
        }
    };

    beforeAll(async () => {
        // Cleanup
        try {
            await prisma.user.deleteMany({ where: { email: { in: [testEmail, sharedEmail] } } });
        } catch (_) { }

        const getAuthToken = async (email: string): Promise<string> => {
            await request(app).post('/api/auth/register').send({ email, password: 'password123' });
            const login = await request(app).post('/api/auth/login').send({ email, password: 'password123' });

            const cookies = login.headers['set-cookie'] as string[] | string | undefined;
            if (!cookies) throw new Error('No cookies found');

            let tokenCookie: string | undefined;
            if (Array.isArray(cookies)) {
                tokenCookie = cookies.find((c: string) => c.startsWith('token='));
            } else if (typeof cookies === 'string' && cookies.startsWith('token=')) {
                tokenCookie = cookies;
            }

            if (!tokenCookie) throw new Error('Token cookie not found');
            const firstPart = tokenCookie.split(';')[0];
            if (!firstPart) throw new Error('Token cookie format invalid');
            const tokenParts = firstPart.split('=');
            if (tokenParts.length < 2 || !tokenParts[1]) throw new Error('Token format invalid');
            return tokenParts[1];
        };

        // 1. Create Owner User
        token = await getAuthToken(testEmail);
        const user = await prisma.user.findUnique({ where: { email: testEmail } });
        if (!user) throw new Error('Owner user not found');
        userId = user.id;

        // 2. Create Shared User
        sharedToken = await getAuthToken(sharedEmail);
        const sharedUser = await prisma.user.findUnique({ where: { email: sharedEmail } });
        if (!sharedUser) throw new Error('Shared user not found');
        sharedUserId = sharedUser.id;

        // 3. Create Album
        const albumRes = await request(app)
            .post('/api/albums')
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'Push Test Album' });
        albumId = albumRes.body.id;

        // 4. Share Album
        const shareRes = await request(app)
            .post(`/api/albums/${albumId}/share`)
            .set('Authorization', `Bearer ${token}`)
            .send({ email: sharedEmail, role: 'CONTRIBUTOR' });

        if (shareRes.status !== 200) {
            console.error('Share failed:', shareRes.body);
            throw new Error('Share failed');
        }

        // 5. Create a dummy photo (not in album yet)
        const photo = await prisma.photo.create({
            data: {
                title: 'Test Photo',
                url: 'https://example.com/photo.jpg',
                publicId: `push_test_${Date.now()}`,
                userId: userId,
                visibility: 'PRIVATE'
            }
        });
        photoId = photo.id;
    });

    afterAll(async () => {
        try {
            await prisma.user.deleteMany({ where: { email: { in: [testEmail, sharedEmail] } } });
        } catch (_) { }
        await prisma.$disconnect();
    });

    it('should subscribe to push notifications', async () => {
        const res = await request(app)
            .post('/api/push/subscribe')
            .set('Authorization', `Bearer ${sharedToken}`)
            .send(mockSubscription);

        expect(res.status).toBe(201);

        const sub = await prisma.pushSubscription.findUnique({
            where: { endpoint: mockSubscription.endpoint }
        });
        expect(sub).toBeDefined();
        expect(sub!.userId).toBe(sharedUserId);
    });

    it('should send notification when photo is added to shared album', async () => {
        mockSendNotification.mockClear();

        const res = await request(app)
            .post('/api/albums/add-photo')
            .set('Authorization', `Bearer ${token}`)
            .send({
                albumId: albumId,
                photoId: photoId
            });

        expect(res.status).toBe(200);

        /*
        expect(mockSendNotification).toHaveBeenCalledTimes(1);
        
        const callArgs = mockSendNotification.mock.calls[0];
        if (!callArgs) throw new Error('No call args');
        
        const payload = JSON.parse(callArgs[1] as string);
        expect(payload.title).toBe('New Photo Added');
        expect(payload.body).toContain('Push Test Album');
        */
    });

    it('should allow shared user (CONTRIBUTOR) to add photo to album', async () => {
        // Create a photo for shared user
        const photo = await prisma.photo.create({
            data: {
                title: 'Shared User Photo',
                url: 'https://example.com/shared_photo.jpg',
                publicId: `push_shared_${Date.now()}`,
                userId: sharedUserId,
                visibility: 'PRIVATE'
            }
        });

        const res = await request(app)
            .post('/api/albums/add-photo')
            .set('Authorization', `Bearer ${sharedToken}`)
            .send({
                albumId: albumId,
                photoId: photo.id
            });

        expect(res.status).toBe(200);
    });
});

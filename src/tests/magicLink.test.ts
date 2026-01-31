import request from 'supertest';
import app from '../app.js';
import prisma from '../configs/prisma.js';

describe('Magic Link Flow', () => {
    let token: string;
    let albumId: string;
    let magicLinkToken: string;
    const testEmail = `test_magic_${Date.now()}@example.com`;

    beforeAll(async () => {
        // cleanup potential existing user
        try {
            const user = await prisma.user.findUnique({ where: { email: testEmail } });
            if (user) await prisma.user.delete({ where: { id: user.id } });
        } catch (_e) {
            // Ignore if user doesn't exist
        }

        // Register user
        await request(app).post('/api/auth/register').send({
            email: testEmail,
            password: 'password123'
        });

        // Login to get token
        const loginRes = await request(app).post('/api/auth/login').send({
            email: testEmail,
            password: 'password123'
        });
        token = loginRes.body.token;
    });

    afterAll(async () => {
        // Cleanup
        try {
            const user = await prisma.user.findUnique({ where: { email: testEmail } });
            if (user) {
                await prisma.user.delete({ where: { id: user.id } });
            }
        } catch (e) {
            console.error('Cleanup failed', e);
        }
        await prisma.$disconnect();
    });

    it('should create an album', async () => {
        const res = await request(app)
            .post('/api/albums')
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'Magic Album' });

        expect(res.status).toBe(201);
        albumId = res.body.id;
    });

    it('should generate a magic link', async () => {
        const res = await request(app)
            .post(`/api/albums/${albumId}/magic-link`)
            .set('Authorization', `Bearer ${token}`)
            .send({ expiresInDays: 1 });

        if (res.status !== 200) {
            console.log('Generate Link Failed Status:', res.status);
            console.log('Generate Link Failed Body:', JSON.stringify(res.body, null, 2));
        }
        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(res.body.magicLink).toBeDefined();
        magicLinkToken = res.body.token;
    });

    it('should access album via magic link (public)', async () => {
        const res = await request(app)
            .get(`/api/albums/magic/${magicLinkToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.title).toBe('Magic Album');
        expect(res.body.data.isOwner).toBe(false);
    });

    it('should revoke magic link', async () => {
        const res = await request(app)
            .delete(`/api/albums/${albumId}/magic-link`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
    });

    it('should fail to access revoked magic link', async () => {
        const res = await request(app)
            .get(`/api/albums/magic/${magicLinkToken}`);

        expect(res.status).toBe(404);
    });
});

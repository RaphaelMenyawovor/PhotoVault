
import request from 'supertest';
import app from '../app.js';
import prisma from '../configs/prisma.js';
import http from 'http';
import type { AddressInfo } from 'net';

describe('Bulk Download (.zip)', () => {
    let token: string;
    let albumId: string;
    // let photoId: string; // Unused variable
    const testEmail = `test_dl_${Date.now()}_${Math.random()}@example.com`;
    let server: http.Server;
    let imageUrl: string;

    beforeAll(async () => {
        // Start local server to serve image
        server = http.createServer((_req, res) => {
            res.writeHead(200, { 'Content-Type': 'image/jpeg' });
            res.end(Buffer.alloc(100)); // Fake image data
        });

        await new Promise<void>((resolve) => {
            server.listen(0, '127.0.0.1', () => {
                const port = (server.address() as AddressInfo).port;
                imageUrl = `http://127.0.0.1:${port}/image.jpg`;
                resolve();
            });
        });

        // Cleanup
        try {
            const user = await prisma.user.findUnique({ where: { email: testEmail } });
            if (user) await prisma.user.delete({ where: { id: user.id } });
        } catch (_e) { }

        // Register
        await request(app).post('/api/auth/register').send({
            email: testEmail,
            password: 'password123'
        });

        // Login
        const loginRes = await request(app).post('/api/auth/login').send({
            email: testEmail,
            password: 'password123'
        });
        const cookies = loginRes.headers['set-cookie'] as string[] | string | undefined;
        let tokenCookie: string | undefined;
        if (Array.isArray(cookies)) {
            tokenCookie = cookies?.find((c: string) => c.startsWith('token='));
        } else if (typeof cookies === 'string' && cookies.startsWith('token=')) {
            tokenCookie = cookies;
        }
        if (!tokenCookie) throw new Error('Token cookie not found');
        const firstPart = tokenCookie.split(';')[0];
        const tokenParts = firstPart ? firstPart.split('=') : [];
        if (tokenParts.length < 2 || !tokenParts[1]) throw new Error('Token format invalid');
        token = tokenParts[1];

        // Create Album
        const albumRes = await request(app)
            .post('/api/albums')
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'Download Test Album' });
        albumId = albumRes.body.id;

        // Fetch User ID
        const user = await prisma.user.findUnique({ where: { email: testEmail } });
        await prisma.photo.create({
            data: {
                title: 'DL Photo',
                url: imageUrl,
                publicId: `dl_test_${Date.now()}`,
                visibility: 'PRIVATE',
                userId: user!.id,
                albumId: albumId
            }
        });
    }, 60000);

    afterAll(async () => {
        if (server) server.close();
        try {
            const user = await prisma.user.findUnique({ where: { email: testEmail } });
            if (user) await prisma.user.delete({ where: { id: user.id } });
        } catch (e) { console.error(e); }
        await prisma.$disconnect();
    });

    it('should download album as zip', async () => {
        const res = await request(app)
            .get(`/api/albums/${albumId}/download`)
            .set('Authorization', `Bearer ${token}`)
            .buffer(true)
            .parse((res, callback) => {
                res.setEncoding('binary');
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => { callback(null, Buffer.from(data, 'binary')); });
            });

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('application/zip');
        expect(res.body.length).toBeGreaterThan(100);
    }, 60000);

    it('should return 403 for non-owner/non-shared', async () => {
        // Create another user
        const otherEmail = `other_${Date.now()}_${Math.random()}@example.com`;
        await request(app).post('/api/auth/register').send({ email: otherEmail, password: 'password123' });
        const loginRes = await request(app).post('/api/auth/login').send({ email: otherEmail, password: 'password123' });
        const cookies = loginRes.headers['set-cookie'] as string[] | string | undefined;
        let tokenCookie: string | undefined;
        if (Array.isArray(cookies)) {
            tokenCookie = cookies?.find((c: string) => c.startsWith('token='));
        } else if (typeof cookies === 'string' && cookies.startsWith('token=')) {
            tokenCookie = cookies;
        }
        if (!tokenCookie) throw new Error('Token cookie not found');
        const firstPart = tokenCookie.split(';')[0];
        const tokenParts = firstPart ? firstPart.split('=') : [];
        if (tokenParts.length < 2 || !tokenParts[1]) throw new Error('Token format invalid');
        const otherToken = tokenParts[1];

        const res = await request(app)
            .get(`/api/albums/${albumId}/download`)
            .set('Authorization', `Bearer ${otherToken}`);

        expect(res.status).toBe(403);

        // Cleanup other user
        const otherUser = await prisma.user.findUnique({ where: { email: otherEmail } });
        if (otherUser) await prisma.user.delete({ where: { id: otherUser.id } });
    });

    it('should return 404 for empty album', async () => {
        // Create Empty Album
        const albumRes = await request(app)
            .post('/api/albums')
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'Empty Download Album' });
        const emptyAlbumId = albumRes.body.id;

        const res = await request(app)
            .get(`/api/albums/${emptyAlbumId}/download`)
            .set('Authorization', `Bearer ${token}`);

        // Expect 404 (No photos to download)
        expect(res.status).toBe(404);
        expect(res.body.error).toContain('No photos');
    });
});

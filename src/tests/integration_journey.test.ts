import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../app.js';
import prisma from '../configs/prisma.js';
import http from 'http';
import type { AddressInfo } from 'net';

describe('User Journey Integration', () => {
    let token: string;
    let userId: string;
    let albumId: string;
    let photoId: string;
    const testEmail = `journey_${Date.now()}_${Math.random()}@example.com`;
    let server: http.Server;
    let imageUrl: string;

    beforeAll(async () => {
        // Start local server to serve image for upload simulation
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

        // Cleanup potentially stale data
        try {
            await prisma.user.deleteMany({ where: { email: testEmail } });
        } catch (_) { }
    });

    afterAll(async () => {
        if (server) server.close();
        try {
            // Full cleanup
            if (userId) {
                await prisma.photo.deleteMany({ where: { userId } }); // Hard delete for test cleanup
                await prisma.album.deleteMany({ where: { userId } });
                await prisma.user.delete({ where: { id: userId } });
            }
        } catch (_) { }
        await prisma.$disconnect();
    });

    it('1. Should register a new user', async () => {
        const res = await request(app).post('/api/auth/register').send({
            email: testEmail,
            password: 'Password123!'
        });
        expect(res.status).toBe(201);
        expect(res.body.user).toBeDefined();
        expect(res.body.user.email).toBe(testEmail);
    });

    it('2. Should login', async () => {
        const res = await request(app).post('/api/auth/login').send({
            email: testEmail,
            password: 'Password123!'
        });
        expect(res.status).toBe(200);
        const cookies = res.headers['set-cookie'] as string[] | string | undefined;
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
        token = tokenParts[1];

        // Get ID
        const user = await prisma.user.findUnique({ where: { email: testEmail } });
        userId = user!.id;
    });

    it('3. Should create an album', async () => {
        const res = await request(app)
            .post('/api/albums')
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'Journey Album' });

        expect(res.status).toBe(201);
        expect(res.body.id).toBeDefined();
        albumId = res.body.id;
    });

    it('4. Should upload a photo to the album', async () => {
        // We mock the photo upload mostly by creating DB entry directly to avoid mocking Multer/Cloudinary in integration test
        // real upload test is in photo.test.ts. simulating the effect here for flow.

        const photo = await prisma.photo.create({
            data: {
                title: 'Journey Photo',
                url: imageUrl,
                publicId: `journey_${Date.now()}`,
                userId: userId,
                albumId: albumId,
                visibility: 'PRIVATE'
            }
        });
        photoId = photo.id;
        expect(photoId).toBeDefined();
    });

    it('5. Should download the album', async () => {
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
    });

    it('6. Should soft delete the photo', async () => {
        const res = await request(app)
            .delete(`/api/photos/${photoId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);

        const check = await prisma.photo.findUnique({ where: { id: photoId } });
        expect(check?.deletedAt).not.toBeNull();
    });

    it('7. Should soft delete the album', async () => {
        const res = await request(app)
            .delete(`/api/albums/${albumId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);

        const check = await prisma.album.findUnique({ where: { id: albumId } });
        expect(check?.deletedAt).not.toBeNull();
    });
});

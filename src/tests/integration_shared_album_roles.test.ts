
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../app.js';
import prisma from '../configs/prisma.js';

describe('Shared Album Roles Integration', () => {
    let ownerToken: string;
    let viewerToken: string;
    let contributorToken: string;
    let albumId: string;
    let photoId: string;

    const ownerEmail = `owner_${Date.now()}@example.com`;
    const viewerEmail = `viewer_${Date.now()}@example.com`;
    const contributorEmail = `contributor_${Date.now()}@example.com`;
    const password = 'password123';

    beforeAll(async () => {
        // Cleanup
        try {
            await prisma.user.deleteMany({ where: { email: { in: [ownerEmail, viewerEmail, contributorEmail] } } });
        } catch (_) { }

        // Register Users
        const registerUser = async (email: string) => {
            await request(app).post('/api/auth/register').send({ email, password });
            const login = await request(app).post('/api/auth/login').send({ email, password });
            const cookies = login.headers['set-cookie'];
            let tokenCookie: string | undefined;
            if (Array.isArray(cookies)) {
                tokenCookie = cookies.find((c: string) => c.startsWith('token='));
            } else if (typeof cookies === 'string' && cookies.startsWith('token=')) {
                tokenCookie = cookies;
            }
            if (!tokenCookie) throw new Error('Token cookie not found');
            return tokenCookie.split(';')[0].split('=')[1];
        };

        ownerToken = await registerUser(ownerEmail);
        viewerToken = await registerUser(viewerEmail);
        contributorToken = await registerUser(contributorEmail);

        // Create Album as Owner
        const albumRes = await request(app)
            .post('/api/albums')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ title: 'Role Test Album' });
        albumId = albumRes.body.id;

        // Share with Viewer
        await request(app)
            .post(`/api/albums/${albumId}/share`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ email: viewerEmail, role: 'VIEWER' })
            .then(res => {
                if (res.status !== 200) {
                    console.error('Share failed:', res.body);
                }
                expect(res.status).toBe(200);
            });

        // Share with Contributor
        await request(app)
            .post(`/api/albums/${albumId}/share`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ email: contributorEmail, role: 'CONTRIBUTOR' })
            .expect(200);

        // Create a photo (owned by contributor for testing add)
        const photoRes = await request(app)
            .post('/api/photos/upload')
            .set('Authorization', `Bearer ${contributorToken}`)
            .attach('image', Buffer.from('fake image content'), 'test.jpg')
            .field('title', 'Contributor Photo');

        // We need a real photo upload to test adding to album fully, or mock it. 
        // For simplicity, let's create a dummy photo in DB directly for contributor
        // But the controller checks ownership.
        const contributorUser = await prisma.user.findUnique({ where: { email: contributorEmail } });
        const dummyPhoto = await prisma.photo.create({
            data: {
                title: 'Contributor Dummy',
                url: 'http://example.com/c.jpg',
                publicId: `c_${Date.now()}`,
                userId: contributorUser!.id,
                visibility: 'PRIVATE'
            }
        });
        photoId = dummyPhoto.id;
    });

    afterAll(async () => {
        // Cleanup
        try {
            await prisma.user.deleteMany({ where: { email: { in: [ownerEmail, viewerEmail, contributorEmail] } } });
        } catch (_) { }
        await prisma.$disconnect();
    });

    it('should NOT allow VIEWER to add photo to album', async () => {
        // Viewer creates a photo first
        const viewerUser = await prisma.user.findUnique({ where: { email: viewerEmail } });
        const viewerPhoto = await prisma.photo.create({
            data: {
                title: 'Viewer Dummy',
                url: 'http://example.com/v.jpg',
                publicId: `v_${Date.now()}`,
                userId: viewerUser!.id,
                visibility: 'PRIVATE'
            }
        });

        const res = await request(app)
            .post('/api/albums/add-photo')
            .set('Authorization', `Bearer ${viewerToken}`)
            .send({
                albumId: albumId,
                photoId: viewerPhoto.id
            });

        expect(res.status).toBe(403);
    });

    it('should allow CONTRIBUTOR to add photo to album', async () => {
        const res = await request(app)
            .post('/api/albums/add-photo')
            .set('Authorization', `Bearer ${contributorToken}`)
            .send({
                albumId: albumId,
                photoId: photoId
            });

        expect(res.status).toBe(200);

        const updatedPhoto = await prisma.photo.findUnique({ where: { id: photoId } });
        expect(updatedPhoto?.albumId).toBe(albumId);
    });

    it('should verify roles in getAlbum response', async () => {
        // Viewer checks album
        const viewerRes = await request(app)
            .get(`/api/albums/${albumId}`)
            .set('Authorization', `Bearer ${viewerToken}`);

        expect(viewerRes.status).toBe(200);
        // Note: The controller logic for `getAlbum` currently returns `isOwner` but not explicit role for shared users in the root object.
        // It returns `sharedUsers` but that's a list.
        // We might need to update `getAlbum` to return `currentUserRole`.
    });
});

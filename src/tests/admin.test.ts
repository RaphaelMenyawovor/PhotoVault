import request from 'supertest';
import app from '../app.js';
import prisma from '../configs/prisma.js';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import jwt from 'jsonwebtoken';

describe('Admin User Management', () => {
    let adminToken: string;
    let userToken: string;
    let adminId: string;
    let userId: string;

    beforeAll(async () => {
        // Cleanup
        await prisma.auditLog.deleteMany();
        await prisma.photo.deleteMany();
        await prisma.album.deleteMany();
        await prisma.user.deleteMany();

        // Create Admin
        const admin = await prisma.user.create({
            data: {
                email: 'admin@example.com',
                password: 'hashedpassword',
                role: 'ADMIN',
            }
        });
        adminId = admin.id;
        adminToken = jwt.sign({ userId: admin.id, role: 'ADMIN' }, process.env.JWT_SECRET as string);

        // Create Regular User
        const user = await prisma.user.create({
            data: {
                email: 'user@example.com',
                password: 'hashedpassword', // In real logic we use auth endpoint, here we strictly test admin logic so irrelevant unless testing login
                role: 'USER',
            }
        });
        userId = user.id;
        userToken = jwt.sign({ userId: user.id, role: 'USER' }, process.env.JWT_SECRET as string);
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    describe('GET /api/admin/users', () => {
        it('should list users for admin', async () => {
            const res = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.length).toBeGreaterThanOrEqual(2);
            expect(res.body.meta).toBeDefined();
        });

        it('should deny access to non-admin', async () => {
            const res = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(403);
        });
    });

    describe('PATCH /api/admin/users/:id/role', () => {
        it('should allow admin to ban a user', async () => {
            const res = await request(app)
                .patch(`/api/admin/users/${userId}/role`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: 'BANNED' });

            expect(res.status).toBe(200);
            expect(res.body.user.role).toBe('BANNED');

            // Verify DB
            const updatedUser = await prisma.user.findUnique({ where: { id: userId } });
            expect(updatedUser?.role).toBe('BANNED');
        });

        it('should deny role update to non-admin', async () => {
            const res = await request(app)
                .patch(`/api/admin/users/${userId}/role`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ role: 'ADMIN' });

            expect(res.status).toBe(403);
        });
    });
});

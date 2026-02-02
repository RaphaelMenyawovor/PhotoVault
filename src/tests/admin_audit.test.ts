import request from 'supertest';
import app from '../app.js';
import prisma from '../configs/prisma.js';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import jwt from 'jsonwebtoken';

describe('Advanced Admin Features', () => {
    let adminToken: string;
    let userId: string;

    beforeAll(async () => {
        await prisma.auditLog.deleteMany();
        await prisma.photo.deleteMany();
        await prisma.user.deleteMany();

        const admin = await prisma.user.create({
            data: { email: 'admin_adv@example.com', password: 'hashedpassword', role: 'ADMIN' }
        });
        adminToken = jwt.sign({ userId: admin.id, role: 'ADMIN' }, process.env.JWT_SECRET as string);

        const user = await prisma.user.create({
            data: { email: 'user_adv@example.com', password: 'hashedpassword', role: 'USER' }
        });
        userId = user.id;

        // Create some photos for stats
        await prisma.photo.create({
            data: {
                title: 'Stat Photo 1', url: 'http://foo.com/1.jpg', publicId: 'stat_1',
                userId: userId
            }
        });
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    it('should log audit event when role is updated', async () => {
        const res = await request(app)
            .patch(`/api/admin/users/${userId}/role`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ role: 'BANNED' });

        expect(res.status).toBe(200);

        // Verify Audit Log Created
        const logs = await prisma.auditLog.findMany();
        expect(logs.length).toBe(1);
        const log = logs[0];
        expect(log).toBeDefined();
        if (!log) return;

        expect(log.action).toBe('ROLE_UPDATE');
        expect(log.adminId).toBeDefined();
        // Check details safely (it's Json)
        const details: any = log.details;
        expect(details.targetUserId).toBe(userId);
        expect(details.newValue).toBe('BANNED');
    });

    it('should retrieve audit logs', async () => {
        const res = await request(app)
            .get('/api/admin/audit-logs')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data[0].action).toBe('ROLE_UPDATE');
    });

    it('should include user stats in getUsers', async () => {
        const res = await request(app)
            .get('/api/admin/users')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        const user = res.body.data.find((u: any) => u.email === 'user_adv@example.com');
        expect(user).toBeDefined();
        expect(user._count).toBeDefined();
        expect(user._count.photos).toBe(1);
    });
});

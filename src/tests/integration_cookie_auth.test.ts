import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/configs/prisma.js';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

describe('Cookie-based Authentication', () => {
    const testEmail = `cookie_user_${Date.now()}@example.com`;
    const testPassword = 'Password123!';
    let cookie: string;

    beforeAll(async () => {
        // Cleanup
        await prisma.user.deleteMany({ where: { email: testEmail } });

        // Register User
        const res = await request(app)
            .post('/api/auth/register')
            .set('Content-Type', 'application/json; charset=utf-8')
            .send({ email: testEmail, password: testPassword });

        // Extract cookie
        const cookies = res.headers['set-cookie'] as unknown as string[];
        expect(cookies).toBeDefined();
        const fullCookie = cookies.find((c: string) => c.startsWith('token='));
        expect(fullCookie).toBeDefined();
        if (!fullCookie) throw new Error('Cookie not found');
        cookie = fullCookie.split(';')[0]!; // Extract only name=value
    });

    afterAll(async () => {
        await prisma.user.deleteMany({ where: { email: testEmail } });
        await prisma.$disconnect();
    });

    it('should access protected route with cookie', async () => {
        const res = await request(app)
            .get('/api/user/me')
            .set('Cookie', [cookie]);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('email', testEmail);
    });

    it('should fail to access protected route without cookie or header', async () => {
        const res = await request(app)
            .get('/api/user/me');

        expect(res.status).toBe(401);
    });

    it('should logout and clear cookie', async () => {
        const res = await request(app)
            .post('/api/auth/logout')
            .set('Cookie', [cookie]);

        expect(res.status).toBe(200);
        const cookies = res.headers['set-cookie'] as unknown as string[];
        const apiCookie = cookies.find((c: string) => c.startsWith('token='));
        // Check for expiration (past date) or empty value
        expect(apiCookie).toMatch(/Expires=Thu, 01 Jan 1970/);
    });
});

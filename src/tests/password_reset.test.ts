import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { emailService } from '../services/email.service.js';

// Mock auth limiter to bypass 429
jest.mock('../middleware/limiter.middleware.js', () => ({
    authLimiter: (_req: any, _res: any, next: any) => next(),
    limiter: (_req: any, _res: any, next: any) => next(),
}));

// We need to import app AFTER mocking the middleware if possible, 
// but in ESM modules constitute a graph. 
// However, since we mock the module using unstable_mockModule or just jest.mock (if hoisted properly via babel-jest/ts-jest), it might work.
// With 'experimental-vm-modules', jest.mock is hoisted.
import app from '../app.js';
import prisma from '../configs/prisma.js';

describe('Password Reset Flow', () => {
    const testEmail = 'reset_test@example.com';
    let userId: string;
    let sendEmailSpy: any;

    beforeAll(async () => {
        // Spy on the real service instance
        // This works because emailService is a singleton exported object
        sendEmailSpy = jest.spyOn(emailService, 'sendPasswordResetEmail')
            .mockImplementation(async () => true);

        // Create user
        const user = await prisma.user.create({
            data: {
                email: testEmail,
                password: '$2b$10$EpIxNwllbX1.f/A.w/Z/..', // Hash for something
                role: 'USER',
            },
        });
        userId = user.id;
    });

    afterAll(async () => {
        if (sendEmailSpy) sendEmailSpy.mockRestore(); // Restore original method
        await prisma.user.deleteMany({ where: { email: testEmail } });
        await prisma.$disconnect();
    });

    it('should send a reset email if user exists', async () => {
        const res = await request(app)
            .post('/api/auth/forgot-password')
            .send({ email: testEmail });

        expect(res.status).toBe(200);
        expect(res.body.message).toContain('link has been sent');
        expect(sendEmailSpy).toHaveBeenCalled();

        // Verify token in DB (hashed)
        const user = await prisma.user.findUnique({ where: { id: userId } });
        expect(user?.resetToken).toBeDefined();
        // The token is hashed, so it shouldn't look like raw randomBytes (hex) but it's hex too.
        // SHA256 hex is 64 chars.
        expect(user?.resetToken?.length).toBe(64);
    });

    it('should reset password with valid token', async () => {
        // Get the token captured by the mock
        const sendCalls = sendEmailSpy.mock.calls;
        const lastCall = sendCalls[sendCalls.length - 1];
        if (!lastCall) throw new Error('Email not sent');
        const token = lastCall[1]; // sendPasswordResetEmail(email, token)

        const res = await request(app)
            .post('/api/auth/reset-password')
            .send({ token, newPassword: 'NewPassword123!' });

        expect(res.status).toBe(200);
        expect(res.body.message).toContain('reset successfully');

        // Verify token cleared
        const userAfter = await prisma.user.findUnique({ where: { id: userId } });
        expect(userAfter?.resetToken).toBeNull();
    });
});

import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../configs/prisma.js';
import { wideLogger } from '../utils/wideLogger.js';
import crypto from 'crypto';
import { emailService } from '../services/email.service.js';

export const register = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { email, password } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                role: 'USER',
            },
        });

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET as string,
            { expiresIn: '1h' }
        );

        wideLogger.addCtx('user_id', user.id);
        wideLogger.addCtx('action', 'user_register');
        return res.status(201).json({ message: 'User created', token, user: { id: user.id, email: user.email, role: user.role } });
    } catch (error) {
        wideLogger.add('err', { msg: 'Registration failed', stack: (error as Error).stack });
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const login = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        if (user.role === 'BANNED') {
            return res.status(403).json({ error: 'Account banned. Contact support.' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET as string,
            { expiresIn: '1h' }
        );

        wideLogger.addCtx('user_id', user.id);
        wideLogger.addCtx('action', 'user_login');
        return res.json({ message: 'Login successful', token, user: { id: user.id, email: user.email, role: user.role } });
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const forgotPassword = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { email } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.json({ message: 'If that email exists, a password reset link has been sent.' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

        await prisma.user.update({
            where: { id: user.id },
            data: { resetToken: hashedToken, resetTokenExpiry },
        });

        const sent = await emailService.sendPasswordResetEmail(email, resetToken);

        if (!sent) {
            return res.status(500).json({ error: 'Failed to send email' });
        }

        wideLogger.addCtx('action', 'forgot_password_request');
        return res.json({ message: 'If that email exists, a password reset link has been sent.' });
    } catch (error) {
        wideLogger.add('err', { msg: 'Forgot password error', error: (error as Error).message });
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const resetPassword = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await prisma.user.findFirst({
            where: {
                resetToken: hashedToken,
                resetTokenExpiry: { gt: new Date() },
            },
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null,
            },
        });

        wideLogger.addCtx('user_id', user.id);
        wideLogger.addCtx('action', 'password_reset_success');
        return res.json({ message: 'Password has been reset successfully' });
    } catch (error) {
        wideLogger.add('err', { msg: 'Reset password error', error: (error as Error).message });
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const googleCallback = async (req: Request, res: Response): Promise<void | Response> => {
    try {
        // User is attached to req.user by passport
        const user = req.user as any;

        if (!user) {
            return res.status(401).json({ error: 'Authentication failed' });
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET as string,
            { expiresIn: '1d' }
        );

        // Redirect to Frontend/Mobile App with token
        // If FRONTEND_URL is "photovault://app", result is "photovault://app?token=xyz"
        // If FRONTEND_URL is "https://website.com", result is "https://website.com?token=xyz"
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        // Append token safely
        const redirectUrl = new URL(frontendUrl);
        redirectUrl.searchParams.set('token', token);
        // Optionally pass user info if needed, but token usually has it
        // redirectUrl.searchParams.set('role', user.role);

        wideLogger.addCtx('auth_action', 'google_callback_redirect');
        return res.redirect(redirectUrl.toString());

    } catch (error) {
        wideLogger.add('err', { msg: 'Google Callback Error', error: (error as Error).message });
        // Redirect to frontend login with error
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}?error=auth_failed`);
    }
};

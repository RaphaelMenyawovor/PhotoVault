import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../configs/prisma.js';
import { wideLogger } from '../utils/wideLogger.js';

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

        return res.json({ message: 'Login successful', token, user: { id: user.id, email: user.email, role: user.role } });
    } catch (error) {
        wideLogger.add('err', { msg: 'Login failed', stack: (error as Error).stack });
        return res.status(500).json({ error: 'Internal server error' });
    }
};

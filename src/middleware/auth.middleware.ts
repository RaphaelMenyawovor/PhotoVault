import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { wideLogger } from '../utils/wideLogger.js';

export interface AuthRequest extends Request {
    // User is now defined globally in Express.User
}

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];

    if (!token && req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        wideLogger.add('err', { msg: 'No token provided' });
        return res.status(401).json({ error: 'Access denied.' });
    }

    try {
        if (!(process.env.JWT_SECRET)) {
            wideLogger.add('err', { msg: 'JWT_SECRET is not defined in environment variables' });
            return res.status(500).json({ error: 'Internal server error' });
        }
        const verified = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string; role: string };
        req.user = {
            id: verified.userId,
            role: verified.role
        };

        // Add user context to Wide Log
        wideLogger.add('user', { id: req.user.id, role: req.user.role });

        next();
    } catch (error) {
        const errorMessage = (error as Error).message;
        wideLogger.add('err', { msg: 'Token verification failed', code: 'INVALID_TOKEN', stack: errorMessage });
        return res.status(400).json({ message: 'Invalid token', error });
    }
};

export const authorizeRoles = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            wideLogger.add('err', { msg: 'Forbidden access attempt', required_roles: roles, user_role: req.user?.role });
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    };
};

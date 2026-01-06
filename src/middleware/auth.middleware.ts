import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        role: string;
    };
}

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction)=> {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        logger.error('No token provided');
        return res.status(401).json({ error: 'Access denied.' });
    }

    try {
        if (!(process.env.JWT_SECRET)) {
            logger.error('JWT_SECRET is not defined in environment variables');
            return res.status(500).json({ error: 'Internal server error' });
        }
        const verified = jwt.verify(token, process.env.JWT_SECRET as string);
        req.user = verified as { userId: string; role: string };
        next();
    } catch (error) {
        const errorMessage = (error as Error).message;
        logger.error('Token verification failed:', errorMessage);
        return res.status(400).json({ message: 'Invalid token', error });
    }
};

export const authorizeRoles = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    };
};

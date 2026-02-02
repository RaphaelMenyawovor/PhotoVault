import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.middleware.js';

export const verifyAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }
    next();
};

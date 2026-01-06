import type { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error(err.stack);
    res.status(500).json({ error: 'Something broke!', message: err.message });
};

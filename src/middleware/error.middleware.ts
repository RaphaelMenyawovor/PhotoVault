
import type { Request, Response, NextFunction } from 'express';
import { wideLogger } from '../utils/wideLogger.js';

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
    wideLogger.add('err', {
        msg: err.message,
        stack: err.stack,
        code: (err as unknown as { code?: string }).code || 'INTERNAL_ERROR'
    });

    const response = {
        error: 'Internal Server Error',
        ...(process.env.NODE_ENV !== 'production' && { message: err.message, stack: err.stack }),
    };

    res.status(500).json(response);
};

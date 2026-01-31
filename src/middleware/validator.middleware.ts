import type { Request, Response, NextFunction } from 'express';
import { z, type ZodType } from 'zod';

export const validate = (schema: ZodType) => async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = req.method === 'GET' ? req.query : req.body;
        await schema.parseAsync(data);
        return next();
    } catch (error) {
        return res.status(400).json({ error: z.treeifyError(error as unknown as z.ZodError) });
    }
};

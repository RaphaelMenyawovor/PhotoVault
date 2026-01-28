import { z } from 'zod';

export const searchQuerySchema = z.object({
    page: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
    limit: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
    search: z.string().optional(),
});

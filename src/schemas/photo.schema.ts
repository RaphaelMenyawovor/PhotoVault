import { z } from 'zod';

export const photoSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
    albumId: z.string().optional(),
});



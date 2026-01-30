import { z } from 'zod';

export const albumSchema = z.object({
    title: z.string().min(1),
});

export const addPhotoToAlbumSchema = z.object({
    albumId: z.string().min(1),
    photoId: z.string().min(1),
});

export const shareAlbumSchema = z.object({
    body: z.object({
        email: z.string().email(),
        role: z.enum(['VIEWER', 'EDITOR']).optional(),
    }),
});

export const albumPrivacySchema = z.object({
    body: z.object({
        password: z.string().min(6).optional().nullable(),
    }),
});

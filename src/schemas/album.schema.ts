import { z } from 'zod';

export const albumSchema = z.object({
    title: z.string().min(1),
});

export const addPhotoToAlbumSchema = z.object({
    albumId: z.string().min(1),
    photoId: z.string().min(1),
});

export const shareAlbumSchema = z.object({
    email: z.string().email(),
    role: z.enum(['VIEWER', 'CONTRIBUTOR']).optional(),
});

export const albumPrivacySchema = z.object({
    password: z.string().min(6).optional().nullable(),
});

export const generateMagicLinkSchema = z.object({
    expiresInDays: z.number().int().min(1).max(365).optional(), // Default 7 days
});

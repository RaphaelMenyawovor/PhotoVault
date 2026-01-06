import { z } from 'zod';

export const albumSchema = z.object({
    title: z.string().min(1),
});

export const addPhotoToAlbumSchema = z.object({
    albumId: z.string().min(1),
    photoId: z.string().min(1),
});

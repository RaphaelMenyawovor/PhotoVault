import type { Response } from 'express';
import prisma  from '../configs/prisma.js';
import type { AuthRequest } from '../middleware/auth.middleware.js';
import logger from '../utils/logger.js';

export const createAlbum = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { title } = req.body;

        const album = await prisma.album.create({
            data: {
                title,
                userId: req.user!.userId,
            },
        });

        return res.status(201).json(album);
    } catch (error) {
        logger.error(error);
        return res.status(500).json({ error: 'Failed to create album' });
    }
};

export const getMyAlbums = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const albums = await prisma.album.findMany({
            where: { userId: req.user!.userId },
            include: { photos: true },
            orderBy: { createdAt: 'desc' },
        });
        return res.json(albums);
    } catch (error) {
        logger.error(error);
        return res.status(500).json({ error: 'Failed to fetch albums' });
    }
};

export const addPhotoToAlbum = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { albumId, photoId } = req.body;

        const album = await prisma.album.findUnique({ where: { id: albumId } });
        const photo = await prisma.photo.findUnique({ where: { id: photoId } });

        if (!album || !photo) {
            return res.status(404).json({ error: 'Album or Photo not found' });
        }

        if (album.userId !== req.user!.userId || photo.userId !== req.user!.userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const updatedPhoto = await prisma.photo.update({
            where: { id: photoId },
            data: { albumId },
        });

        return res.json(updatedPhoto);
    } catch (error) {
        logger.error(error);
        return res.status(500).json({ error: 'Failed to add photo to album' });
    }
};

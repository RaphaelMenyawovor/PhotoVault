import type { Request, Response } from 'express';
import prisma from '../configs/prisma.js';
import type { AuthRequest } from '../middleware/auth.middleware.js';
import redisClient from '../configs/redis.js';
import cloudinary from '../configs/cloudinary.js';
import type { UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import logger from '../utils/logger.js';

export const uploadPhoto = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { title, description, visibility, albumId } = req.body;

        const uploadStream = (buffer: Buffer): Promise<UploadApiResponse> => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: 'photovault' },
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result as UploadApiResponse);
                    }
                );
                Readable.from(buffer).pipe(stream);
            });
        };

        const result = await uploadStream(req.file.buffer);

        const photo = await prisma.photo.create({
            data: {
                title,
                description,
                url: result.secure_url,
                publicId: result.public_id,
                visibility: visibility || 'PUBLIC',
                userId: req.user!.userId,
                albumId: albumId || null,
            },
        });

        if (photo.visibility === 'PUBLIC') {
            await redisClient.del('public_photos');
        }

        return res.status(201).json(photo);
    } catch (error) {
        logger.error(error);
        return res.status(500).json({ error: 'Upload failed' });
    }
};

export const getPublicPhotos = async (_req: Request, res: Response): Promise<Response> => {
    try {
        const cached = await redisClient.get('public_photos');
        if (cached) {
            return res.json(JSON.parse(cached));
        }

        const photos = await prisma.photo.findMany({
            where: { visibility: 'PUBLIC' },
            include: { user: { select: { id: true, email: true } } },
            orderBy: { createdAt: 'desc' },
        });

        await redisClient.setEx('public_photos', 3600, JSON.stringify(photos));

        return res.json(photos);
    } catch (error) {
        logger.error(error);
        return res.status(500).json({ error: 'Failed to fetch photos' });
    }
};

export const getMyPhotos = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const photos = await prisma.photo.findMany({
            where: { userId: req.user!.userId },
            orderBy: { createdAt: 'desc' },
        });
        return res.json(photos);
    } catch (error) {
        logger.error(error);
        return res.status(500).json({ error: 'Failed to fetch photos' });
    }
};

export const deletePhoto = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: 'Photo ID is required' });
        }

        const photo = await prisma.photo.findUnique({ where: { id: id as string } });

        if (!photo) {
            return res.status(404).json({ error: 'Photo not found' });
        }

        if (photo.userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        await cloudinary.uploader.destroy(photo.publicId);
        await prisma.photo.delete({ where: { id: id as string } });

        if (photo.visibility === 'PUBLIC') {
            await redisClient.del('public_photos');
        }

        return res.json({ message: 'Photo deleted' });
    } catch (error) {
        logger.error(error);
        return res.status(500).json({ error: 'Delete failed' });
    }
};

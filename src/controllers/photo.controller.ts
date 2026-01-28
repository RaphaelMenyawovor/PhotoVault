import type { Request, Response } from 'express';
import { Prisma } from '../generated/prisma/client.js';
import prisma from '../configs/prisma.js';
import type { AuthRequest } from '../middleware/auth.middleware.js';
import redisClient from '../configs/redis.js';
import cloudinary from '../configs/cloudinary.js';
import type { UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import { wideLogger } from '../utils/wideLogger.js';

import { getOptimizedUrls } from '../utils/image.utils.js';

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
            await redisClient.incr('public_photos_version');
        }

        return res.status(201).json({
            ...photo,
            urls: getOptimizedUrls(photo.publicId, photo.url)
        });
    } catch (error) {
        wideLogger.add('err', { msg: 'Upload failed', stack: (error as Error).stack });
        return res.status(500).json({ error: 'Upload failed' });
    }
};

export const getPublicPhotos = async (req: Request, res: Response): Promise<Response> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const search = req.query.search as string || '';
        const skip = (page - 1) * limit;

        const version = await redisClient.get('public_photos_version') || '1';
        const cacheKey = `public_photos:v${version}:p${page}:l${limit}:s${search}`;
        const cached = await redisClient.get(cacheKey);

        if (cached) {
            return res.json(JSON.parse(cached));
        }

        const whereClause: Prisma.PhotoWhereInput = { visibility: 'PUBLIC' };
        if (search) {
            whereClause.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [photos, total] = await Promise.all([
            prisma.photo.findMany({
                where: whereClause,
                include: { user: { select: { id: true, email: true } } },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.photo.count({ where: whereClause }),
        ]);

        const data = photos.map(photo => ({
            ...photo,
            urls: getOptimizedUrls(photo.publicId, photo.url)
        }));

        const response = {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };

        // Cache for 1 hour
        await redisClient.setEx(cacheKey, 3600, JSON.stringify(response));

        return res.json(response);
    } catch (error) {
        wideLogger.add('err', { msg: 'Failed to fetch public photos', stack: (error as Error).stack });
        return res.status(500).json({ error: 'Failed to fetch photos' });
    }
};

export const getMyPhotos = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const search = req.query.search as string || '';
        const skip = (page - 1) * limit;

        const whereClause: Prisma.PhotoWhereInput = { userId: req.user!.userId };
        if (search) {
            whereClause.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [photos, total] = await Promise.all([
            prisma.photo.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.photo.count({ where: whereClause }),
        ]);

        const data = photos.map(photo => ({
            ...photo,
            urls: getOptimizedUrls(photo.publicId, photo.url)
        }));

        return res.json({
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        wideLogger.add('err', { msg: 'Failed to fetch photos', stack: (error as Error).stack });
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
            await redisClient.incr('public_photos_version');
        }

        return res.json({ message: 'Photo deleted' });
    } catch (error) {
        wideLogger.add('err', { msg: 'Delete failed', stack: (error as Error).stack });
        return res.status(500).json({ error: 'Delete failed' });
    }
};

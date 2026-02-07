import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
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

        const { title, description, visibility, albumId, tags } = req.body;

        // Verify Album Permissions if albumId is provided
        if (albumId) {
            const album = await prisma.album.findUnique({
                where: { id: albumId },
                include: {
                    sharedWith: {
                        where: { userId: req.user!.id }
                    }
                }
            });

            if (!album) {
                return res.status(404).json({ error: 'Album not found' });
            }

            const isOwner = album.userId === req.user!.id;
            const isEditor = album.sharedWith[0]?.role === 'EDITOR';

            if (!isOwner && !isEditor) {
                return res.status(403).json({ error: 'You do not have permission to add photos to this album' });
            }
        }

        // Normalize manual tags
        let manualTags: string[] = [];
        if (typeof tags === 'string') {
            manualTags = tags.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0);
        } else if (Array.isArray(tags)) {
            manualTags = tags.filter((t: unknown) => typeof t === 'string' && t.length > 0) as string[];
        }

        const uploadStream = (buffer: Buffer): Promise<UploadApiResponse> => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'photovault',
                        categorization: 'aws_rek_tagging',
                        auto_tagging: 0.6
                    },
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result as UploadApiResponse);
                    }
                );
                Readable.from(buffer).pipe(stream);
            });
        };

        const result = await uploadStream(req.file.buffer);

        // Combine manual tags with Cloudinary AI tags (ensure uniqueness)
        const aiTags = result.tags || [];
        const finalTags = Array.from(new Set([...manualTags, ...aiTags]));

        const photo = await prisma.photo.create({
            data: {
                title,
                description,
                url: result.secure_url,
                publicId: result.public_id,
                visibility: visibility || 'PUBLIC',
                userId: req.user!.id,
                albumId: albumId || null,
                tags: finalTags,
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

        const whereClause: Prisma.PhotoWhereInput = { visibility: 'PUBLIC', deletedAt: null };
        if (search) {
            whereClause.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { tags: { has: search } },
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

        const whereClause: Prisma.PhotoWhereInput = { userId: req.user!.id, deletedAt: null };
        if (search) {
            whereClause.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { tags: { has: search } },
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

        const photo = await prisma.photo.findUnique({
            where: { id: id as string },
            include: { album: true }
        });

        if (!photo) {
            return res.status(404).json({ error: 'Photo not found' });
        }

        const isPhotoOwner = photo.userId === req.user!.id;
        const isAlbumOwner = photo.album?.userId === req.user!.id;
        const isAdmin = req.user!.role === 'ADMIN';

        if (!isPhotoOwner && !isAlbumOwner && !isAdmin) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Soft delete
        await prisma.photo.update({
            where: { id: id as string },
            data: { deletedAt: new Date() }
        });

        if (photo.visibility === 'PUBLIC' && redisClient.isOpen) {
            await redisClient.incr('public_photos_version');
        }

        wideLogger.addCtx('photo_id', id);
        wideLogger.addCtx('action', 'photo_soft_delete');

        return res.json({ message: 'Photo moved to trash' });
    } catch (error) {
        wideLogger.add('err', { msg: 'Delete failed', stack: (error as Error).stack });
        return res.status(500).json({ error: 'Delete failed' });
    }
};

export const getTrash = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const photos = await prisma.photo.findMany({
            where: {
                userId: req.user!.id,
                deletedAt: { not: null }
            },
            orderBy: { deletedAt: 'desc' }
        });

        const data = photos.map(photo => ({
            ...photo,
            urls: getOptimizedUrls(photo.publicId, photo.url)
        }));

        wideLogger.addCtx('count', photos.length);
        wideLogger.addCtx('action', 'photo_view_trash');

        return res.json({ data });
    } catch (error) {
        wideLogger.add('err', { msg: 'Failed to fetch trash', stack: (error as Error).stack });
        return res.status(500).json({ error: 'Failed to fetch trash' });
    }
};

export const restorePhoto = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { id } = req.params;

        const photo = await prisma.photo.findUnique({
            where: { id: id as string }
        });

        if (!photo) {
            return res.status(404).json({ error: 'Photo not found' });
        }

        if (photo.userId !== req.user!.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const restored = await prisma.photo.update({
            where: { id: id as string },
            data: { deletedAt: null }
        });

        if (restored.visibility === 'PUBLIC' && redisClient.isOpen) {
            await redisClient.incr('public_photos_version');
        }

        wideLogger.addCtx('photo_id', id);
        wideLogger.addCtx('action', 'photo_restore');

        return res.json({ message: 'Photo restored', data: restored });

    } catch (error) {
        wideLogger.add('err', { msg: 'Restore failed', stack: (error as Error).stack });
        return res.status(500).json({ error: 'Restore failed' });
    }
};

export const hardDeletePhoto = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { id } = req.params;

        const photo = await prisma.photo.findUnique({
            where: { id: id as string }
        });

        if (!photo) {
            return res.status(404).json({ error: 'Photo not found' });
        }

        if (photo.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        await cloudinary.uploader.destroy(photo.publicId);
        await prisma.photo.delete({ where: { id: id as string } });

        wideLogger.addCtx('photo_id', id);
        wideLogger.addCtx('action', 'photo_hard_delete');

        return res.json({ message: 'Photo permanently deleted' });

    } catch (error) {
        wideLogger.add('err', { msg: 'Hard delete failed', stack: (error as Error).stack });
        return res.status(500).json({ error: 'Hard delete failed' });
    }
};

import type { Response, Request } from 'express';
import crypto from 'crypto';
import { Prisma } from '../generated/prisma/client.js';
import prisma from '../configs/prisma.js';
import type { AuthRequest } from '../middleware/auth.middleware.js';
import { wideLogger } from '../utils/wideLogger.js';
import { getOptimizedUrls } from '../utils/image.utils.js';
import bcrypt from 'bcrypt';
import archiver from 'archiver';
import axios from 'axios';
import cloudinary from '../configs/cloudinary.js';

export const downloadAlbum = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const album = await prisma.album.findUnique({
            where: { id: id as string },
            include: {
                sharedWith: true
            }
        });

        if (!album || album.deletedAt) {
            res.status(404).json({ error: 'Album not found' });
            return;
        }

        // Access Control
        const isOwner = album.userId === req.user!.userId;
        const isShared = album.sharedWith.some(s => s.userId === req.user!.userId);

        if (!isOwner && !isShared) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        const photos = await prisma.photo.findMany({
            where: {
                albumId: album.id,
                deletedAt: null
            }
        });

        if (photos.length === 0) {
            res.status(404).json({ error: 'No photos to download' });
            return;
        }

        const archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });

        // Handle archive warnings/errors
        archive.on('warning', (err) => {
            if (err.code === 'ENOENT') {
                console.warn('Archiver warning:', err);
            } else {
                throw err;
            }
        });

        archive.on('error', (err) => {
            throw err;
        });

        // Set Headers
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${album.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.zip"`);

        // Pipe archive data to the response
        archive.pipe(res);

        // Append files
        let processed = 0;
        for (const photo of photos) {
            // Stop processing if client disconnected
            if (res.writableEnded || res.closed) {
                console.log('Client disconnected, stopping download');
                break;
            }

            try {
                const response = await axios({
                    url: photo.url,
                    method: 'GET',
                    responseType: 'stream'
                });

                // Try to infer extension from URL or Content-Type, default to .jpg
                let extension = '.jpg';
                if (photo.url.includes('.')) {
                    const urlExt = photo.url.split('.').pop();
                    if (urlExt && /^[a-z0-9]+$/i.test(urlExt) && urlExt.length < 5) {
                        extension = `.${urlExt}`;
                    }
                }

                archive.append(response.data, { name: `${photo.title?.replace(/[^a-z0-9]/gi, '_') || 'photo'}_${photo.id}${extension}` });
                processed++;
            } catch (err) {
                console.error(`Failed to download photo ${photo.id}`, err);
                // Continue with other photos
            }
        }

        await archive.finalize();

        wideLogger.addCtx('album_id', id);
        wideLogger.addCtx('photo_count', processed);
        wideLogger.addCtx('action', 'album_download_zip');

        // Response is already sent via pipe, so we don't return res.json()
    } catch (error) {
        wideLogger.add('err', { msg: 'Download album failed', stack: (error as Error).stack });
        if (!res.headersSent) {
            res.status(500).json({ error: 'Download album failed' });
        }
    }
};

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
        wideLogger.add('err', { msg: 'Failed to create album', stack: (error as Error).stack });
        return res.status(500).json({ error: 'Failed to create album' });
    }
};

export const getAlbum = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { id } = req.params;
        const passwordHeader = req.headers['x-album-password'] as string | undefined;

        const album = await prisma.album.findUnique({
            where: { id: id as string },
            include: {
                photos: true,
                sharedWith: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true
                            }
                        }
                    }
                }
            }
        });

        if (!album || album.deletedAt) {
            return res.status(404).json({ error: 'Album not found' });
        }

        // Access Control Logic
        const isOwner = album.userId === req.user!.userId;
        const isShared = album.sharedWith.some((share) => share.userId === req.user!.userId);

        if (!isOwner && !isShared) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Password Verification (if not owner, and password exists)
        if (!isOwner && album.password) {
            if (!passwordHeader) {
                return res.status(403).json({ error: 'Password required', code: 'PASSWORD_REQUIRED' });
            }
            const isMatch = await bcrypt.compare(passwordHeader, album.password);
            if (!isMatch) {
                return res.status(403).json({ error: 'Invalid password' });
            }
        }

        const data = {
            ...album,
            photos: album.photos.map(photo => ({
                ...photo,
                urls: getOptimizedUrls(photo.publicId, photo.url)
            })),
            isOwner,
            sharedUsers: isOwner ? album.sharedWith.map(s => s.user) : undefined
        };

        return res.json(data);
    } catch (error) {
        wideLogger.add('err', { msg: 'Failed to fetch album', stack: (error as Error).stack });
        return res.status(500).json({ error: 'Failed to fetch album' });
    }
};

export const revokeAccess = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { id } = req.params;
        const { email } = req.body;

        const album = await prisma.album.findUnique({ where: { id: id as string } });

        if (!album || album.deletedAt) {
            return res.status(404).json({ error: 'Album not found' });
        }

        if (album.userId !== req.user!.userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const userRevoke = await prisma.user.findUnique({ where: { email } });

        if (!userRevoke) {
            return res.status(404).json({ error: 'User not found' });
        }

        await prisma.sharedAlbum.delete({
            where: {
                albumId_userId: {
                    albumId: album.id,
                    userId: userRevoke.id
                }
            }
        });

        return res.json({ message: 'Access revoked successfully' });
    } catch (error) {
        if ((error as unknown as { code?: string }).code === 'P2025') {
            return res.status(404).json({ error: 'User does not have access to this album' });
        }
        wideLogger.add('err', { msg: 'Failed to revoke access', stack: (error as Error).stack });
        return res.status(500).json({ error: 'Failed to revoke access' });
    }
};


export const getMyAlbums = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const search = req.query.search as string || '';
        const skip = (page - 1) * limit;

        const whereClause: Prisma.AlbumWhereInput = { userId: req.user!.userId, deletedAt: null };
        if (search) {
            whereClause.title = { contains: search, mode: 'insensitive' };
        }

        const [albums, total] = await Promise.all([
            prisma.album.findMany({
                where: whereClause,
                include: { photos: { take: 1 } }, // Only get 1 preview photo to save bandwidth
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.album.count({ where: whereClause }),
        ]);

        const data = albums.map(album => ({
            ...album,
            photos: album.photos.map(photo => ({
                ...photo,
                urls: getOptimizedUrls(photo.publicId, photo.url)
            }))
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
        wideLogger.add('err', { msg: 'Failed to fetch albums', stack: (error as Error).stack });
        return res.status(500).json({ error: 'Failed to fetch albums' });
    }
};

import { sendNotification } from '../services/push.service.js';

export const addPhotoToAlbum = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { albumId, photoId } = req.body;

        const album = await prisma.album.findUnique({
            where: { id: albumId },
            include: { sharedWith: true }
        });
        const photo = await prisma.photo.findUnique({ where: { id: photoId } });

        if (!album || !photo || album.deletedAt) {
            return res.status(404).json({ error: 'Album or Photo not found' });
        }

        const isOwner = album.userId === req.user!.userId;
        const isEditor = album.sharedWith.some(
            (share) => share.userId === req.user!.userId && share.role === 'EDITOR'
        );

        if (!isOwner && !isEditor) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        if (photo.userId !== req.user!.userId) {
            return res.status(403).json({ error: 'Forbidden: You can only add your own photos' });
        }

        const updatedPhoto = await prisma.photo.update({
            where: { id: photoId },
            data: { albumId },
        });

        // Notify shared users
        for (const share of album.sharedWith) {
            sendNotification(share.userId, {
                title: 'New Photo Added',
                body: `A new photo was added to album "${album.title}"`,
                url: `/albums/${album.id}`
            });
        }

        return res.json(updatedPhoto);
    } catch (error) {
        wideLogger.add('err', { msg: 'Failed to add photo to album', stack: (error as Error).stack });
        return res.status(500).json({ error: 'Failed to add photo to album' });
    }
};

export const shareAlbum = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { id } = req.params;
        const { email, role } = req.body;

        const album = await prisma.album.findUnique({ where: { id: id as string } });

        if (!album || album.deletedAt) {
            return res.status(404).json({ error: 'Album not found' });
        }

        if (album.userId !== req.user!.userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const userToShare = await prisma.user.findUnique({ where: { email } });

        if (!userToShare) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (userToShare.id === req.user!.userId) {
            return res.status(400).json({ error: 'Cannot share album with yourself' });
        }

        await prisma.sharedAlbum.upsert({
            where: {
                albumId_userId: {
                    albumId: album.id,
                    userId: userToShare.id
                }
            },
            update: {
                role: role || 'VIEWER'
            },
            create: {
                albumId: album.id,
                userId: userToShare.id,
                role: role || 'VIEWER'
            }
        });

        return res.json({ message: 'Album shared successfully' });
    } catch (error) {
        wideLogger.add('err', { msg: 'Failed to share album', stack: (error as Error).stack });
        // Handle unique constraint violation (already shared)
        if ((error as unknown as { code?: string }).code === 'P2002') {
            return res.status(400).json({ error: 'Album already shared with this user' });
        }
        return res.status(500).json({ error: 'Failed to share album' });
    }
};

export const getSharedAlbums = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const sharedAlbums = await prisma.sharedAlbum.findMany({
            where: {
                userId: req.user!.userId,
                album: { deletedAt: null }
            },
            include: {
                album: {
                    include: {
                        photos: { take: 1 },
                        user: { select: { id: true, email: true } } // Include owner info
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const data = sharedAlbums.map(item => ({
            ...item.album,
            photos: item.album.photos.map(photo => ({
                ...photo,
                urls: getOptimizedUrls(photo.publicId, photo.url)
            })),
            sharedAt: item.createdAt,
            owner: item.album.user
        }));

        return res.json({ data });
    } catch (error) {
        wideLogger.add('err', { msg: 'Failed to fetch shared albums', stack: (error as Error).stack });
        return res.status(500).json({ error: 'Failed to fetch shared albums' });
    }
};

export const updateAlbumPrivacy = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        const album = await prisma.album.findUnique({ where: { id: id as string } });

        if (!album || album.deletedAt) {
            return res.status(404).json({ error: 'Album not found' });
        }

        if (album.userId !== req.user!.userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        let hashedPassword = null;
        if (password) {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        await prisma.album.update({
            where: { id: id as string },
            data: { password: hashedPassword }
        });

        return res.json({ message: 'Album privacy updated' });
    } catch (error) {
        wideLogger.add('err', { msg: 'Failed to update privacy', stack: (error as Error).stack });
        return res.status(500).json({ error: 'Failed to update privacy' });
    }
};

export const generateMagicLink = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { id } = req.params;
        const { expiresInDays = 7 } = req.body;

        const album = await prisma.album.findUnique({ where: { id: id as string } });

        if (!album || album.deletedAt) {
            return res.status(404).json({ error: 'Album not found' });
        }

        if (album.userId !== req.user!.userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        await prisma.album.update({
            where: { id: album.id },
            data: {
                magicLinkToken: token,
                magicLinkExpiresAt: expiresAt
            }
        });

        const magicLink = `${req.protocol}://${req.get('host')}/api/albums/magic/${token}`;

        wideLogger.addCtx('album_id', id);
        wideLogger.addCtx('expires_in_days', expiresInDays);
        wideLogger.addCtx('action', 'magic_link_generate');

        return res.json({
            token,
            expiresAt,
            magicLink
        });

    } catch (error) {
        wideLogger.add('err', { msg: 'Failed to generate magic link', stack: (error as Error).stack });
        return res.status(500).json({ error: 'Failed to generate magic link' });
    }
};

export const revokeMagicLink = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { id } = req.params;

        const album = await prisma.album.findUnique({ where: { id: id as string } });

        if (!album || album.deletedAt) {
            return res.status(404).json({ error: 'Album not found' });
        }

        if (album.userId !== req.user!.userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        await prisma.album.update({
            where: { id: album.id },
            data: {
                magicLinkToken: null,
                magicLinkExpiresAt: null
            }
        });



        wideLogger.addCtx('album_id', id);
        wideLogger.addCtx('action', 'magic_link_revoke');

        return res.json({ message: 'Magic link revoked successfully' });

    } catch (error) {
        wideLogger.add('err', { msg: 'Failed to revoke magic link', stack: (error as Error).stack });
        return res.status(500).json({ error: 'Failed to revoke magic link' });
    }
};

export const getAlbumByMagicLink = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        const album = await prisma.album.findUnique({
            where: { magicLinkToken: token as string },
            include: {
                photos: true,
                user: {
                    select: {
                        id: true,
                        email: true
                    }
                }
            }
        });

        if (!album || album.deletedAt) {
            return res.status(404).json({ error: 'Album not found or link is invalid' });
        }

        // Check expiration
        if (!album.magicLinkExpiresAt || new Date() > album.magicLinkExpiresAt) {
            return res.status(410).json({ error: 'Magic link has expired' });
        }

        const data = {
            ...album,
            photos: album.photos.map(photo => ({
                ...photo,
                urls: getOptimizedUrls(photo.publicId, photo.url)
            })),
            isOwner: false, // Public viewer
            password: undefined,
            magicLinkToken: undefined,
            magicLinkExpiresAt: album.magicLinkExpiresAt
        };

        return res.json({ data });

    } catch (error) {
        wideLogger.add('err', { msg: 'Failed to access album via magic link', stack: (error as Error).stack });
        return res.status(500).json({ error: 'Failed to access album' });
    }
};

export const deleteAlbum = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { id } = req.params;

        const album = await prisma.album.findUnique({ where: { id: id as string } });

        if (!album || album.deletedAt) {
            return res.status(404).json({ error: 'Album not found' });
        }

        if (album.userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Soft delete
        await prisma.album.update({
            where: { id: id as string },
            data: { deletedAt: new Date() }
        });

        wideLogger.addCtx('album_id', id);
        wideLogger.addCtx('action', 'album_soft_delete');

        return res.json({ message: 'Album moved to trash' });
    } catch (error) {
        wideLogger.add('err', { msg: 'Delete album failed', stack: (error as Error).stack });
        return res.status(500).json({ error: 'Delete album failed' });
    }
};

export const getTrashAlbums = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const albums = await prisma.album.findMany({
            where: {
                userId: req.user!.userId,
                deletedAt: { not: null }
            },
            include: { photos: { take: 1 } },
            orderBy: { deletedAt: 'desc' }
        });

        const data = albums.map(album => ({
            ...album,
            photos: album.photos.map(photo => ({
                ...photo,
                urls: getOptimizedUrls(photo.publicId, photo.url)
            })),
        }));

        wideLogger.addCtx('count', albums.length);
        wideLogger.addCtx('action', 'album_view_trash');

        return res.json({ data });
    } catch (error) {
        wideLogger.add('err', { msg: 'Failed to fetch trash albums', stack: (error as Error).stack });
        return res.status(500).json({ error: 'Failed to fetch trash albums' });
    }
};

export const restoreAlbum = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { id } = req.params;

        const album = await prisma.album.findUnique({
            where: { id: id as string }
        });

        if (!album) {
            return res.status(404).json({ error: 'Album not found' });
        }

        if (album.userId !== req.user!.userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const restored = await prisma.album.update({
            where: { id: id as string },
            data: { deletedAt: null }
        });

        wideLogger.addCtx('album_id', id);
        wideLogger.addCtx('action', 'album_restore');

        return res.json({ message: 'Album restored', data: restored });
    } catch (error) {
        wideLogger.add('err', { msg: 'Restore album failed', stack: (error as Error).stack });
        return res.status(500).json({ error: 'Restore album failed' });
    }
};

export const hardDeleteAlbum = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { id } = req.params;

        const album = await prisma.album.findUnique({
            where: { id: id as string }
        });

        if (!album) {
            return res.status(404).json({ error: 'Album not found' });
        }

        if (album.userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Fetch and delete all photos from Cloudinary
        const photos = await prisma.photo.findMany({ where: { albumId: id as string } });

        // Delete individually to ensure Cloudinary cleanup
        for (const p of photos) {
            try {
                await cloudinary.uploader.destroy(p.publicId);
            } catch (err) {
                wideLogger.add('err', { msg: 'Failed to delete photo from Cloudinary during album hard delete', photoId: p.id, error: (err as Error).message });
            }
        }

        await prisma.album.delete({ where: { id: id as string } });

        wideLogger.addCtx('album_id', id);
        wideLogger.addCtx('action', 'album_hard_delete');

        return res.json({ message: 'Album permanently deleted' });
    } catch (error) {
        wideLogger.add('err', { msg: 'Hard delete album failed', stack: (error as Error).stack });
        return res.status(500).json({ error: 'Hard delete album failed' });
    }
};

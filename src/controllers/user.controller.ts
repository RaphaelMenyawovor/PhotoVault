import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.middleware.js';
import prisma from '../configs/prisma.js';
import cloudinary from '../configs/cloudinary.js';
import { Readable } from 'stream';
import type { UploadApiResponse } from 'cloudinary';
import { extractPublicIdFromUrl } from '../utils/image.utils.js';
import { wideLogger } from '../utils/wideLogger.js';

export const updateAvatar = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        const userId = req.user!.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Delete old avatar if exists
        if (user.avatar) {
            const publicId = extractPublicIdFromUrl(user.avatar);
            if (publicId) {
                // Fire and forget deletion, or await it? 
                // Better to await to handle errors or at least log
                // But failure to delete shouldn't block new upload strictly, 
                // though managing storage is good.
                try {
                    await cloudinary.uploader.destroy(publicId);
                } catch (err) {
                    wideLogger.add('err', { msg: 'Failed to delete old avatar', error: err });
                }
            }
        }

        // Upload new avatar
        const uploadStream = (buffer: Buffer): Promise<UploadApiResponse> => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'photovault/avatars',
                        transformation: [
                            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
                            { quality: 'auto', fetch_format: 'auto' }
                        ]
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

        // Update User
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { avatar: result.secure_url },
            select: { id: true, email: true, avatar: true, role: true } // Return safe user object
        });

        wideLogger.addCtx('action', 'user_update_avatar');
        wideLogger.addCtx('avatar_url', result.secure_url);

        return res.json(updatedUser);

    } catch (error) {
        wideLogger.add('err', { msg: 'Avatar update failed', stack: (error as Error).stack });
        return res.status(500).json({ error: 'Failed to update avatar' });
    }
};

import cron from 'node-cron';
import prisma from '../configs/prisma.js';
import cloudinary from '../configs/cloudinary.js';
import { wideLogger } from '../utils/wideLogger.js';

export const runCleanup = async () => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    console.log(`Starting automated trash cleanup. Cutoff: ${cutoffDate.toISOString()}`);

    try {
        // 1. Cleanup Photos
        const stalePhotos = await prisma.photo.findMany({
            where: {
                deletedAt: {
                    lt: cutoffDate
                }
            }
        });

        if (stalePhotos.length > 0) {
            console.log(`Found ${stalePhotos.length} stale photos to cleanup.`);
            for (const photo of stalePhotos) {
                try {
                    await cloudinary.uploader.destroy(photo.publicId);
                    await prisma.photo.delete({ where: { id: photo.id } });
                } catch (err) {
                    wideLogger.add('err', { msg: 'Failed to cleanup stale photo', photoId: photo.id, error: (err as Error).message });
                }
            }
        }

        // 2. Cleanup Albums
        const staleAlbums = await prisma.album.findMany({
            where: {
                deletedAt: {
                    lt: cutoffDate
                }
            },
            include: { photos: true }
        });

        if (staleAlbums.length > 0) {
            console.log(`Found ${staleAlbums.length} stale albums to cleanup.`);
            for (const album of staleAlbums) {
                try {
                    // Delete all photos in the album from Cloudinary first
                    // Note: If photos were soft-deleted separately, they might be caught by step 1.
                    // If they are only effectively deleted because the album is deleted, they are caught here.
                    for (const photo of album.photos) {
                        try {
                            await cloudinary.uploader.destroy(photo.publicId);
                        } catch (err) {
                            wideLogger.add('err', { msg: 'Failed to delete album photo from Cloudinary during cleanup', photoId: photo.id, error: (err as Error).message });
                        }
                    }

                    // Delete album (Cascade will handle DB photo records if configured, but we explicit delete to be safe/clean?
                    // Prisma schema says: user -> Cascade. Photo -> Album? 
                    // Let's rely on Prisma delete. If Photo has albumId foreign key, and we delete album...
                    // If onDelete is not Cascade, we must delete photos first.
                    // Safe approach: Delete photos first from DB too.
                    await prisma.photo.deleteMany({ where: { albumId: album.id } });
                    await prisma.album.delete({ where: { id: album.id } });

                } catch (err) {
                    wideLogger.add('err', { msg: 'Failed to cleanup stale album', albumId: album.id, error: (err as Error).message });
                }
            }
        }

        console.log(`Automated trash cleanup completed. Removed ${stalePhotos.length} photos and ${staleAlbums.length} albums.`);

    } catch (error) {
        wideLogger.add('err', { msg: 'Automated trash cleanup job failed', error: (error as Error).message });
    }
};

export const startCleanupJob = () => {
    // Run every day at midnight (00:00)
    cron.schedule('0 0 * * *', () => {
        runCleanup();
    });
    console.log('Automated trash cleanup job scheduled (Daily at 00:00)');
};

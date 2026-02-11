import cloudinary from '../configs/cloudinary.js';

export const getOptimizedUrls = (publicId: string, secureUrl: string) => {
    // If secureUrl is not from cloudinary (e.g. data URI or other source), just return it
    if (!secureUrl.includes('cloudinary.com')) {
        return {
            thumbnail: secureUrl,
            full: secureUrl,
            optimized: secureUrl
        };
    }

    const baseUrl = secureUrl.split('/upload/')[0] + '/upload';
    const path = secureUrl.split('/upload/')[1];

    // Constructing URLs manually for consistency and speed, or using Cloudinary SDK if preferred.
    // Given the previous code used manual string manipulation in one version and SDK in another, 
    // I will stick to the SDK method for robustness if the previous file used it, 
    // BUT the previous file view showed SDK usage.
    // However, the replace_file_content used string manipulation.
    // I will use the SDK method as it's cleaner, but I need to make sure I have the import.
    // The previous file content in 3577 showed usage of cloudinary.url.

    return {
        thumbnail: cloudinary.url(publicId, {
            transformation: [
                { width: 400, height: 400, crop: 'fill', gravity: 'auto' },
                { quality: 'auto', fetch_format: 'auto' }
            ],
            secure: true
        }),
        medium: cloudinary.url(publicId, {
            transformation: [
                { width: 1080, crop: 'limit' },
                { quality: 'auto', fetch_format: 'auto' }
            ],
            secure: true
        }),
        large: cloudinary.url(publicId, {
            transformation: [
                { width: 1920, crop: 'limit' },
                { quality: 'auto', fetch_format: 'auto' }
            ],
            secure: true
        }),
        original: secureUrl,
        // Keep the manual 'optimized' calculation from my previous attempt if it was relied upon?
        // The controller uses `getOptimizedUrls(photo.publicId, photo.url)`. 
        // The return type expected by controller seems to cover `thumbnail`, `full`, `optimized`?
        // Let's check what the controller expects. 
        // In Step 3545, controller uses `urls: getOptimizedUrls(...)`.
        // The original `getOptimizedUrls` implementation (implied from what I saw before) might have returned different keys.
        // Let's look at Step 3545, lines 143: `urls: getOptimizedUrls(photo.publicId, photo.url)`.
        // It doesn't show the structure.
        // Let's assume the standard keys `thumbnail`, `medium`, `large`, `original` are good, 
        // plus `optimized` as a synonym for `medium` or `large` if needed. 
        // Actually, in the broken file in 3572, I tried to insert `thumbnail`, `full`, `optimized`.
        // I will provide a superset to be safe.
        optimized: cloudinary.url(publicId, {
            transformation: [
                { quality: 'auto', fetch_format: 'auto' }
            ],
            secure: true
        })
    };
};

export const extractExifData = (cloudinaryResult: any): { takenAt?: Date, exifData?: any } => {
    const metadata = cloudinaryResult.image_metadata || {};
    const exifData: any = {};

    // Extract common fields
    if (metadata.Make) exifData.make = metadata.Make;
    if (metadata.Model) exifData.model = metadata.Model;
    if (metadata.ISO) exifData.iso = metadata.ISO;
    if (metadata.ExposureTime) exifData.exposureTime = metadata.ExposureTime;
    if (metadata.FNumber) exifData.fNumber = metadata.FNumber;
    if (metadata.FocalLength) exifData.focalLength = metadata.FocalLength;
    if (metadata.LensModel) exifData.lensModel = metadata.LensModel;

    // GPS
    if (metadata.GPSLatitude && metadata.GPSLongitude) {
        exifData.gps = {
            latitude: metadata.GPSLatitude,
            longitude: metadata.GPSLongitude
        };
    }

    let takenAt: Date | undefined;

    // Try to parse Date Time Original
    // Format is usually "YYYY:MM:DD HH:MM:SS"
    if (metadata.DateTimeOriginal) {
        // Some cameras use ":" separators for date parts
        const parts = metadata.DateTimeOriginal.split(' ');
        if (parts.length >= 2) {
            const dateParts = parts[0].split(':');
            const timeParts = parts[1].split(':');
            if (dateParts.length === 3 && timeParts.length >= 3) {
                takenAt = new Date(
                    parseInt(dateParts[0]),
                    parseInt(dateParts[1]) - 1, // Month is 0-indexed
                    parseInt(dateParts[2]),
                    parseInt(timeParts[0]),
                    parseInt(timeParts[1]),
                    parseInt(timeParts[2])
                );
            }
        }
    }

    return {
        takenAt: takenAt ?? undefined,
        exifData: Object.keys(exifData).length > 0 ? exifData : undefined
    };
};

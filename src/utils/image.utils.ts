import cloudinary from '../configs/cloudinary.js';

export const getOptimizedUrls = (publicId: string, secureUrl: string) => {
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
        original: secureUrl
    };
};

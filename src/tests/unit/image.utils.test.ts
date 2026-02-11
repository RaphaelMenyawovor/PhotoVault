import { extractExifData, getOptimizedUrls } from '../../utils/image.utils.js';

describe('Image Utils', () => {
    describe('extractExifData', () => {
        it('should return undefined if no metadata', () => {
            const result = extractExifData({});
            expect(result.takenAt).toBeUndefined();
            expect(result.exifData).toBeUndefined();
        });

        it('should extract common fields', () => {
            const mockCloudinary = {
                image_metadata: {
                    Make: 'Canon',
                    Model: 'EOS 5D',
                    ISO: '100',
                    ExposureTime: '1/200',
                    FNumber: '2.8'
                }
            };
            const result = extractExifData(mockCloudinary);
            expect(result.exifData).toEqual({
                make: 'Canon',
                model: 'EOS 5D',
                iso: '100',
                exposureTime: '1/200',
                fNumber: '2.8'
            });
        });

        it('should extract GPS data', () => {
            const mockCloudinary = {
                image_metadata: {
                    GPSLatitude: '51.5074',
                    GPSLongitude: '-0.1278'
                }
            };
            const result = extractExifData(mockCloudinary);
            expect(result.exifData.gps).toEqual({
                latitude: '51.5074',
                longitude: '-0.1278'
            });
        });

        it('should parse DateTimeOriginal correctly', () => {
            const mockCloudinary = {
                image_metadata: {
                    DateTimeOriginal: '2023:10:25 14:30:00'
                }
            };
            const result = extractExifData(mockCloudinary);
            expect(result.takenAt).toBeDefined();
            expect(result.takenAt?.getFullYear()).toBe(2023);
            expect(result.takenAt?.getMonth()).toBe(9); // 0-indexed
            expect(result.takenAt?.getDate()).toBe(25);
            expect(result.takenAt?.getHours()).toBe(14);
            expect(result.takenAt?.getMinutes()).toBe(30);
        });

        it('should handle invalid Date format gracefully', () => {
            const mockCloudinary = {
                image_metadata: {
                    DateTimeOriginal: 'Invalid Date String'
                }
            };
            const result = extractExifData(mockCloudinary);
            expect(result.takenAt).toBeUndefined();
        });
    });

    describe('getOptimizedUrls', () => {
        it('should handle non-cloudinary urls', () => {
            const url = 'https://example.com/image.jpg';
            const res = getOptimizedUrls('id', url);
            expect(res.full).toBe(url);
            expect(res.thumbnail).toBe(url);
        });

        // We can't easily test the Cloudinary SDK output without mocking it heavily, 
        // but we can verify it returns an object with keys.
        it('should return object with keys for cloudinary url', () => {
            const url = 'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg';
            const res = getOptimizedUrls('sample', url);
            expect(res.thumbnail).toBeDefined();
            expect(res.medium).toBeDefined();
            expect(res.large).toBeDefined();
            expect(res.original).toBe(url);
        });
    });
});

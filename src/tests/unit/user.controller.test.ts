import { getMockReq, getMockRes } from '@jest-mock/express';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Define mock objects
const mockPrisma = {
    user: {
        findUnique: jest.fn(),
        update: jest.fn()
    }
};

const mockCloudinary = {
    uploader: {
        upload_stream: jest.fn(),
        destroy: jest.fn()
    }
};

const mockImageUtils = {
    extractPublicIdFromUrl: jest.fn()
};

const mockLogger = {
    wideLogger: {
        add: jest.fn(),
        addCtx: jest.fn()
    }
};

// Mock modules
jest.unstable_mockModule('../../configs/prisma.js', () => ({ default: mockPrisma }));
jest.unstable_mockModule('../../configs/cloudinary.js', () => ({ default: mockCloudinary }));
jest.unstable_mockModule('../../utils/image.utils.js', () => mockImageUtils);
jest.unstable_mockModule('../../utils/wideLogger.js', () => mockLogger);

// Import controller dynamically
const { updateAvatar } = await import('../../controllers/user.controller.js');

describe('User Controller - updateAvatar', () => {
    const mockUserId = 'user-123';
    const mockFile = {
        buffer: Buffer.from('fake-image'),
        mimetype: 'image/jpeg'
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should upload new avatar and update user', async () => {
        const req = getMockReq({
            user: { id: mockUserId },
            file: mockFile
        });
        const { res } = getMockRes();

        // Mock User found (no current avatar)
        (mockPrisma.user.findUnique as any).mockResolvedValue({ id: mockUserId, avatar: null });

        // Mock Cloudinary Upload
        (mockCloudinary.uploader.upload_stream as any).mockImplementation((_options: any, callback: any) => {
            // @ts-ignore
            callback(null, { secure_url: 'https://cloudinary.com/new-avatar.jpg', public_id: 'new-id' });
        });

        // Mock Prisma Update
        (mockPrisma.user.update as any).mockResolvedValue({
            id: mockUserId,
            avatar: 'https://cloudinary.com/new-avatar.jpg'
        });

        await updateAvatar(req as any, res as any);

        expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: mockUserId } });
        expect(mockCloudinary.uploader.upload_stream).toHaveBeenCalled();
        expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: mockUserId },
            data: { avatar: 'https://cloudinary.com/new-avatar.jpg' }
        }));
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ avatar: 'https://cloudinary.com/new-avatar.jpg' }));
    });

    it('should delete old avatar if exists', async () => {
        const req = getMockReq({
            user: { id: mockUserId },
            file: mockFile
        });
        const { res } = getMockRes();

        const oldAvatarUrl = 'https://cloudinary.com/old-avatar.jpg';
        const oldPublicId = 'old-id';

        // Mock User found WITH avatar
        (mockPrisma.user.findUnique as any).mockResolvedValue({ id: mockUserId, avatar: oldAvatarUrl });

        // Mock ID extraction
        (mockImageUtils.extractPublicIdFromUrl as any).mockReturnValue(oldPublicId);

        // Mock Cloudinary Upload
        (mockCloudinary.uploader.upload_stream as any).mockImplementation((_options: any, callback: any) => {
            // @ts-ignore
            callback(null, { secure_url: 'https://cloudinary.com/new-avatar.jpg' });
        });

        await updateAvatar(req as any, res as any);

        expect(mockImageUtils.extractPublicIdFromUrl).toHaveBeenCalledWith(oldAvatarUrl);
        expect(mockCloudinary.uploader.destroy).toHaveBeenCalledWith(oldPublicId);
    });

    it('should handle missing file', async () => {
        const req = getMockReq({
            user: { id: mockUserId }
            // no file
        });
        const { res } = getMockRes();

        await updateAvatar(req as any, res as any);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'No image file provided' });
    });
});

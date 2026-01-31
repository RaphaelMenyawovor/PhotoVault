import { Router } from 'express';
import { createAlbum, getMyAlbums, addPhotoToAlbum, shareAlbum, getSharedAlbums, updateAlbumPrivacy, getAlbum, revokeAccess, generateMagicLink, revokeMagicLink, getAlbumByMagicLink, deleteAlbum, getTrashAlbums, restoreAlbum, hardDeleteAlbum, downloadAlbum } from '../controllers/album.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validator.middleware.js';
import { albumSchema, addPhotoToAlbumSchema, shareAlbumSchema, albumPrivacySchema, generateMagicLinkSchema } from '../schemas/album.schema.js';
import { searchQuerySchema } from '../schemas/common.schema.js';

const router = Router();


// Public route for Magic Links
router.get('/magic/:token', getAlbumByMagicLink);

router.use(verifyToken);
router.post('/', validate(albumSchema), createAlbum);
router.get('/my-albums', validate(searchQuerySchema), getMyAlbums);
router.get('/shared', getSharedAlbums); // Moved up to avoid collision with /:id
router.get('/trash', getTrashAlbums);   // New functionality

router.post('/add-photo', validate(addPhotoToAlbumSchema), addPhotoToAlbum);

// Routes for album sharing and privacy
router.get('/:id', getAlbum);
router.get('/:id/download', downloadAlbum); // Bulk Download
router.post('/:id/share', validate(shareAlbumSchema), shareAlbum);
router.delete('/:id/share', validate(shareAlbumSchema), revokeAccess);
router.put('/:id/privacy', validate(albumPrivacySchema), updateAlbumPrivacy);

// Magic Link Management
router.post('/:id/magic-link', validate(generateMagicLinkSchema), generateMagicLink);
router.delete('/:id/magic-link', revokeMagicLink);

// Soft Delete & Restore
router.post('/:id/restore', restoreAlbum);
router.delete('/:id/hard', hardDeleteAlbum);
router.delete('/:id', deleteAlbum);

export default router;

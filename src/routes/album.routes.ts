import { Router } from 'express';
import { createAlbum, getMyAlbums, addPhotoToAlbum, shareAlbum, getSharedAlbums, updateAlbumPrivacy, getAlbum, revokeAccess, generateMagicLink, revokeMagicLink, getAlbumByMagicLink } from '../controllers/album.controller.js';
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
router.post('/add-photo', validate(addPhotoToAlbumSchema), addPhotoToAlbum);

// Routes for album sharing and privacy
router.get('/:id', getAlbum);
router.post('/:id/share', validate(shareAlbumSchema), shareAlbum);
router.delete('/:id/share', validate(shareAlbumSchema), revokeAccess);
router.get('/shared', getSharedAlbums);
router.put('/:id/privacy', validate(albumPrivacySchema), updateAlbumPrivacy);

// Magic Link Management
router.post('/:id/magic-link', validate(generateMagicLinkSchema), generateMagicLink);
router.delete('/:id/magic-link', revokeMagicLink);

export default router;

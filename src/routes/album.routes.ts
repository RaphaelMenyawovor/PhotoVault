import { Router } from 'express';
import { createAlbum, getMyAlbums, addPhotoToAlbum } from '../controllers/album.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validator.middleware.js';
import { albumSchema, addPhotoToAlbumSchema } from '../schemas/album.schema.js';

const router = Router();

router.use(verifyToken);
router.post('/', validate(albumSchema), createAlbum);
router.get('/my-albums', getMyAlbums);
router.post('/add-photo', validate(addPhotoToAlbumSchema), addPhotoToAlbum);

export default router;

import { Router } from 'express';
import { uploadPhoto, getPublicPhotos, getMyPhotos, deletePhoto, getTrash, restorePhoto, hardDeletePhoto } from '../controllers/photo.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import upload from '../middleware/multer.middleware.js';
import { validate } from '../middleware/validator.middleware.js';
import { photoSchema } from '../schemas/photo.schema.js';
import { searchQuerySchema } from '../schemas/common.schema.js';

const router = Router();

router.get('/public', validate(searchQuerySchema), getPublicPhotos);

// After the public route the rest must be authenticated
router.use(verifyToken);
router.post('/upload', upload.single('image'), validate(photoSchema), uploadPhoto);
router.get('/my-photos', validate(searchQuerySchema), getMyPhotos);

// Trash routes
router.get('/trash', getTrash);
router.post('/:id/restore', restorePhoto);
router.delete('/:id/hard', hardDeletePhoto);
router.delete('/:id', deletePhoto);

export default router;

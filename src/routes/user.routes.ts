import { Router } from 'express';
import { updateAvatar } from '../controllers/user.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import multer from 'multer';

const router = Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Protect all user routes
router.use(verifyToken);

router.put('/avatar', upload.single('avatar'), updateAvatar);

export default router;

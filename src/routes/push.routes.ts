import { Router } from 'express';
import { subscribe } from '../controllers/push.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validator.middleware.js';
import { pushSubscriptionSchema } from '../schemas/push.schema.js';

const router = Router();

router.use(verifyToken);
router.post('/subscribe', validate(pushSubscriptionSchema), subscribe);

export default router;

import { Router } from 'express';
import { register, login } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validator.middleware.js';
import { registerSchema, loginSchema } from '../schemas/auth.schema.js';
import { authLimiter } from '../middleware/authLimiter.middleware.js';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);

export default router;

import { Router } from 'express';
import { register, login, forgotPassword, resetPassword, googleCallback } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validator.middleware.js';
import { registerSchema, loginSchema } from '../schemas/auth.schema.js';
import { authLimiter } from '../middleware/authLimiter.middleware.js';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/forgot-password', authLimiter, forgotPassword);
// Google Auth Routes
import passport from 'passport';

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/login' }),
    googleCallback
);

export default router;

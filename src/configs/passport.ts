import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import prisma from './prisma.js';
import { wideLogger } from '../utils/wideLogger.js';
import { randomBytes } from 'crypto';

// Ensure environment variables are set
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn('⚠️ Google OAuth credentials missing. Google Auth will fail if used.');
}

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'dummy_id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy_secret',
    callbackURL: '/api/auth/google/callback',
    passReqToCallback: true
}, async (_req, _accessToken, _refreshToken, profile, done) => {
    try {
        const { id: googleId, displayName, photos, emails } = profile;
        const email = emails?.[0]?.value;
        // Fix: Ensure avatar is string | null, not undefined
        const avatar = photos?.[0]?.value || null;

        if (!email) {
            return done(new Error('No email found in Google profile'));
        }

        // 1. Check if user exists with this googleId
        let user = await prisma.user.findUnique({
            where: { googleId }
        });

        if (user) {
            // User exists, return user
            return done(null, user);
        }

        // 2. Check if user exists with the same email (Account Linking)
        user = await prisma.user.findUnique({
            where: { email }
        });

        if (user) {
            // Link account
            user = await prisma.user.update({
                where: { id: user.id },
                data: { googleId, avatar }
            });
            wideLogger.addCtx('auth_action', 'account_linked');
            return done(null, user);
        }

        // 3. Create new user
        // Generate a random password since they use Google
        const randomPassword = randomBytes(16).toString('hex');

        user = await prisma.user.create({
            data: {
                email,
                password: randomPassword, // In a real app strategies might allow null password
                googleId,
                avatar,
                role: 'USER' // Default role
            }
        });

        wideLogger.addCtx('auth_action', 'google_signup');
        return done(null, user);

    } catch (error) {
        wideLogger.add('err', { msg: 'Google Auth Error', error });
        return done(error as Error, undefined);
    }
}));

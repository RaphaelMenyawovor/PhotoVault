import { z } from 'zod';

export const registerSchema = z.object({
    email: z.email(),
    password: z.string().min(6),
});

export const loginSchema = z.object({
    email: z.email(),
    password: z.string(),
});

export const forgotPasswordSchema = z.object({
    email: z.email(),
});

export const resetPasswordSchema = z.object({
    token: z.string(),
    newPassword: z.string().min(6),
});

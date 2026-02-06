import { Resend } from 'resend';
import { wideLogger } from '../utils/wideLogger.js';

class EmailService {
    private resend: Resend;
    private fromEmail: string;

    constructor() {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            console.warn('⚠️ RESEND_API_KEY is not set. Email styling will be skipped or fail.');
        }
        this.resend = new Resend(apiKey || 're_123456789'); // Dummy key to prevent crash on init
        // Use a verified domain or the testing domain provided by Resend
        this.fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';
    }

    async sendPasswordResetEmail(email: string, token: string) {
        // Construct the reset link
        // Assuming frontend URL or API direct link. For API testing, we send the token.
        // In prod, this would be: ${process.env.FRONTEND_URL}/reset-password?token=${token}
        const resetLink = `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/reset-password?token=${token}`; // Using API endpoint pattern for simplicity in this backend-focused task, or could be a frontend link.
        // User asked for "Password Reset Feature". Usually this implies a frontend. 
        // But since this is a backend repo, I'll send the token clearly.

        try {
            const { data, error } = await this.resend.emails.send({
                from: this.fromEmail,
                to: email, // Free tier only sends to account owner unless domain verified
                subject: 'Reset Your Password - PhotoVault',
                html: `
                    <h1>Password Reset Request</h1>
                    <p>You requested a password reset. Use the token below to reset your password:</p>
                    <p><strong>Token: ${token}</strong></p>
                    <p>Or make a POST request to <code>/api/auth/reset-password</code> with this token.</p>
                    <p><small>This token expires in 1 hour.</small></p>
                `,
            });

            if (error) {
                wideLogger.add('err', { msg: 'Failed to send email via Resend', error });
                return false;
            }

            wideLogger.add('ctx', { msg: 'Password reset email sent', email, messageId: data?.id });
            return true;
        } catch (err) {
            wideLogger.add('err', { msg: 'Email sending exception', error: (err as Error).message });
            return false;
        }
    }
}

export const emailService = new EmailService();

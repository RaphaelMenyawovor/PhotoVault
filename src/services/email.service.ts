import { Resend } from 'resend';
import { wideLogger } from '../utils/wideLogger.js';
import { resetPasswordTemplate } from '../templates/emails/passwordReset.js';
import dotenv from 'dotenv';

dotenv.config();

class EmailService {
    private resend: Resend;
    private fromEmail: string;

    constructor() {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            console.warn('⚠️ RESEND_API_KEY is not set. Email styling will be skipped or fail.');
        }
        this.resend = new Resend(apiKey || 're_123456789');
        this.fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';
    }

    async sendPasswordResetEmail(email: string, token: string) {
        // Industry Standard: Send a link to the FRONTEND, which then calls the API
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

        try {
            const { data, error } = await this.resend.emails.send({
                from: this.fromEmail,
                to: email,
                subject: 'Reset Your PhotoVault Password',
                html: resetPasswordTemplate(resetUrl, token),
                text: `Reset your password by visiting: ${resetUrl}\n\nToken: ${token}`
            });

            if (error) {
                // WideLogger handles the logging
                wideLogger.add('err', { msg: 'Failed to send email via Resend', error });
                return false;
            }

            wideLogger.addCtx('action', 'email_send_password_reset');
            wideLogger.addCtx('email', email);
            wideLogger.addCtx('message_id', data?.id);
            return true;
        } catch (err) {
            wideLogger.add('err', { msg: 'Email sending exception', error: (err as Error).message });
            return false;
        }
    }
}

export const emailService = new EmailService();

import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.middleware.js';
import prisma from '../configs/prisma.js';
import { wideLogger } from '../utils/wideLogger.js';

export const subscribe = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { endpoint, keys } = req.body;
        const userId = req.user!.userId;

        // Upsert subscription to prevent duplicates
        // Note: endpoint is unique in schema, but we want to handle the case where correct user updates keys
        // or re-subscribes.

        await prisma.pushSubscription.upsert({
            where: { endpoint },
            update: {
                keys,
                userId
            },
            create: {
                endpoint,
                keys,
                userId
            }
        });

        res.status(201).json({ message: 'Subscribed successfully' });
    } catch (error) {
        wideLogger.add('err', { msg: 'Subscribe failed', error: (error as Error).message });
        res.status(500).json({ error: 'Failed to subscribe to notifications' });
    }
};

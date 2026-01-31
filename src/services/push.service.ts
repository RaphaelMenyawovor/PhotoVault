import webpush from '../configs/webpush.js';
import prisma from '../configs/prisma.js';
import { wideLogger } from '../utils/wideLogger.js';

interface NotificationPayload {
    title: string;
    body: string;
    url?: string;
    icon?: string;
}

export const sendNotification = async (userId: string, payload: NotificationPayload) => {
    try {
        const subscriptions = await prisma.pushSubscription.findMany({
            where: { userId }
        });

        if (subscriptions.length === 0) {
            return;
        }

        const notificationPayload = JSON.stringify(payload);

        const promises = subscriptions.map(async (sub) => {
            try {
                // Parse keys stored as JSON
                const keys = sub.keys as { p256dh: string; auth: string };

                const pushSubscription = {
                    endpoint: sub.endpoint,
                    keys: keys
                };

                await webpush.sendNotification(pushSubscription, notificationPayload);
            } catch (error: any) {
                // If 410 Gone, remove subscription
                if (error.statusCode === 410 || error.statusCode === 404) {
                    await prisma.pushSubscription.delete({ where: { id: sub.id } });
                    wideLogger.addCtx('push_sub_bloated', sub.id);
                } else {
                    wideLogger.add('err', { msg: 'Failed to send push', error: error.message, subId: sub.id });
                }
            }
        });

        await Promise.all(promises);
    } catch (error) {
        wideLogger.add('err', { msg: 'Push notification service error', error: (error as Error).message });
    }
};

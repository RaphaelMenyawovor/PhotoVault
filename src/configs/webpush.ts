import webpush from 'web-push';
import dotenv from 'dotenv';

dotenv.config();

const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:raphaelmenyawovor@gmail.com';

if (!publicVapidKey || !privateVapidKey) {
    console.error('VAPID keys are missing! Push notifications will not work.');
} else {
    webpush.setVapidDetails(
        vapidSubject,
        publicVapidKey,
        privateVapidKey
    );
}

export default webpush;

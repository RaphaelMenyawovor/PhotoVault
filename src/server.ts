import app from './app.js';
import "dotenv/config";
import prisma from './configs/prisma.js';
import redisClient from './configs/redis.js';
import { createServer } from 'http';

const PORT = process.env.PORT || 3000;

const server = createServer(app);

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

const gracefulShutdown = async () => {
    console.log('Received kill signal, shutting down gracefully');

    server.close(() => {
        console.log('Closed out remaining connections');
    });

    try {
        await prisma.$disconnect();
        console.log('Prisma disconnected');

        if (redisClient.isOpen) {
            await redisClient.quit();
            console.log('Redis disconnected');
        }

        process.exit(0);
    } catch (err) {
        console.error('Error during shutdown', err);
        process.exit(1);
    }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

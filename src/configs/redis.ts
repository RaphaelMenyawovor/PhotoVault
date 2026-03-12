import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

export type RedisClientType = ReturnType<typeof createClient>;

const envUrl = process.env.REDIS_URL;
let redisUrl = 'redis://localhost:6379';
if (envUrl && !envUrl.includes('placeholder')) {
    try {
        new URL(envUrl);
        redisUrl = envUrl;
    } catch {
        redisUrl = 'redis://localhost:6379';
    }
}
const isTls = redisUrl.startsWith('rediss://');

const config: Record<string, any> = { url: redisUrl };
if (isTls) {
  config.socket = { tls: true as const, rejectUnauthorized: false };
}

const redisClient = createClient(config);

redisClient.on('error', (err) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log('Redis Client Error', err);
  }
});

(async () => {
  if (process.env.NODE_ENV !== 'test') {
    try {
      await redisClient.connect();
      console.log('Redis Connected');
    } catch (err) {
      console.error('Redis Connection Failed', err);
    }
  }
})();

export default redisClient;

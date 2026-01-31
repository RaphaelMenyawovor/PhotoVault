import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

export type RedisClientType = ReturnType<typeof createClient>;

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

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

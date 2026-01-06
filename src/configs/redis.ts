import { createClient } from 'redis';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

export type RedisClientType = ReturnType<typeof createClient>;

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));

(async () => {
  try {
    await redisClient.connect();
    logger.info('Redis Connected');
  } catch (err) {
    logger.error('Redis Connection Failed', err);
  }
})();

export default redisClient;

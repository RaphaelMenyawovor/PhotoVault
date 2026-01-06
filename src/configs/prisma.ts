import { neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '../generated/prisma/client.js';
import "dotenv/config";
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

declare global {
  var prisma: PrismaClient | undefined
}

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaNeon({ connectionString });
const prisma = global.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV === 'development') global.prisma = prisma;

export default prisma;

import { Express } from 'express';

declare global {
    namespace Express {
        interface User {
            id: string; // Unify: JWT token has userId mapped to this, Prisma has id
            role: string;
            email?: string; // Prisma user has email
            googleId?: string | null;
            avatar?: string | null;
        }

        interface Request {
            user?: User;
        }
    }
}

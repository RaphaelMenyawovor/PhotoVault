import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes.js';
import photoRoutes from './routes/photo.routes.js';
import albumRoutes from './routes/album.routes.js';
import pushRoutes from './routes/push.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { limiter } from './middleware/limiter.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { wideLoggerMiddleware } from './middleware/wideLogger.middleware.js';

const app: Express = express();

// Initialize Passport
import './configs/passport.js';
import passport from 'passport';
app.use(passport.initialize());

// 1. Initialize Wide Logger FIRST
app.use(wideLoggerMiddleware);

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());

app.use(limiter);

app.use('/api/auth', authRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/albums', albumRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (_req: Request, res: Response) => {
    res.send('Photo Vault API is running');
});

app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
});

app.use(errorHandler);

export default app;

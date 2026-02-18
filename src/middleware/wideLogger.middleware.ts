import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { wideLogger, type WideLogContext } from '../utils/wideLogger.js';
import os from 'os';

export const wideLoggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime();

    // 1. Prepare Initial Context
    const initialContext: WideLogContext = {
        ts: new Date().toISOString(),
        sev: 'INFO',
        msg: 'http_request_finished', // Canonical name
        trace: {
            trace_id: uuidv4(),
            span_id: uuidv4(),
        },
        http: {
            method: req.method,
            route: req.path, // Will be updated to route pattern if available
            path: req.path,
            user_agent: req.headers['user-agent'] || '',
            ip: req.ip || '',
        },
        ctx: {},
        host: {
            name: os.hostname(),
            ver: process.env.npm_package_version || 'unknown',
        },
    };

    // 2. Initialize Storage Scope
    wideLogger.init(initialContext, () => {
        // Hook into response finish to emit the log
        res.on('finish', () => {
            const store = wideLogger.get();
            if (!store) return;

            // Calculate duration
            const diff = process.hrtime(start);
            const durationMs = (diff[0] * 1e9 + diff[1]) / 1e6;

            // Update HTTP Context
            store.http.status = res.statusCode;
            store.http.duration_ms = durationMs;

            // Attempt to get the matched route pattern (e.g., /api/users/:id)
            if (req.route) {
                store.http.route = req.baseUrl + req.route.path;
            }

            // Determine Severity
            if (res.statusCode >= 500) {
                store.sev = 'ERROR';
            } else if (res.statusCode >= 400) {
                store.sev = 'WARN';
            }

            // 3. EMIT THE LOG (JSON ONLY)
            process.stdout.write(JSON.stringify(store) + '\n');
        });

        next();
    });
};

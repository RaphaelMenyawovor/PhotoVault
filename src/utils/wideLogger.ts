import { AsyncLocalStorage } from 'async_hooks';

// Define the shape of our Wide Event
export interface WideLogContext {
    ts: string;
    sev: 'INFO' | 'ERROR' | 'WARN';
    msg: string;
    trace: {
        trace_id: string;
        span_id?: string;
        parent_id?: string;
    };
    http: {
        method: string;
        route: string;
        path: string;
        status?: number;
        duration_ms?: number;
        user_agent?: string;
        ip?: string;
    };
    user?: {
        id: string;
        role?: string;
        email?: string;
        [key: string]: unknown;
    };
    ctx: Record<string, unknown>;
    host: {
        name: string;
        region?: string;
        ver?: string;
    };
    err?: {
        code?: string;
        msg: string;
        stack?: string;
    };
}

const storage = new AsyncLocalStorage<WideLogContext>();

export const wideLogger = {
    // Initialize the context for a new request
    init: (context: WideLogContext, callback: () => void) => {
        storage.run(context, callback);
    },

    // Get the current context (safe)
    get: (): WideLogContext | undefined => {
        return storage.getStore();
    },

    // Add data to the request context
    add: (section: keyof WideLogContext, data: Record<string, unknown>) => {
        const store = storage.getStore();
        if (store) {
            if (section === 'ctx' || section === 'user' || section === 'err' || section === 'http' || section === 'trace') {
                // Merge objects
                (store[section] as Record<string, unknown>) = { ...(store[section] as Record<string, unknown>), ...data };
            } else {
                // Direct assignment for other fields
                (store as unknown as Record<string, unknown>)[section] = data;
            }
        }
    },

    // Helper to add to 'ctx' specifically (business context)
    addCtx: (key: string, value: unknown) => {
        const store = storage.getStore();
        if (store) {
            store.ctx[key] = value;
        }
    }
};

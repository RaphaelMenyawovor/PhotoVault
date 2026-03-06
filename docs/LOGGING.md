# Wide Event Logging Standard

This project implements a **Wide Event Logging** strategy. Instead of emitting multiple log lines per request (e.g., "Start", "Querying DB", "Found User", "End"), we emit a **single, high-cardinality JSON object** at the end of the request lifecycle.

This approach significantly reduces log volume while increasing observability, as every log entry contains the full context of the request.

---

## 🧠 The Philosophy: "One Request, One Log"

In traditional logging, context is fragmented. You might see an error log, but to know *which user* triggered it, you have to search for a preceding "User Request" log with the same ID.

With **Wide Events**:
1.  **Aggregation**: We accumulate context (Validation results, DB IDs, Errors, Timings) throughout the request.
2.  **Emission**: One rich JSON blob is written to `stdout` when the response is sent.
3.  **Searchability**: Every field (e.g., `user.id`, `http.status`, `ctx.albumId`) is queryable in log aggregators without complex joins.

---

## ⚙️ How It Works (Architecture)

We use Node.js's native `AsyncLocalStorage` to maintain request-scoped state without passing a logger instance to every function.

### The Lifecycle
1.  **Initialization**: The `wideLoggerMiddleware` works as the first barrier. It initializes a new empty "Context Store" for the incoming request, automatically populating:
    *   Trace ID (`uuid` or `x-request-id`)
    *   HTTP Method/Path
    *   Start Timestamp
2.  **Accumulation**: As code executes in Controllers or Services, developers can "dump" data into this thread-local store using `wideLogger.add()`.
    *   *Example*: `wideLogger.addCtx('photoId', '123')`
3.  **Completion**: When the response finishes (via `res.on('finish')`), the middleware calculates the duration and writes the final JSON object to `stdout`.

---

## 📝 Developer Guide

### How to Log

You do **not** use `console.log`. Instead, import `wideLogger` from ./utils/wideLogger and add context to the current request.

#### Basic Usage (Adding Business Context)
Use `addCtx` to add key-value pairs to the `ctx` object. This is for high-cardinality data specific to your business logic.

```typescript
import { wideLogger } from '../utils/wideLogger';

// ... inside a controller ...
const album = await prisma.album.create({ ... });

// LOG IT: Add the new ID to the request context
wideLogger.addCtx('albumId', album.id);
wideLogger.addCtx('photoCount', req.body.photos.length);
```

#### Logging Errors
The error handling middleware automatically captures errors. However, if you catch an error and handle it gracefully, you can still attach it to the log:

```typescript
try {
    // ... risky operation ...
} catch (error) {
    // Attach error details without crashing
    wideLogger.add('err', { 
        msg: 'Failed to resize image, using original',
        code: 'RESIZE_FAIL' 
    });
}
```

### Viewing Logs

#### 💻 Local Development
Raw JSON is hard to read. We use **`pino-pretty`** (configured in `package.json`) to pretty-print logs.

**Command**: `npm run dev`

**Output**:
```text
[14:30:00] INFO: GET /api/albums/123 completed in 45ms
    trace_id: "req-12345"
    user_id: "user-abc"
    status: 200
    albumId: "123"  <-- Your custom context
```

#### 🚀 Production
In production, we want pure machine-readable JSON. No setup is required; just run the app.

**Command**: `npm start`

**Output**:
```json
{"ts":"2023-10-27T10:00:00Z","sev":"INFO","msg":"Request completed","http":{"method":"GET","route":"/api/albums/:id","status":200,"duration_ms":45},"user":{"id":"user-abc"},"ctx":{"albumId":"123"},"trace":{"trace_id":"req-12345"}}
```

**Integration**:
This JSON format is automatically parsed by tools like:
*   **Datadog**
*   **AWS CloudWatch Logs**
*   **Grafana Loki**
*   **Honeycomb** (supports OpenTelemetry-compatible fields)

---

## ❓ FAQ

### Does this use OpenTelemetry?
**No**, not directly. It does not import `@opentelemetry/sdk` to keep the runtime lightweight. However, it is **OpenTelemetry-ready** because:
*   It uses standard naming conventions (e.g., `trace_id`, `span_id`, `http.method`).
*   The structured JSON output can be easily ingested by standard OTEL collectors.

### What if I need to log outside a request?
If you are in a background job or startup script (no request context), `wideLogger` checks for the store. If none exists, it falls back to a safe no-op or direct console output (depending on implementation), so your code won't crash.



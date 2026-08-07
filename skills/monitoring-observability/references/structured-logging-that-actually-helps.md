## Contents

- Structured Logging That Actually Helps
- The Pattern
- Express Middleware
- Log Levels That Actually Mean Something

## Structured Logging That Actually Helps

### The Pattern

**What ships to production must be structured (JSON), so a log pipeline can index and query it.** No `console.log("user signed up")` in app code. Locally, pretty-print for human eyes — but only at the *sink*, never by changing what the app emits: pipe through `pino-pretty` in dev (`node app.js | pino-pretty`) or set `transport: { target: 'pino-pretty' }` behind a `NODE_ENV !== 'production'` guard. The emitted log object stays identical; only rendering differs.

```typescript
// lib/logger.ts
import pino from 'pino';
import { trace, context } from '@opentelemetry/api';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level(label) {
      return { level: label };  // "info" not 30
    },
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
  // Stamp every line with the active trace/span so logs link to traces.
  // This is what the Loki `derivedFields` regex (`"trace_id":"(\w+)"`) and the
  // Tempo `tracesToLogsV2` link rely on — without it, trace↔log jumps are dead.
  mixin() {
    const span = trace.getSpan(context.active());
    if (!span) return {};
    const { traceId, spanId } = span.spanContext();
    return { trace_id: traceId, span_id: spanId };
  },
  // Add service metadata to every log
  base: {
    service: process.env.SERVICE_NAME || 'api',
    version: process.env.APP_VERSION || 'unknown',
    environment: process.env.NODE_ENV || 'development',
  },
});

// Request-scoped logger with correlation ID
export function createRequestLogger(requestId: string, userId?: string) {
  return logger.child({
    requestId,
    userId,
  });
}
```

### Express Middleware

```typescript
import { randomUUID } from 'crypto';
import { createRequestLogger } from './logger';

app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] as string || randomUUID();
  req.log = createRequestLogger(requestId, req.user?.id);
  res.setHeader('x-request-id', requestId);

  const start = performance.now();
  res.on('finish', () => {
    const duration = performance.now() - start;
    req.log.info({
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: Math.round(duration),
      contentLength: res.getHeader('content-length'),
    }, 'request completed');
  });

  next();
});
```

### Log Levels That Actually Mean Something

| Level | When to Use | Example |
|-------|-------------|---------|
| `fatal` | Process is about to crash | Uncaught exception, out of memory |
| `error` | Operation failed, needs attention | Payment processing failed, DB connection lost |
| `warn` | Something unexpected, but handled | Rate limit approaching, deprecated API called |
| `info` | Business events worth recording | User signed up, order placed, deploy completed |
| `debug` | Technical details for debugging | SQL queries, cache hit/miss, request/response bodies |
| `trace` | Extremely verbose, rarely enabled | Function entry/exit, variable values |

**Rule of thumb:** If you'd want to see it in production logs during an incident, it's `info`. If you'd only want it when actively debugging, it's `debug`.

**But logs are not your business-analytics pipeline.** High-volume, high-cardinality business events (every page view, every cache lookup, per-item loop iterations) should NOT be `info` logs — they blow up ingestion cost and bury signal. Instead:

- **Count them as metrics** (`Counter`/`Histogram`) — `signups_total`, `orders_total{status}` — and log only the exceptional cases.
- **Sample** routine successes if you must log them: log 1-in-N, or log the slow/failed tail only.
- Reserve `info` for events you'd actually read one-by-one during an incident (deploys, config changes, a payment that failed). A useful budget: an idle service should emit roughly *zero* `info` lines per second.

---

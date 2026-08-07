## Contents

- Logging
- Structured Logging (pino)
- Log Levels
- Request ID Tracing
- Centralized Log Aggregation

## Logging

### Structured Logging (pino)

```typescript
// src/lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  formatters: {
    level: (label) => ({ level: label }), // "info" not 30
  },
  ...(process.env.NODE_ENV === 'development' && {
    transport: { target: 'pino-pretty' },
  }),
});

// Usage with context
export function createRequestLogger(requestId: string) {
  return logger.child({ requestId });
}
```

### Log Levels

| Level | Use for | Example |
|-------|---------|---------|
| `error` | Failures needing attention | Payment failed, DB connection lost |
| `warn` | Degraded but functional | Rate limit approaching, slow query |
| `info` | Business events | User signed up, subscription created |
| `debug` | Development diagnostics | Query params, cache hit/miss |

### Request ID Tracing

```typescript
// middleware.ts — inject request ID
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export function middleware(request: Request) {
  const requestId = randomUUID();
  const headers = new Headers(request.headers);
  headers.set('x-request-id', requestId);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('x-request-id', requestId);
  return response;
}
```

### Centralized Log Aggregation

| Service | Pino transport | Notes |
|---------|---------------|-------|
| **Axiom** | `@axiomhq/pino` | Generous free/ingest tier; verify current quota at axiom.co/pricing |
| **Datadog** | `pino-datadog-transport` | Priced per ingested GB + retention; verify at datadoghq.com/pricing |
| **BetterStack** | `@logtail/pino` | Free tier exists; verify current GB/retention at betterstack.com |
| **Grafana Loki** (self-host) | `pino-loki` | Open-source, no per-GB vendor cost; you run storage |

> Free-tier sizes and pricing change frequently — figures verified as of Jun 2026 only directionally. **Always confirm current quotas on the vendor's pricing page** before committing; don't hardcode a GB limit into your runbook.

```typescript
// Production transport example (Axiom). Token comes from env — never commit it.
import pino from 'pino';
const transport = pino.transport({
  target: '@axiomhq/pino',
  options: { dataset: 'my-app', token: process.env.AXIOM_TOKEN }, // e.g. AXIOM_TOKEN=<your-token>
});
export const logger = pino(transport);
```

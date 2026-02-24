---
name: testing-strategy
description: Testing pyramid, framework selection, mocking patterns, CI integration, and flaky test management for production codebases.
---

# Testing Strategy

## Testing Pyramid

| Layer | Ratio | Speed | Confidence | Tools |
|-------|-------|-------|------------|-------|
| Unit | 70% | <10ms each | Low-medium | Vitest, Jest |
| Integration | 20% | <1s each | Medium-high | Vitest, Supertest, Testcontainers |
| E2E | 10% | <30s each | High | Playwright, Cypress |

**Key principle:** Push tests down the pyramid. If you can test it as a unit, don't write an integration test for it.

## Framework Selection

| Framework | Best for | Watch mode | ESM | Speed |
|-----------|----------|------------|-----|-------|
| **Vitest** | Vite/modern projects | ✅ native | ✅ | Fastest |
| **Jest** | Legacy/React projects | ✅ | ⚠️ config | Fast |
| **Playwright** | E2E, cross-browser | N/A | ✅ | Medium |
| **Cypress** | E2E, component testing | ✅ | ⚠️ | Slower |

**Default recommendation:** Vitest for unit/integration, Playwright for E2E.

## TDD Workflow

```
1. RED    → Write failing test that defines desired behavior
2. GREEN  → Write minimum code to pass
3. REFACTOR → Clean up, tests stay green
```

```typescript
// 1. RED
test('calculates tax for US orders', () => {
  expect(calculateTax({ subtotal: 100, region: 'US-CA' })).toBe(7.25);
});

// 2. GREEN — implement calculateTax
// 3. REFACTOR — extract tax rate lookup table
```

## Mocking Patterns

```typescript
// ✅ Dependency injection (preferred)
function createOrderService(paymentGateway: PaymentGateway) {
  return { checkout: async (order) => paymentGateway.charge(order.total) };
}
test('charges payment', async () => {
  const mockGateway = { charge: vi.fn().mockResolvedValue({ success: true }) };
  const service = createOrderService(mockGateway);
  await service.checkout({ total: 50 });
  expect(mockGateway.charge).toHaveBeenCalledWith(50);
});

// ⚠️ Module mocking (use sparingly)
vi.mock('./payment', () => ({ charge: vi.fn() }));

// ❌ Avoid: mocking what you don't own (mock adapters instead)
```

**Mock hierarchy:** Spies → Stubs → Fakes → Full mocks. Use the lightest option.

## Test Fixtures & Factories

```typescript
// Factory pattern with overrides
function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: crypto.randomUUID(),
    email: `user-${Date.now()}@test.com`,
    name: 'Test User',
    role: 'member',
    ...overrides,
  };
}

// Database factory (integration tests)
async function createUser(db: DB, overrides: Partial<User> = {}) {
  const user = buildUser(overrides);
  await db.insert(users).values(user);
  return user;
}

test('admin can delete posts', async () => {
  const admin = await createUser(db, { role: 'admin' });
  const post = await createPost(db, { authorId: admin.id });
  // ...
});
```

## Coverage Targets

| Metric | Target | Enforcement |
|--------|--------|-------------|
| Line | ≥80% | CI gate |
| Branch | ≥75% | CI gate |
| Critical paths | 100% | Code review |
| New code | ≥90% | PR diff check |

```json
// vitest.config.ts
{ test: { coverage: {
  provider: 'v8',
  thresholds: { lines: 80, branches: 75, functions: 80 },
  exclude: ['**/*.test.ts', '**/types/**', '**/migrations/**']
}}}
```

## CI Integration

```yaml
# .github/workflows/test.yml
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: test }
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test -- --reporter=junit --outputFile=results.xml
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with: { name: playwright-report, path: playwright-report/ }
```

## API Testing

```typescript
import { describe, test, expect } from 'vitest';
import app from '../src/app';
import supertest from 'supertest';

const request = supertest(app);

test('POST /api/users returns 201', async () => {
  const res = await request.post('/api/users')
    .send({ email: 'new@test.com', name: 'New' })
    .expect(201);
  expect(res.body).toHaveProperty('id');
});
```

## Load Testing

```javascript
// k6 script: load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // ramp up
    { duration: '3m', target: 50 },   // sustained
    { duration: '1m', target: 0 },    // ramp down
  ],
  thresholds: { http_req_duration: ['p(95)<500'] },
};

export default function () {
  const res = http.get('https://api.example.com/health');
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}
// Run: k6 run load-test.js
```

## Flaky Test Management

1. **Quarantine:** Tag flaky tests with `test.skip` + tracking issue
2. **Retry in CI:** `--retry=2` (Playwright) — max 2 retries, fix root cause within a sprint
3. **Common causes:** Shared mutable state, timing/race conditions, external dependencies, date/time
4. **Fix patterns:** Isolate state per test, use `waitFor` not `sleep`, mock external calls, freeze time

```typescript
// Freeze time to eliminate date flakiness
vi.useFakeTimers();
vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
afterEach(() => vi.useRealTimers());
```

## Mutation Testing

Validates test quality by introducing code mutations and checking if tests catch them.

```bash
# Stryker for JS/TS
npx stryker run
# Target: >80% mutation score on critical modules
```

## References

See `references/` for CI templates, factory patterns, and load testing scenarios.

## Error Monitoring (Production)

### Sentry Setup (Next.js)

```bash
npx @sentry/wizard@latest -i nextjs
# Automatically configures: sentry.client.config.ts, sentry.server.config.ts,
# sentry.edge.config.ts, instrumentation.ts, next.config.js wrapper
```

**Source maps:** The wizard configures `@sentry/nextjs` to upload source maps during build. Verify with:
```bash
npx sentry-cli sourcemaps list --org=YOUR_ORG --project=YOUR_PROJECT
```

**Error grouping:** Sentry groups by stack trace by default. Customize with fingerprints:
```typescript
Sentry.captureException(error, { fingerprint: ['checkout-flow', error.code] });
```

**Alert rules (configure in Sentry dashboard):**

| Rule | Condition | Action |
|------|-----------|--------|
| New issue spike | >10 events in 5 min | Slack + PagerDuty |
| Regression | Resolved issue recurs | Slack + email |
| Error rate | >1% of transactions | PagerDuty |
| Performance | p95 > 2s | Slack |

**Performance monitoring:** Enabled by default with `tracesSampleRate`. Start at `0.1` (10%) in production, increase if needed:
```typescript
Sentry.init({ dsn: '...', tracesSampleRate: 0.1, profilesSampleRate: 0.1 });
```

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

| Service | Pino transport | Free tier |
|---------|---------------|-----------|
| **Axiom** | `@axiomhq/pino` | 500GB/mo ingest |
| **Datadog** | `pino-datadog-transport` | 14-day trial |
| **BetterStack** | `@logtail/pino` | 1GB/mo |

```typescript
// Production transport example (Axiom)
import pino from 'pino';
const transport = pino.transport({
  target: '@axiomhq/pino',
  options: { dataset: 'my-app', token: process.env.AXIOM_TOKEN },
});
export const logger = pino(transport);
```

## Observability Checklist

### Must-Have (Day 1)
- [ ] Error tracking (Sentry) with source maps and alerting
- [ ] Structured logging with request ID tracing
- [ ] Uptime monitoring (BetterStack, UptimeRobot) — check `/api/health` every 60s
- [ ] Basic performance monitoring (Sentry or Vercel Analytics)

### Should-Have (Week 2)
- [ ] Centralized log aggregation (Axiom/Datadog)
- [ ] Performance budgets: LCP < 2.5s, FID < 100ms, CLS < 0.1
- [ ] Database query monitoring (slow query log, connection pool alerts)
- [ ] Custom business metric dashboards (signup rate, activation, errors by endpoint)

### Nice-to-Have (Month 2+)
- [ ] Distributed tracing across services
- [ ] Alerting thresholds with escalation (warn → page)
- [ ] On-call rotation (PagerDuty/Opsgenie): primary + secondary, 1-week rotations
- [ ] Runbooks for common incidents (DB down, spike in errors, payment webhook failures)
- [ ] SLO tracking (99.9% uptime = 8.7h downtime/year budget)

### Health Endpoint

```typescript
// app/api/health/route.ts
import { db } from '@/lib/db';
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: 'ok', db: 'connected' });
  } catch {
    return Response.json({ status: 'degraded', db: 'disconnected' }, { status: 503 });
  }
}
```

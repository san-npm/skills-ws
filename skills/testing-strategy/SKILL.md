---
name: testing-strategy
description: "Testing pyramid, framework selection, mocking patterns, CI integration, flaky test management, visual regression, contract testing, mutation testing, and performance testing for production codebases."
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


## Visual Regression Testing

### Playwright Screenshot Comparisons

```typescript
// playwright.config.ts
export default defineConfig({
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01, // allow 1% pixel diff
      threshold: 0.2,          // per-pixel color threshold (0-1)
      animations: 'disabled',  // freeze animations
    },
  },
});

// tests/visual.spec.ts
test('homepage visual regression', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot('homepage.png', {
    fullPage: true,
    mask: [page.locator('.dynamic-timestamp')], // mask flaky elements
  });
});

// Component-level screenshot
test('pricing card renders correctly', async ({ page }) => {
  await page.goto('/pricing');
  const card = page.locator('[data-testid="pro-plan"]');
  await expect(card).toHaveScreenshot('pro-plan-card.png');
});
```

```bash
# Update baselines after intentional changes
npx playwright test --update-snapshots
# Run only visual tests
npx playwright test tests/visual/
```

### Percy Integration (Cross-Browser Visual Testing)

```typescript
// Install: npm i -D @percy/cli @percy/playwright
import { percySnapshot } from '@percy/playwright';

test('checkout flow visual', async ({ page }) => {
  await page.goto('/checkout');
  await page.fill('#email', 'test@example.com');
  await percySnapshot(page, 'Checkout - Email Filled', {
    widths: [375, 768, 1280], // test responsive breakpoints
    minHeight: 1024,
  });
});
```

```yaml
# CI: Percy runs
- run: npx percy exec -- npx playwright test tests/visual/
  env:
    PERCY_TOKEN: ${{ secrets.PERCY_TOKEN }}
```

### Chromatic (Storybook Visual Testing)

```bash
npm i -D chromatic
npx chromatic --project-token=<token>
# CI: runs on every push, compares against baseline branch
```

### Threshold Tuning Rules

| Scenario | maxDiffPixelRatio | threshold | Notes |
|----------|-------------------|-----------|-------|
| Pixel-perfect UI | 0.001 | 0.1 | Tight — catches font rendering diffs |
| General pages | 0.01 | 0.2 | Balanced default |
| Data-heavy pages | 0.05 | 0.3 | Loose — dynamic content |

**Tip:** Mask timestamps, avatars, and animated elements. Use `animations: 'disabled'` globally.

## Contract Testing

### Pact for Microservices

Consumer-driven contracts: the consumer defines what it needs, the provider verifies it can deliver.

```typescript
// consumer.pact.spec.ts — consumer side
import { PactV4, MatchersV3 } from '@pact-foundation/pact';
const { like, eachLike, string } = MatchersV3;

const provider = new PactV4({
  consumer: 'OrderService',
  provider: 'UserService',
});

test('get user by ID', async () => {
  await provider
    .addInteraction()
    .given('user 123 exists')
    .uponReceiving('a request for user 123')
    .withRequest('GET', '/api/users/123')
    .willRespondWith(200, (builder) => {
      builder
        .headers({ 'Content-Type': 'application/json' })
        .jsonBody({
          id: like(123),
          email: string('user@example.com'),
          orders: eachLike({ id: like(1), total: like(99.99) }),
        });
    })
    .executeTest(async (mockServer) => {
      const client = new UserClient(mockServer.url);
      const user = await client.getUser(123);
      expect(user.email).toBeDefined();
      expect(user.orders.length).toBeGreaterThan(0);
    });
});
```

### Provider Verification

```typescript
// provider.pact.spec.ts — provider side
import { Verifier } from '@pact-foundation/pact';

test('UserService satisfies OrderService contract', async () => {
  await new Verifier({
    providerBaseUrl: 'http://localhost:3001',
    pactBrokerUrl: process.env.PACT_BROKER_URL,
    provider: 'UserService',
    providerVersion: process.env.GIT_SHA,
    publishVerificationResult: true,
    stateHandlers: {
      'user 123 exists': async () => {
        await db.insert(users).values({ id: 123, email: 'user@example.com' });
      },
    },
  }).verifyProvider();
});
```

```bash
# Publish pacts to broker
npx pact-broker publish ./pacts --consumer-app-version=$GIT_SHA --broker-base-url=$PACT_BROKER_URL
# can-i-deploy check before releasing
npx pact-broker can-i-deploy --pacticipant=UserService --version=$GIT_SHA --to-environment=production
```

## Test Data Management

### Factories with Fishery

```typescript
// factories/user.factory.ts
import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';

type User = { id: string; email: string; name: string; role: 'admin' | 'member'; createdAt: Date };

export const userFactory = Factory.define<User>(({ sequence, params }) => ({
  id: `user-${sequence}`,
  email: params.email ?? faker.internet.email(),
  name: faker.person.fullName(),
  role: 'member',
  createdAt: new Date('2026-01-01'),
}));

// Traits via transient params
export const adminFactory = userFactory.params({ role: 'admin' as const });

// Usage
const user = userFactory.build();                    // in-memory
const admin = adminFactory.build({ name: 'Boss' });  // override
const users = userFactory.buildList(5);               // batch
```

### Database Factories (Integration Tests)

```typescript
// factories/db-user.factory.ts
import { userFactory } from './user.factory';

export async function createUser(db: DB, overrides: Partial<User> = {}) {
  const data = userFactory.build(overrides);
  const [user] = await db.insert(users).values(data).returning();
  return user;
}

// Composable: create user with related data
export async function createUserWithPosts(db: DB, postCount = 3) {
  const user = await createUser(db);
  const posts = await Promise.all(
    Array.from({ length: postCount }, () =>
      createPost(db, { authorId: user.id })
    )
  );
  return { user, posts };
}
```

### Test Isolation Strategies

| Strategy | Speed | Isolation | Use when |
|----------|-------|-----------|----------|
| Transaction rollback | Fastest | Per-test | Unit/integration with single DB |
| Truncate tables | Fast | Per-suite | Multiple connections needed |
| Separate DB per worker | Slowest | Perfect | Parallel CI with migrations |

```typescript
// Transaction rollback pattern (Vitest + Drizzle)
import { beforeEach, afterEach } from 'vitest';

let tx: Transaction;
beforeEach(async () => {
  tx = await db.transaction();
  // Pass tx instead of db to all queries in test
});
afterEach(async () => {
  await tx.rollback();
});

// Truncate pattern
afterEach(async () => {
  await db.execute(sql`TRUNCATE users, posts, comments RESTART IDENTITY CASCADE`);
});
```

### Seeding Strategies

```typescript
// seed.ts — deterministic seed for dev/test
export async function seed(db: DB) {
  const admin = await createUser(db, { email: 'admin@test.com', role: 'admin' });
  const users = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      createUser(db, { email: `user${i}@test.com` })
    )
  );
  // Create realistic related data
  for (const user of users) {
    await createUserWithPosts(db, faker.number.int({ min: 1, max: 5 }));
  }
}
// Run: npx tsx src/db/seed.ts
```

## Snapshot Testing

### When to Use

✅ **Good for:** Serialized component output, API response shapes, config file generation, error messages
❌ **Avoid for:** Large/frequently changing outputs, CSS (use visual regression instead), implementation details

### Best Practices

```typescript
// ✅ Inline snapshots for small, focused assertions
test('formats user display name', () => {
  expect(formatDisplayName({ first: 'Jane', last: 'Doe' }))
    .toMatchInlineSnapshot(`"Jane Doe"`);
});

// ✅ Named snapshots for component output
test('renders error state', () => {
  const { container } = render(<Alert type="error" message="Failed" />);
  expect(container).toMatchSnapshot('alert-error');
});

// ❌ Avoid: massive snapshots that nobody reviews
test('renders entire page', () => {
  expect(render(<DashboardPage />).container).toMatchSnapshot(); // 500+ lines nobody reads
});
```

### Snapshot Hygiene

```bash
# Update snapshots after intentional changes
npx vitest --update
npx jest --updateSnapshot

# CI: fail on obsolete snapshots
npx jest --ci  # --ci flag makes Jest fail on new snapshots (must be committed)
```

```typescript
// Keep snapshots small — use property matchers
test('creates user with generated fields', () => {
  expect(createUser({ name: 'Test' })).toMatchSnapshot({
    id: expect.any(String),
    createdAt: expect.any(Date),
  });
});
```

**Rule:** If a snapshot is >50 lines, break the test into smaller assertions or use inline snapshots.

## CI Test Parallelization

### Jest Sharding

```bash
# Split across N shards (built-in since Jest 28)
npx jest --shard=1/4  # run shard 1 of 4
npx jest --shard=2/4
npx jest --shard=3/4
npx jest --shard=4/4
```

### Playwright Sharding

```bash
npx playwright test --shard=1/4
npx playwright test --shard=2/4
```

### GitHub Actions Matrix

```yaml
# .github/workflows/test.yml
jobs:
  test:
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm vitest --shard=${{ matrix.shard }}/4
      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage-${{ matrix.shard }}
          path: coverage/

  merge-coverage:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with: { pattern: coverage-*, merge-multiple: true, path: coverage/ }
      - run: npx nyc merge coverage/ merged-coverage.json
      - run: npx nyc report --reporter=text --temp-dir=coverage/
```

### Playwright Sharding with Blob Reports

```yaml
jobs:
  e2e:
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - run: npx playwright test --shard=${{ matrix.shard }}/4
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: blob-report-${{ matrix.shard }}
          path: blob-report/

  merge-reports:
    needs: e2e
    if: always()
    steps:
      - uses: actions/download-artifact@v4
        with: { pattern: blob-report-*, merge-multiple: true, path: all-blob-reports/ }
      - run: npx playwright merge-reports --reporter=html all-blob-reports/
```

### Split by Timing (Faster Shards)

```bash
# Use jest-junit to export timing, then split:
npx jest --shard=1/4 --json --outputFile=timing.json
# Or use Knapsack Pro / split-tests for optimal distribution
npm i -D @split-tests/jest
npx split-tests --junit-xml=results.xml --node-index=0 --node-total=4 | xargs npx jest
```

## Mutation Testing

### Stryker Setup

```bash
npm i -D @stryker-mutator/core @stryker-mutator/vitest-runner
npx stryker init  # generates stryker.config.mjs
```

```javascript
// stryker.config.mjs
export default {
  testRunner: 'vitest',
  mutate: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.d.ts',
    '!src/types/**',
  ],
  reporters: ['html', 'clear-text', 'progress'],
  thresholds: { high: 80, low: 60, break: 50 }, // fail CI below 50%
  concurrency: 4,
  timeoutMS: 10000,
};
```

```bash
npx stryker run
# Output: mutation score, surviving mutants, killed mutants
```

### Interpreting Mutation Scores

| Score | Quality | Action |
|-------|---------|--------|
| >80% | Excellent | Maintain — tests are thorough |
| 60-80% | Good | Review surviving mutants in critical paths |
| <60% | Weak | Tests miss significant logic branches |

### Which Mutants Matter

**Focus on:**
- Surviving mutants in business logic (pricing, auth, validation)
- Boundary condition mutants (`>` → `>=`, off-by-one)
- Removed conditional mutants (entire if-block deleted, tests pass)

**Ignore:**
- Logging/telemetry mutations
- UI text mutations (test with visual regression instead)
- Timeout value mutations

```typescript
// Example: this surviving mutant means your test doesn't check the boundary
// Original:  if (age >= 18) grantAccess();
// Mutant:    if (age > 18) grantAccess();   // ← survives? Add test for age=18
test('grants access at exactly 18', () => {
  expect(grantAccess(18)).toBe(true);  // kills the mutant
});
```

## API Testing Patterns

### Supertest (Express/Fastify)

```typescript
import supertest from 'supertest';
import { app } from '../src/app';

const request = supertest(app);

describe('POST /api/orders', () => {
  test('creates order with valid data', async () => {
    const res = await request
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ sku: 'ABC', qty: 2 }], shipping: 'express' })
      .expect(201);

    expect(res.body).toMatchObject({
      id: expect.any(String),
      status: 'pending',
      items: expect.arrayContaining([
        expect.objectContaining({ sku: 'ABC', qty: 2 }),
      ]),
    });
  });

  test('rejects invalid payload', async () => {
    await request
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [] })  // empty items
      .expect(422);
  });

  test('requires authentication', async () => {
    await request.post('/api/orders').send({ items: [{ sku: 'X', qty: 1 }] }).expect(401);
  });
});
```

### Playwright API Testing

```typescript
// playwright.config.ts — API project (no browser needed)
export default defineConfig({
  projects: [
    {
      name: 'api',
      testMatch: /.*\.api\.spec\.ts/,
      use: { baseURL: 'http://localhost:3000' },
    },
  ],
});

// tests/orders.api.spec.ts
import { test, expect } from '@playwright/test';

test('full order lifecycle', async ({ request }) => {
  // Create
  const create = await request.post('/api/orders', {
    data: { items: [{ sku: 'ABC', qty: 1 }] },
    headers: { Authorization: `Bearer ${process.env.TEST_TOKEN}` },
  });
  expect(create.ok()).toBeTruthy();
  const { id } = await create.json();

  // Read
  const get = await request.get(`/api/orders/${id}`);
  expect(get.ok()).toBeTruthy();
  expect(await get.json()).toMatchObject({ id, status: 'pending' });

  // Update
  const update = await request.patch(`/api/orders/${id}`, {
    data: { status: 'confirmed' },
    headers: { Authorization: `Bearer ${process.env.TEST_TOKEN}` },
  });
  expect(update.ok()).toBeTruthy();

  // Delete
  const del = await request.delete(`/api/orders/${id}`, {
    headers: { Authorization: `Bearer ${process.env.TEST_TOKEN}` },
  });
  expect(del.status()).toBe(204);
});
```

### API Contract Validation (Zod)

```typescript
import { z } from 'zod';

const OrderResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['pending', 'confirmed', 'shipped', 'delivered']),
  items: z.array(z.object({ sku: z.string(), qty: z.number().positive() })),
  total: z.number().nonnegative(),
  createdAt: z.string().datetime(),
});

test('GET /api/orders/:id matches contract', async () => {
  const res = await request.get(`/api/orders/${orderId}`).expect(200);
  const parsed = OrderResponseSchema.safeParse(res.body);
  expect(parsed.success).toBe(true);
  if (!parsed.success) console.error(parsed.error.issues); // helpful debug
});
```

## Performance Testing

### k6 Load Testing

```javascript
// load-test.js — staged ramp with SLOs
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const orderDuration = new Trend('order_create_duration');

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // ramp to 50 VUs
    { duration: '5m', target: 50 },   // sustained load
    { duration: '2m', target: 200 },  // spike test
    { duration: '5m', target: 200 },  // sustained spike
    { duration: '2m', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1500'],  // SLO: p95 < 500ms
    errors: ['rate<0.01'],                             // SLO: <1% error rate
    order_create_duration: ['p(95)<800'],              // custom metric SLO
  },
};

export default function () {
  group('API Health', () => {
    const health = http.get('http://localhost:3000/api/health');
    check(health, { 'health 200': (r) => r.status === 200 });
  });

  group('Create Order', () => {
    const payload = JSON.stringify({
      items: [{ sku: 'LOAD-TEST', qty: 1 }],
    });
    const res = http.post('http://localhost:3000/api/orders', payload, {
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
    });
    orderDuration.add(res.timings.duration);
    errorRate.add(res.status !== 201);
    check(res, {
      'order created': (r) => r.status === 201,
      'has order id': (r) => JSON.parse(r.body).id !== undefined,
    });
  });

  sleep(1);
}
```

```bash
# Run locally
k6 run load-test.js
# Run with cloud output
k6 run --out cloud load-test.js
# Run with specific VUs (override stages)
k6 run --vus 100 --duration 5m load-test.js
```

### Artillery Configuration

```yaml
# artillery.yml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 120
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"
    - duration: 120
      arrivalRate: 100
      name: "Spike"
  plugins:
    ensure: {}
  ensure:
    thresholds:
      - http.response_time.p95: 500
      - http.response_time.p99: 1500

scenarios:
  - name: "Browse and order"
    flow:
      - get:
          url: "/api/products"
          capture:
            - json: "$[0].id"
              as: "productId"
      - think: 2
      - post:
          url: "/api/orders"
          json:
            items:
              - sku: "{{ productId }}"
                qty: 1
          expect:
            - statusCode: 201
```

```bash
npx artillery run artillery.yml
npx artillery run --output report.json artillery.yml
npx artillery report report.json  # generates HTML report
```

### Setting SLOs (Service Level Objectives)

| Metric | Target | Measurement | Alert |
|--------|--------|-------------|-------|
| Availability | 99.9% (8.7h/year downtime) | Uptime monitor | Page on breach |
| Latency p50 | <100ms | APM / k6 | Warn at 150ms |
| Latency p95 | <500ms | APM / k6 | Alert at 750ms |
| Latency p99 | <1500ms | APM / k6 | Page at 2000ms |
| Error rate | <0.1% | Error tracking | Alert at 0.5% |
| Throughput | >1000 rps | Load test baseline | Warn at 800 rps |

```javascript
// k6 thresholds as SLO enforcement
export const options = {
  thresholds: {
    http_req_duration: [
      { threshold: 'p(50)<100', abortOnFail: false },
      { threshold: 'p(95)<500', abortOnFail: true },   // hard SLO
      { threshold: 'p(99)<1500', abortOnFail: true },
    ],
    http_req_failed: [
      { threshold: 'rate<0.001', abortOnFail: true },   // 99.9% success
    ],
  },
};
```

**Performance testing cadence:**
- **Pre-release:** Full staged load test against staging
- **Weekly:** Smoke test (low load, verify SLOs still hold)
- **Post-incident:** Reproduce load conditions that caused the incident

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


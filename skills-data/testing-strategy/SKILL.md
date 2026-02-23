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

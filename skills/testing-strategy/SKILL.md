---
name: testing-strategy
description: "Test strategy for production codebases: testing pyramid, framework choice, mocking, factories, DB isolation per ORM, coverage gates, CI sharding, flaky-test triage, visual/contract/mutation testing, performance/SLOs, observability. Use when designing or auditing a test strategy, setting coverage/CI gates, fixing flaky tests, or reviewing AI-generated tests."
---

# Testing Strategy

## Testing Pyramid

| Layer | Ratio | Speed | Confidence | Tools |
|-------|-------|-------|------------|-------|
| Unit | 70% | <10ms each | Low-medium | Vitest, Jest |
| Integration | 20% | <1s each | Medium-high | Vitest, Supertest, Testcontainers |
| E2E | 10% | <30s each | High | Playwright, Cypress |

**Key principle (risk-based, not absolute):** Push tests down the pyramid *for logic mocks can fully validate* — pure functions, branching, edge cases. But unit-testability does **not** remove the need for higher tiers. Always add a test where mocks can lie:

- **Integration** for anything that crosses a boundary (DB, queue, cache, external API) — the place where serialization, transactions, and contracts actually break.
- **Contract** between services you deploy independently (see Contract Testing below) so a unit-green provider can't silently break a consumer.
- **E2E** for critical user workflows (signup, checkout, payment, auth) where the cost of a regression is high — a few deep E2E flows beat hundreds of shallow ones.

Rule of thumb: choose the *lowest tier that can fail the way production fails*. A unit test of a SQL query string proves nothing about whether the query runs; an integration test against a real Postgres (Testcontainers) does.

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

Coverage is a *floor and a smoke alarm*, not a goal. High line coverage with weak assertions is **coverage theater** — code executes but nothing is verified. Calibrate per repo and pair coverage with mutation score (see Mutation Testing) to measure whether tests actually assert behavior.

| Metric | Starting target | Enforcement | Notes |
|--------|-----------------|-------------|-------|
| Line | ≥80% | CI gate | Per-repo; mature services often sit 85–90%, early prototypes lower |
| Branch | ≥75% | CI gate | Branch > line as a quality signal |
| Critical paths (auth, payments, pricing) | 100% | Code review + explicit test | Don't average these away |
| New/changed code | ≥90% | PR diff coverage (Codecov/Coveralls patch %) | Gate the diff, not the whole repo — avoids "ratchet" pain |

**Calibration rules**
- **Don't ratchet a legacy repo to 80% overnight.** Gate *diff coverage* on new code; let total coverage drift up over time.
- **Exclude generated/boilerplate** from the denominator: migrations, codegen output (`*.gen.ts`), type-only files, barrel `index.ts`, framework scaffolding.
- **Risk-based exceptions** are fine when documented: a thin adapter with a fully covered contract test may not need 90% line coverage of glue code. Record the exception in the PR.
- **A coverage gate alone proves nothing.** Add a mutation-score check on critical modules to catch assertion-free tests.

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      // 'v8' = fast, native, line/branch from V8 (default in Vitest 1.x+).
      // 'istanbul' = slower but more precise branch/statement attribution
      // and emits coverage-final.json that merges cleanly across shards.
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'lcov'], // lcov for Codecov; json for merging
      thresholds: { lines: 80, branches: 75, functions: 80, statements: 80 },
      exclude: [
        '**/*.test.ts',
        '**/*.config.ts',
        '**/*.d.ts',
        '**/types/**',
        '**/migrations/**',
        '**/*.gen.ts',
      ],
    },
  },
});
```

## CI Integration

```yaml
# .github/workflows/test.yml
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        # Pin to the SAME major you run in production so tests catch
        # version-specific SQL/index behavior. Postgres 18 is the current GA major
        # (since Sept 2025) and 17 stays supported into 2029: match prod, don't chase latest.
        image: postgres:17
        env: { POSTGRES_PASSWORD: test }
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4   # installs pnpm (reads version from packageManager)
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test -- --reporter=junit --outputFile=results.xml
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with: { name: playwright-report, path: playwright-report/ }
```

For API testing see API Testing Patterns below; for load testing see Performance Testing below.

## Flaky Test Management

1. **Quarantine:** Tag flaky tests with `test.skip` + tracking issue
2. **Retry in CI:** `--retries=2` (Playwright), max 2 retries, fix root cause within a sprint
3. **Common causes:** Shared mutable state, timing/race conditions, external dependencies, date/time
4. **Fix patterns:** Isolate state per test, use `waitFor` not `sleep`, mock external calls, freeze time

```typescript
// Freeze time to eliminate date flakiness
vi.useFakeTimers();
vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
afterEach(() => vi.useRealTimers());
```

## Visual Regression Testing

### Playwright Screenshot Comparisons

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

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
  // readiness via web-first assertion, not waitForLoadState('networkidle') (discouraged for tests)
  await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
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
# Token from the CI secret store, never committed:
npx chromatic --project-token="$CHROMATIC_PROJECT_TOKEN"
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

> **Version-sensitive.** The `PactV4`/`MatchersV3` API below targets `@pact-foundation/pact` v12-v17. Pin the version (`npm i -D @pact-foundation/pact@^17`, requires Node 22+; use `@^15` on older Node) and check the [pact-js docs](https://github.com/pact-foundation/pact-js) before copying: the builder API has changed across majors (older code used `Pact`/`Matchers` and an `.addInteraction({...})` object form). If versions don't match, the `.withRequest(method, path)` and callback-`builder` signatures will differ.

```typescript
// consumer.pact.spec.ts — consumer side (@pact-foundation/pact v12+)
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
| Transaction rollback | Fastest | Per-test | Single connection, ORM supports nested/abortable tx |
| Truncate tables | Fast | Per-suite/test | Multiple connections, or rollback not viable |
| Separate DB / schema per worker | Slower | Perfect | Parallel CI with migrations, full realism |

> **Gotcha:** Most ORMs (Drizzle, Prisma) run transactions in a **callback scope** and roll back by *throwing* — you cannot hold a `tx` handle open across `beforeEach`/`afterEach` and call `tx.rollback()` later. Use the per-ORM patterns below. Transaction rollback also can't catch bugs in code that *commits its own transaction* — for those, truncate or a per-worker DB.

**Drizzle — abort via thrown sentinel inside the callback**

Drizzle's `db.transaction(cb)` only rolls back if the callback throws (or you call `tx.rollback()`, which itself throws to unwind). Wrap each test body in a transaction and throw a sentinel to discard:

```typescript
// test-tx.ts
import { db } from '@/lib/db';

const ROLLBACK = Symbol('rollback');

/** Runs `fn` against a transaction `tx`, then always rolls back. */
export async function withRollback(fn: (tx: typeof db) => Promise<void>) {
  try {
    await db.transaction(async (tx) => {
      await fn(tx as unknown as typeof db);
      throw ROLLBACK; // discard everything written in this test
    });
  } catch (e) {
    if (e !== ROLLBACK) throw e; // re-throw real errors
  }
}

// usage — pass `tx` to every query the code-under-test runs
test('admin can delete posts', async () => {
  await withRollback(async (tx) => {
    const admin = await createUser(tx, { role: 'admin' });
    const post = await createPost(tx, { authorId: admin.id });
    await deletePost(tx, post.id);
    expect(await findPost(tx, post.id)).toBeUndefined();
  });
});
```

**Prisma — interactive transaction + thrown rollback (or `prisma-test-environment`)**

```typescript
// Prisma interactive transaction, rolled back by throwing:
const ROLLBACK = Symbol('rollback');
async function withRollback(fn: (tx: Prisma.TransactionClient) => Promise<void>) {
  try {
    await prisma.$transaction(async (tx) => { await fn(tx); throw ROLLBACK; });
  } catch (e) { if (e !== ROLLBACK) throw e; }
}
```

For parallel suites prefer a **schema-per-worker** strategy: give each Vitest/Jest worker its own Postgres schema, point `DATABASE_URL` at `...?schema=test_${workerId}`, and run `prisma migrate deploy` against it once.

**Truncate (any ORM, raw SQL) — simplest when rollback won't work**

```typescript
import { sql } from 'drizzle-orm';
// Reset to a clean state between tests. RESTART IDENTITY resets serial PKs;
// CASCADE handles FK-linked rows. List tables explicitly or query them.
afterEach(async () => {
  await db.execute(
    sql`TRUNCATE TABLE users, posts, comments RESTART IDENTITY CASCADE`
  );
});
```

**Rails / Django (for non-JS stacks)**
- **Rails:** `use_transactional_tests = true` (RSpec/Minitest) wraps each example in a transaction and rolls back automatically; switch to `DatabaseCleaner` with `:truncation` when tests span threads/processes (system/feature specs with a real browser).
- **Django:** subclass `TestCase` (wraps each test in a transaction + savepoints, auto-rollback). Use `TransactionTestCase` only when you must commit (e.g. testing `on_commit` hooks), and `pytest-django`'s `@pytest.mark.django_db(transaction=True)` for the same.

**Parallel integration tests — Testcontainers (one real DB per run)**

```typescript
// db.testcontainer.ts — spin a throwaway Postgres for the whole test run
import { PostgreSqlContainer } from '@testcontainers/postgresql';

let container: Awaited<ReturnType<PostgreSqlContainer['start']>>;

export async function setup() {
  container = await new PostgreSqlContainer('postgres:17').start();
  process.env.DATABASE_URL = container.getConnectionUri();
  // run migrations against the fresh container, then hand off to tests
}
export async function teardown() { await container.stop(); }
// wire via Vitest globalSetup: defineConfig({ test: { globalSetup: './db.testcontainer.ts' } })
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

```tsx
// snapshot.test.tsx
import { test, expect } from 'vitest';
import { render } from '@testing-library/react'; // needs jsdom/happy-dom env
import { Alert } from '@/components/Alert';
import { formatDisplayName } from '@/lib/format';

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

Coverage merge is the part that silently goes wrong. Vitest's **V8** provider does not emit nyc/Istanbul-compatible JSON, so `nyc merge` on raw V8 output produces empty or wrong reports. Two reliable options:

**A. Let your coverage service merge (simplest, recommended).** Each shard uploads its own `lcov`/json; Codecov/Coveralls stitches them by commit SHA. No manual merge step.

```yaml
# .github/workflows/test.yml
jobs:
  test:
    strategy: { matrix: { shard: [1, 2, 3, 4] } }
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4   # installs pnpm (reads version from packageManager)
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      # Each shard writes a uniquely-named lcov so uploads don't collide.
      - run: pnpm vitest run --shard=${{ matrix.shard }}/4 --coverage
      - uses: codecov/codecov-action@v5   # merges shards server-side by SHA
        with:
          files: ./coverage/lcov.info
          flags: shard-${{ matrix.shard }}
          token: ${{ secrets.CODECOV_TOKEN }}
```

**B. Merge yourself with Istanbul JSON.** Switch the Vitest provider to `istanbul` (which writes `coverage/coverage-final.json`), upload that per shard, then merge with `istanbul-merge` + `nyc report`:

```yaml
  merge-coverage:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with: { pattern: coverage-*, path: shards/ } # each = coverage-final.json
      # Combine the per-shard Istanbul JSON into one map, then report.
      - run: npx istanbul-merge --out coverage/coverage-final.json shards/**/coverage-final.json
      - run: npx nyc report --reporter=text --reporter=lcov --temp-dir=coverage/
```

(With provider `istanbul`, also `actions/upload-artifact@v4` each shard's `coverage/coverage-final.json` as `coverage-${{ matrix.shard }}` in the `test` job.)

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

## Test Strategy & Governance

The hard part of a test suite at scale isn't writing tests — it's keeping them fast, owned, trustworthy, and safe. This section covers the strategy decisions reviewers look for.

### Risk-Based Test Selection

Don't test everything equally. Spend depth where a defect is likely *and* costly.

| Risk = Likelihood x Impact | Strategy |
|----------------------------|----------|
| High impact, high churn (auth, payments, pricing, permissions) | Unit + integration + contract + an E2E happy path; 100% critical-path coverage; mutation score gate |
| High impact, low churn (money math, tax, crypto) | Exhaustive unit + property-based tests; lock with mutation testing |
| Low impact, high churn (UI copy, layout) | Visual regression + a thin smoke test; skip deep unit tests |
| Low impact, low churn (internal admin tooling) | Smoke test only; don't gold-plate |

- **Change-based selection in CI:** run the full suite on `main`/release branches; on PRs run impacted tests first. Vitest `--changed` (vs a base ref) and Jest `--onlyChanged`/`--findRelatedTests <files>` cut feedback time on large repos.
- **Property-based tests** (fast-check) beat dozens of example tests for parsers, serializers, money/units, and invariant checks: assert a property over generated inputs (`fc.assert(fc.property(fc.integer(), (n) => decode(encode(n)) === n))`).

### Ownership & Naming Conventions

- **Co-locate tests** with the code (`foo.ts` → `foo.test.ts`) so ownership follows the module via `CODEOWNERS`. A failing test should have an obvious owner.
- **Name tests by behavior, not implementation.** Pattern: `<subject> <does X> when <condition>`. Good: `rejects checkout when cart is empty`. Bad: `test calculateTotal 2`. The test name should read as a spec line in CI output.
- **One assertion *concept* per test.** Multiple `expect`s are fine if they verify one behavior; if a test needs "and also" in its name, split it.
- **Tag slow/integration/e2e** tests so they can be filtered: Vitest/Jest test name tags or separate `*.integration.test.ts` globs; gate them to run post-unit.

### Hermetic, Reproducible CI

A test that depends on wall-clock time, network, ordering, or ambient state is a future flake. Make tests hermetic:

- **No real network.** Mock outbound HTTP at the boundary (msw/nock) or use Testcontainers for real deps you control. A test hitting `api.stripe.com` is not a test, it's an outage waiting to happen.
- **Freeze time and seed randomness.** `vi.setSystemTime(...)`; seed `faker` (`faker.seed(123)`) and any RNG so failures reproduce.
- **Pin everything:** `pnpm install --frozen-lockfile`, pinned base images (`postgres:17`, not `:latest`), pinned action SHAs/majors. Cache deps, never test results.
- **Randomize test order** (Vitest `sequence.shuffle`, Jest `--randomize`, pair with `--seed` to reproduce failures) to surface hidden inter-test coupling before it becomes a flake.
- **Fail on console.error/unhandled rejections** in CI to catch silent regressions.

### Contract & Schema Versioning

Independently deployed services drift. Version the contract, not just the code:

- **Pact:** publish the consumer's `pacticipant` *version* (`--consumer-app-version=$GIT_SHA`) and tag the deploy environment; gate releases with `can-i-deploy` (shown above). Use **provider versioning + branch tags** so a new consumer contract doesn't block an old provider.
- **OpenAPI/JSON Schema:** snapshot the schema in the repo and fail the build on a breaking diff (e.g. `oasdiff breaking old.yaml new.yaml`). Treat removing a field or tightening a type as a major-version change.
- **GraphQL:** run schema-diff in CI and block breaking changes unless the field is deprecated first.
- **Events/queues:** validate message payloads against a versioned schema (Zod/Avro/Protobuf) in a contract test on both producer and consumer.

### Data Privacy & Secrets in Tests

Test data and fixtures are a common leak path — treat them like production data.

- **Never use real PII in fixtures.** Generate it: `faker.internet.email()`, synthetic names/addresses. Never paste a real customer record, a production DB dump, or a real card number into a fixture.
- **No real secrets in the repo or CI logs.** Inject via the CI secret store (`${{ secrets.X }}`), not committed `.env`. Use obvious placeholders in examples (`Bearer <test-token>`, `AXIOM_TOKEN=<your-token>`, `0xYourWalletAddress`).
- **Use provider *test* modes,** never live keys: Stripe `sk_test_...` + test cards (`4242 4242 4242 4242`), sandbox endpoints, throwaway accounts.
- **Scrub before sharing.** Strip secrets/PII from CI artifacts and screenshots (mask in Playwright). Scan with a secret scanner (gitleaks/`trufflehog`) in CI to block accidental commits.
- **Anonymize prod-derived test data:** if you must seed from production, hash/redact identifiers and emails first; document the transform.

### Reviewing AI-Generated Tests

LLM-written tests are fast to produce and easy to trust too much. Before merging, verify:

1. **The test actually asserts behavior** — not just that code runs without throwing. Reject `expect(result).toBeDefined()` standing in for a real check (classic AI coverage theater).
2. **It can fail.** Temporarily break the implementation (or read the diff) and confirm the test goes red. A test that passes against broken code is worse than none. Run it through mutation testing on critical modules.
3. **No tautologies or mock-only assertions** — e.g. asserting a mock returns the value you told it to return, or re-implementing the function inside the test.
4. **Inputs are meaningful**, including edge/boundary cases (empty, null, max, negative, unicode), not just one happy path with round numbers.
5. **No hidden coupling to internals** that will break on refactor; it should test the public contract.
6. **It's hermetic** (no real network/time/order dependence) and uses synthetic, PII-free data.
7. **Snapshots are reviewed,** not blindly accepted — an AI that runs `--update` then commits a 500-line snapshot has tested nothing.

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
import { defineConfig } from '@playwright/test';

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
  id: z.uuid(), // Zod 4 top-level format validator; z.string().uuid() is deprecated
  status: z.enum(['pending', 'confirmed', 'shipped', 'delivered']),
  items: z.array(z.object({ sku: z.string(), qty: z.number().positive() })),
  total: z.number().nonnegative(),
  createdAt: z.iso.datetime(), // Zod 4; z.string().datetime() is deprecated
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
# Automatically configures: instrumentation-client.ts, sentry.server.config.ts,
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

**Performance monitoring (tracing):** *Not* automatic: you must opt in by setting a non-zero `tracesSampleRate` (or `tracesSampler`) in each runtime config (`instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`). With it unset/`0`, no transactions are sent. Profiling additionally requires `profilesSampleRate` *and* the profiling integration. Start at 10% in production and raise as needed:
```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,   // 10% of transactions traced
  profilesSampleRate: 0.1, // relative to traced transactions; needs nodeProfilingIntegration() on the server
});
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

## Observability Checklist

### Must-Have (Day 1)
- [ ] Error tracking (Sentry) with source maps and alerting
- [ ] Structured logging with request ID tracing
- [ ] Uptime monitoring (BetterStack, UptimeRobot) — check `/api/health` every 60s
- [ ] Basic performance monitoring (Sentry or Vercel Analytics)

### Should-Have (Week 2)
- [ ] Centralized log aggregation (Axiom/Datadog)
- [ ] Performance budgets (Core Web Vitals, "good" thresholds): LCP < 2.5s, **INP < 200ms** (INP replaced FID as a Core Web Vital in Mar 2024), CLS < 0.1; supporting: TTFB < 800ms, FCP < 1.8s
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


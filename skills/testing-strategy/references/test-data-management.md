## Contents

- Test Data Management
- Factories with Fishery
- Database Factories (Integration Tests)
- Test Isolation Strategies
- Seeding Strategies

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

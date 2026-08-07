## Contents

- API Testing Patterns
- Supertest (Express/Fastify)
- Playwright API Testing
- API Contract Validation (Zod)

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

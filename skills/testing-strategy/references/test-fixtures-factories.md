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

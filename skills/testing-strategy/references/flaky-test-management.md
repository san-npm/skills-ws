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

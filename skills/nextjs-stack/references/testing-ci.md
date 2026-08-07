## Testing & CI

Minimum viable safety net for a SaaS:

```bash
pnpm add -D vitest @testing-library/react playwright
pnpm exec playwright install --with-deps chromium
```

- **Unit (Vitest):** pure logic — the `PRICES` allowlist, Zod schemas, the webhook `upsertSubscription` mapping. Fast, no network.
- **E2E smoke (Playwright):** sign in → load `/dashboard` → start checkout (Stripe **test** mode, card `4242 4242 4242 4242`) → assert the success state. Run against a preview deploy.
- **CI gate** — block merges on type errors, lint, and tests:

```yaml
# .github/workflows/ci.yml
name: ci
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm dlx prisma generate
      - run: pnpm tsc --noEmit
      - run: pnpm lint
      - run: pnpm test
```

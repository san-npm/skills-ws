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

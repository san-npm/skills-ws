## Contents

- Testing Pyramid: What to Run Where
- Unit Tests (Every Push)
- Integration Tests (Pull Requests)
- E2E Tests (Main Branch + Pre-deploy)

## Testing Pyramid: What to Run Where

```
        /  E2E  \          ← 5-10 critical user journeys. Main merges only.
       / ——————— \
      / Integration \      ← API contracts, DB queries. All PRs.
     / ————————————— \
    /   Unit Tests    \    ← Pure logic, fast. Every push.
   / ————————————————— \
```

### Unit Tests (Every Push)

- Run in < 30 seconds
- No network, no DB, no file system
- Mock external dependencies
- 80%+ coverage on business logic, not on glue code

```yaml
on: push
jobs:
  unit:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v6
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm run test:unit -- --bail
```

### Integration Tests (Pull Requests)

- Test real database queries with a real database
- Test API endpoints with supertest
- Test message queue consumers with real queues
- 2-5 minutes is acceptable

### E2E Tests (Main Branch + Pre-deploy)

- Test 5-10 critical user journeys, not every edge case
- Playwright is the usual default in 2026 — native parallelism/sharding, multi-browser (Chromium/Firefox/WebKit), auto-waiting, trace viewer. Cypress is a reasonable choice when your team already has deep investment in its time-travel debugger and component-testing setup. The CI patterns below are Playwright-specific.
- Shard across multiple workers, then merge the blob reports into one HTML report:

```yaml
e2e:
  runs-on: ubuntu-latest
  strategy:
    fail-fast: false
    matrix:
      shard: [1, 2, 3, 4]
  steps:
    - uses: actions/checkout@v7
    - uses: actions/setup-node@v6
      with: { node-version: '22', cache: 'npm' }
    - run: npm ci
    - run: npx playwright install --with-deps chromium
    - run: npm run build
    - run: npx playwright test --shard=${{ matrix.shard }}/4
      env:
        # Each shard emits a machine-readable blob report for later merge
        PLAYWRIGHT_BLOB_OUTPUT_DIR: blob-report
    - uses: actions/upload-artifact@v7
      if: ${{ !cancelled() }}
      with:
        name: blob-report-${{ matrix.shard }}
        path: blob-report
        retention-days: 1

merge-e2e-reports:
  needs: e2e
  if: ${{ !cancelled() }}
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v7
    - uses: actions/setup-node@v6
      with: { node-version: '22', cache: 'npm' }
    - run: npm ci
    - uses: actions/download-artifact@v8
      with:
        path: all-blob-reports
        pattern: blob-report-*
        merge-multiple: true
    - run: npx playwright merge-reports --reporter=html ./all-blob-reports
    - uses: actions/upload-artifact@v7
      with:
        name: playwright-html-report
        path: playwright-report
        retention-days: 14
```

---

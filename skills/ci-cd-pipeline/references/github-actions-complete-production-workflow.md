## Contents

- GitHub Actions: Complete Production Workflow
- Reusable Workflow Architecture
- The Reusable Workflow Pattern
- Matrix Builds
- Caching Strategies That Actually Work
- Node.js — npm ci with built-in cache
- Docker Layer Caching
- Turborepo Remote Cache

## GitHub Actions: Complete Production Workflow

### Reusable Workflow Architecture

Structure your workflows as composable units. Don't copy-paste between repos.

```
.github/
├── workflows/
│   ├── ci.yml                  # Main CI pipeline
│   ├── deploy-staging.yml      # Staging deployment
│   ├── deploy-production.yml   # Production deployment
│   └── release.yml             # Release management
```

#### The Reusable Workflow Pattern

Create org-level reusable workflows in a `.github` repository:

```yaml
# org/.github/.github/workflows/node-ci.yml
name: Node.js CI (Reusable)

on:
  workflow_call:
    inputs:
      node-version:
        type: string
        default: '22'   # 22 = Maintenance LTS, 24 = Active LTS in mid-2026; 20 went EOL 2026-04-30, 18 EOL 2025-04-30
      working-directory:
        type: string
        default: '.'
      run-e2e:
        type: boolean
        default: false
    secrets:
      NPM_TOKEN:
        required: false
      CODECOV_TOKEN:
        required: false

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v6
        with:
          node-version: ${{ inputs.node-version }}
          cache: 'npm'
          cache-dependency-path: '${{ inputs.working-directory }}/package-lock.json'

      - name: Install dependencies
        working-directory: ${{ inputs.working-directory }}
        run: npm ci

      - name: Lint
        working-directory: ${{ inputs.working-directory }}
        run: npm run lint

      - name: Type check
        working-directory: ${{ inputs.working-directory }}
        run: npm run typecheck

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v6
        with:
          node-version: ${{ inputs.node-version }}
          cache: 'npm'
          cache-dependency-path: '${{ inputs.working-directory }}/package-lock.json'

      - run: npm ci
        working-directory: ${{ inputs.working-directory }}

      - name: Unit tests with coverage
        working-directory: ${{ inputs.working-directory }}
        run: npm run test:unit -- --coverage --reporter=junit --outputFile=junit.xml

      - name: Upload coverage
        if: inputs.working-directory == '.'
        uses: codecov/codecov-action@v7
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          flags: unit

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v7
        with:
          name: unit-test-results
          path: ${{ inputs.working-directory }}/junit.xml

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v6
        with:
          node-version: ${{ inputs.node-version }}
          cache: 'npm'
          cache-dependency-path: '${{ inputs.working-directory }}/package-lock.json'

      - run: npm ci
        working-directory: ${{ inputs.working-directory }}

      - name: Run migrations
        working-directory: ${{ inputs.working-directory }}
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb
        run: npm run db:migrate

      - name: Integration tests
        working-directory: ${{ inputs.working-directory }}
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb
          REDIS_URL: redis://localhost:6379
          NODE_ENV: test
        run: npm run test:integration

  e2e-tests:
    if: inputs.run-e2e
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v6
        with:
          node-version: ${{ inputs.node-version }}
          cache: 'npm'

      - run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Build application
        run: npm run build

      - name: Run E2E tests
        run: npx playwright test
        env:
          CI: true

      - name: Upload Playwright report
        if: failure()
        uses: actions/upload-artifact@v7
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

Consume it from any repo. Make this local `ci.yml` **itself reusable** (`on: workflow_call`) so your deploy workflow can call it as a gate — without that trigger, `uses: ./.github/workflows/ci.yml` fails to resolve:

```yaml
# your-repo/.github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_call:          # REQUIRED so deploy-production.yml can `uses:` this file
    inputs:
      run-e2e:
        type: boolean
        default: false
    secrets:
      NPM_TOKEN:
        required: false
      CODECOV_TOKEN:
        required: false

jobs:
  ci:
    uses: your-org/.github/.github/workflows/node-ci.yml@v1   # pin to a tag/SHA, not @main
    with:
      node-version: '22'
      # On workflow_call, inherit the caller's run-e2e; on push/PR, derive it.
      run-e2e: ${{ inputs.run-e2e || (github.event_name == 'push' && github.ref == 'refs/heads/main') }}
    secrets:
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
      CODECOV_TOKEN: ${{ secrets.CODECOV_TOKEN }}
```

> Pin third-party and org reusable workflows to an immutable tag or full SHA (`@v1`, `@<40-char-sha>`), never `@main` — a moving ref is a supply-chain foothold. Dependabot's `github-actions` ecosystem will bump pinned SHAs for you.

### Matrix Builds

Use matrices for cross-version testing, but be smart about it. Test only **supported** runtimes: as of mid-2026 that's Maintenance LTS (22), Active LTS (24), and optionally Current (26); 18 (EOL 2025-04-30) and 20 (EOL 2026-04-30) are off the support matrix unless you have a contractual reason to keep them. Check the schedule at https://nodejs.org/en/about/previous-releases:

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false  # Don't cancel other jobs if one fails
      matrix:
        node-version: [22, 24]
        os: [ubuntu-latest]
        include:
          # Only test macOS on Active LTS (saves minutes; macOS minutes cost 10x)
          - node-version: 24
            os: macos-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v6
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm test
```

### Caching Strategies That Actually Work

#### Node.js — npm ci with built-in cache

```yaml
- uses: actions/setup-node@v6
  with:
    node-version: '22'
    cache: 'npm'
# npm ci uses the cache automatically. Done.
```

#### Docker Layer Caching

GHCR push needs `packages: write` (without it the push 403s). Pin to current major action versions (as of mid-2026: `build-push-action@v7`, `setup-buildx-action@v4`, `login-action@v4`, `metadata-action@v6`; verify at https://github.com/docker/build-push-action/releases). Tag by **full** `github.sha` and reuse that exact tag downstream, so deploy never references an image that was never pushed:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write   # REQUIRED to push to ghcr.io with GITHUB_TOKEN
    steps:
      - uses: actions/checkout@v7

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v4

      - name: Login to GHCR
        uses: docker/login-action@v4
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v7
        with:
          context: .
          push: true
          tags: |
            ghcr.io/${{ github.repository }}:${{ github.sha }}
            ghcr.io/${{ github.repository }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

#### Turborepo Remote Cache

```yaml
- name: Build with Turborepo
  run: npx turbo run build --filter=...[origin/main]
  env:
    TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
    TURBO_TEAM: ${{ vars.TURBO_TEAM }}
```

---

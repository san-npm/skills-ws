---
name: ci-cd-pipeline
description: "Production CI/CD pipelines with GitHub Actions — reusable workflows, testing strategies, deployment gates, rollbacks, and monorepo builds."
---

# CI/CD Pipeline Engineering

## Philosophy

A CI/CD pipeline isn't a YAML file — it's the immune system of your codebase. Every merge to main should be a non-event. If deploying makes you nervous, your pipeline is broken.

**Core principles:**
- Fast feedback: developers should know if they broke something within 5 minutes
- Reproducible: same commit = same result, every time
- Progressive: unit → integration → e2e → staging → canary → production
- Reversible: any deployment can be rolled back in under 2 minutes

---

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
        default: '20'
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
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
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
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
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
        if: inputs.working-directory == '.' && secrets.CODECOV_TOKEN != ''
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          flags: unit

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
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
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
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
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
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
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

Consume it from any repo:

```yaml
# your-repo/.github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    uses: your-org/.github/.github/workflows/node-ci.yml@main
    with:
      node-version: '20'
      run-e2e: ${{ github.event_name == 'push' && github.ref == 'refs/heads/main' }}
    secrets:
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
      CODECOV_TOKEN: ${{ secrets.CODECOV_TOKEN }}
```

### Matrix Builds

Use matrices for cross-version testing, but be smart about it:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false  # Don't cancel other jobs if one fails
      matrix:
        node-version: [18, 20, 22]
        os: [ubuntu-latest]
        include:
          # Only test macOS on latest Node (saves minutes)
          - node-version: 22
            os: macos-latest
        exclude:
          - node-version: 18
            os: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm test
```

### Caching Strategies That Actually Work

#### Node.js — npm ci with built-in cache

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'
# npm ci uses the cache automatically. Done.
```

#### Docker Layer Caching

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
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
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
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
- Use Playwright, not Cypress (faster, more reliable)
- Shard across multiple workers:

```yaml
e2e:
  runs-on: ubuntu-latest
  strategy:
    matrix:
      shard: [1, 2, 3, 4]
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: '20', cache: 'npm' }
    - run: npm ci
    - run: npx playwright install --with-deps chromium
    - run: npm run build
    - run: npx playwright test --shard=${{ matrix.shard }}/4
```

---

## Deployment Pipeline: Complete Production Workflow

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: [main]

concurrency:
  group: production-deploy
  cancel-in-progress: false  # Never cancel a running production deploy

jobs:
  test:
    uses: ./.github/workflows/ci.yml
    with:
      run-e2e: true

  build:
    needs: test
    runs-on: ubuntu-latest
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Docker meta
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}
          tags: type=sha,prefix=

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to staging
        run: |
          kubectl set image deployment/app \
            app=ghcr.io/${{ github.repository }}:${{ github.sha }} \
            --namespace=staging
          kubectl rollout status deployment/app --namespace=staging --timeout=300s

      - name: Smoke tests
        run: |
          sleep 10
          curl -sf https://staging.example.com/healthz || exit 1
          npm run test:smoke -- --base-url=https://staging.example.com

  approve-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production  # Requires manual approval in GitHub settings
    steps:
      - run: echo "Production deployment approved"

  deploy-canary:
    needs: approve-production
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy canary (10% traffic)
        run: |
          kubectl set image deployment/app-canary \
            app=ghcr.io/${{ github.repository }}:${{ github.sha }} \
            --namespace=production
          kubectl rollout status deployment/app-canary --namespace=production --timeout=300s

      - name: Monitor canary (5 minutes)
        run: |
          for i in $(seq 1 30); do
            ERROR_RATE=$(curl -s "http://prometheus:9090/api/v1/query" \
              --data-urlencode "query=rate(http_requests_total{status=~\"5..\",deployment=\"canary\"}[1m]) / rate(http_requests_total{deployment=\"canary\"}[1m])" \
              | jq -r '.data.result[0].value[1] // "0"')

            if (( $(echo "$ERROR_RATE > 0.05" | bc -l) )); then
              echo "Canary error rate ${ERROR_RATE} exceeds 5% threshold"
              kubectl rollout undo deployment/app-canary --namespace=production
              exit 1
            fi
            echo "Canary healthy (error rate: ${ERROR_RATE})"
            sleep 10
          done

  deploy-production:
    needs: deploy-canary
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Full rollout
        run: |
          kubectl set image deployment/app \
            app=ghcr.io/${{ github.repository }}:${{ github.sha }} \
            --namespace=production
          kubectl rollout status deployment/app --namespace=production --timeout=600s

      - name: Post-deploy smoke tests
        run: |
          sleep 15
          npm run test:smoke -- --base-url=https://app.example.com

      - name: Auto-rollback on failure
        if: failure()
        run: |
          kubectl rollout undo deployment/app --namespace=production
          curl -X POST "${{ secrets.SLACK_WEBHOOK }}" \
            -H 'Content-Type: application/json' \
            -d '{"text":"Production deploy failed — auto-rolled back"}'
```

---

## Rollback Strategies

### Kubernetes Health Check Rollback

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  replicas: 3
  revisionHistoryLimit: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0  # Zero-downtime
  template:
    spec:
      containers:
        - name: app
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 3
          startupProbe:
            httpGet:
              path: /healthz
              port: 8080
            failureThreshold: 30
            periodSeconds: 2
```

Manual rollback:
```bash
kubectl rollout undo deployment/app --namespace=production
kubectl rollout undo deployment/app --to-revision=3 --namespace=production
```

### Database Migration Rollback

**Rule:** Every migration must be reversible.

```typescript
// migrations/20240301_add_user_email_verified.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.boolean('email_verified').nullable().defaultTo(null);
  });
  await knex.raw(`
    UPDATE users SET email_verified = true WHERE confirmed_at IS NOT NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('email_verified');
  });
}
```

**Expand-contract pattern for breaking schema changes:**

1. **Expand:** Add new column, dual-write to both old and new
2. **Migrate:** Backfill data from old to new
3. **Switch:** Read from new column
4. **Contract:** Drop old column (separate deploy, days later)

---

## Feature Flags

### DIY Feature Flags

```typescript
type FeatureFlag = {
  enabled: boolean;
  rolloutPercentage?: number;
  allowList?: string[];
};

const FLAGS: Record<string, FeatureFlag> = {
  'new-checkout-flow': {
    enabled: true,
    rolloutPercentage: 25,
  },
  'admin-analytics-v2': {
    enabled: true,
    allowList: ['user_123', 'user_456'],
  },
  'dark-mode': {
    enabled: process.env.ENABLE_DARK_MODE === 'true',
  },
};

export function isFeatureEnabled(flag: string, userId?: string): boolean {
  const f = FLAGS[flag];
  if (!f || !f.enabled) return false;

  if (f.allowList && userId) {
    return f.allowList.includes(userId);
  }

  if (f.rolloutPercentage !== undefined && userId) {
    const hash = simpleHash(userId + flag);
    return (hash % 100) < f.rolloutPercentage;
  }

  return f.enabled;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
```

### LaunchDarkly Integration

```typescript
import * as LaunchDarkly from '@launchdarkly/node-server-sdk';

const client = LaunchDarkly.init(process.env.LAUNCHDARKLY_SDK_KEY!);
await client.waitForInitialization({ timeout: 5 });

async function handler(req: Request) {
  const user = {
    key: req.userId,
    email: req.userEmail,
    custom: { plan: req.userPlan, company: req.companyId },
  };

  const showNewCheckout = await client.variation('new-checkout-flow', user, false);
  return showNewCheckout ? renderNewCheckout() : renderOldCheckout();
}
```

---

## Release Management

### Semantic Versioning with Changesets

```bash
npm install -D @changesets/cli
npx changeset init
```

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    branches: [main]
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - name: Create Release PR or Publish
        uses: changesets/action@v1
        with:
          publish: npx changeset publish
          version: npx changeset version
          commit: 'chore: version packages'
          title: 'chore: version packages'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## Monorepo CI: Only Build What Changed

### Turborepo Affected Detection

```yaml
name: CI
on:
  pull_request:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - name: Build affected
        run: npx turbo run build test lint --filter=...[origin/main]
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ vars.TURBO_TEAM }}
```

### Nx Affected

```yaml
- name: Derive SHAs
  uses: nrwl/nx-set-shas@v4
- name: Run affected
  run: npx nx affected -t lint test build --parallel=3
```

---

## Secrets Management in CI

### OIDC Federation (No Stored Secrets)

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions-deploy
          aws-region: us-east-1

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: 'projects/123/locations/global/workloadIdentityPools/github/providers/github'
          service_account: 'deploy@project.iam.gserviceaccount.com'
```

AWS IAM trust policy for GitHub OIDC:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
      },
      "StringLike": {
        "token.actions.githubusercontent.com:sub": "repo:your-org/your-repo:ref:refs/heads/main"
      }
    }
  }]
}
```

---

## Performance Tips

1. **Cancel redundant runs:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

2. **Skip CI for docs-only changes:**
```yaml
on:
  push:
    paths-ignore: ['**.md', 'docs/**', '.vscode/**']
```

3. **Cache Playwright browsers:**
```yaml
- uses: actions/cache@v4
  id: pw-cache
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ hashFiles('package-lock.json') }}
- if: steps.pw-cache.outputs.cache-hit != 'true'
  run: npx playwright install --with-deps chromium
```

4. **Use `npm ci`** not `npm install` — faster and deterministic.

5. **Set timeouts on every job** — a hung test can burn your monthly minutes.

---

## Anti-Patterns

1. **Testing everything in E2E** — push logic down to unit tests
2. **No concurrency control** — two deploys simultaneously = disaster
3. **`npm install` instead of `npm ci`** — non-deterministic
4. **No timeout on jobs** — hung processes burn minutes
5. **Force-pushing over failures** — fix the failure, don't skip gates
6. **Deploying Friday at 5pm** — your pipeline is fine, your on-call won't be

---

## Checklist: Production-Ready Pipeline

- [ ] Unit + integration tests on PRs, E2E on main merges
- [ ] Docker images tagged with commit SHA
- [ ] Staging deploy with smoke tests before production
- [ ] Manual approval gate for production
- [ ] Canary deployment with error rate monitoring
- [ ] Auto-rollback on failed health checks
- [ ] Slack notification on deploy success/failure
- [ ] Concurrency control prevents parallel deploys
- [ ] OIDC federation for cloud credentials
- [ ] Secrets scoped to environments, rotated quarterly
- [ ] CI completes in under 10 minutes for PRs
- [ ] Redundant runs cancelled on new pushes
- [ ] Feature flags for risky changes
- [ ] Database migrations are reversible

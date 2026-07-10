---
name: ci-cd-pipeline
description: "End-to-end CI/CD on GitHub Actions: reusable workflows, caching, the testing pyramid, OIDC cloud deploys, SLSA provenance + keyless cosign signing, canary/rollback, reversible DB migrations, monorepo affected builds. Use when designing, hardening, or debugging a production pipeline (Actions YAML, supply-chain attestation, K8s rollouts, releases)."
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

## Deployment Pipeline: Complete Production Workflow

Two things make `kubectl`/registry steps actually runnable on a GitHub-hosted runner and are missing from most copy-pasted examples:

1. **Auth + tooling on every deploy job.** A hosted runner has no kubeconfig and no cluster network route. You must (a) get cloud credentials — OIDC is preferred over long-lived keys — (b) fetch a kubeconfig (`aws eks update-kubeconfig` / `gcloud container clusters get-credentials` / `az aks get-credentials`), and (c) ensure `kubectl` exists (`azure/setup-kubectl`). The factored-out `_kube-deploy` reusable job below does all three so the example stays DRY.
2. **One immutable image reference, computed once.** Compute the digest-or-SHA tag in `build` and pass it through job `outputs`; every deploy job consumes that exact string. Never re-derive `:${{ github.sha }}` in a deploy job while `metadata-action` produced a *different* tag (e.g. a short SHA) — that's how you "deploy" a tag that was never pushed.

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: [main]

concurrency:
  group: production-deploy
  cancel-in-progress: false  # Never cancel a running production deploy

permissions:
  contents: read
  packages: write   # push to GHCR
  id-token: write   # OIDC for cloud auth + keyless cosign

jobs:
  test:
    # ci.yml MUST declare `on: workflow_call` (see the CI section) or this fails to resolve.
    uses: ./.github/workflows/ci.yml
    with:
      run-e2e: true
    secrets: inherit

  build:
    needs: test
    runs-on: ubuntu-latest
    outputs:
      # The single source of truth for "what we deploy": image@sha256 digest.
      image: ${{ steps.out.outputs.image }}
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

      - name: Docker meta
        id: meta
        uses: docker/metadata-action@v6
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=sha,format=long,prefix=
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push
        id: build
        uses: docker/build-push-action@v7
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Pin to immutable digest
        id: out
        # Prefer the pushed digest over any tag — tags are mutable, digests are not.
        run: echo "image=ghcr.io/${{ github.repository }}@${{ steps.build.outputs.digest }}" >> "$GITHUB_OUTPUT"

  # ---- Reusable in-cluster deploy job: auth -> kubeconfig -> kubectl. ----
  # Realistically this lives in your org `.github` repo; shown inline for clarity.
  deploy-staging:
    needs: build
    uses: ./.github/workflows/_kube-deploy.yml
    with:
      environment: staging
      namespace: staging
      deployment: app
      image: ${{ needs.build.outputs.image }}
      base-url: https://staging.example.com
    secrets: inherit

  approve-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production  # Configure required reviewers under Settings → Environments
    steps:
      - run: echo "Production deployment approved"

  deploy-canary:
    needs: [build, approve-production]
    uses: ./.github/workflows/_kube-deploy.yml
    with:
      environment: production
      namespace: production
      deployment: app-canary
      image: ${{ needs.build.outputs.image }}
      analyze: true            # gate on metrics before promoting
    secrets: inherit

  deploy-production:
    needs: [build, deploy-canary]
    uses: ./.github/workflows/_kube-deploy.yml
    with:
      environment: production
      namespace: production
      deployment: app
      image: ${{ needs.build.outputs.image }}
      base-url: https://app.example.com
    secrets: inherit
```

```yaml
# .github/workflows/_kube-deploy.yml — the reusable deploy unit
name: kube-deploy
on:
  workflow_call:
    inputs:
      environment: { type: string, required: true }
      namespace:   { type: string, required: true }
      deployment:  { type: string, required: true }
      image:       { type: string, required: true }   # full image@sha256 digest
      base-url:    { type: string, default: '' }
      analyze:     { type: boolean, default: false }

permissions:
  contents: read
  id-token: write   # OIDC -> cloud, no stored kube creds

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    steps:
      - uses: actions/checkout@v7

      # 1) Cloud auth via OIDC (EKS example; swap for GKE/AKS as needed).
      - uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: ${{ vars.AWS_DEPLOY_ROLE_ARN }}
          aws-region: ${{ vars.AWS_REGION }}

      # 2) kubectl binary + 3) cluster kubeconfig.
      # Pin kubectl within +/-1 minor of your cluster's control plane (skew policy).
      - uses: azure/setup-kubectl@v5
        with: { version: '${{ vars.KUBECTL_VERSION }}' }   # e.g. 'v1.33.x' for a 1.32/1.33 cluster
      - name: Configure kubeconfig
        run: aws eks update-kubeconfig --name ${{ vars.EKS_CLUSTER }} --region ${{ vars.AWS_REGION }}
      # GKE alt: google-github-actions/get-gke-credentials@v2
      # AKS alt: az aks get-credentials --resource-group RG --name CLUSTER

      - name: Roll out
        run: |
          kubectl set image deployment/${{ inputs.deployment }} \
            app=${{ inputs.image }} --namespace=${{ inputs.namespace }}
          kubectl rollout status deployment/${{ inputs.deployment }} \
            --namespace=${{ inputs.namespace }} --timeout=300s

      # Canary metric gate. The runner is OUTSIDE the cluster, so do NOT curl an
      # in-cluster `http://prometheus:9090`. Use one of:
      #   - a controller that analyzes for you (Argo Rollouts / Flagger), or
      #   - your managed/external metrics API (Datadog, Grafana Cloud, AMP), or
      #   - `kubectl port-forward` to reach in-cluster Prometheus over localhost.
      - name: Analyze canary (port-forward to in-cluster Prometheus)
        if: inputs.analyze
        run: |
          kubectl -n monitoring port-forward svc/prometheus 9090:9090 &
          PF_PID=$!; trap 'kill $PF_PID' EXIT
          for i in $(seq 1 30); do
            ERROR_RATE=$(curl -s "http://localhost:9090/api/v1/query" \
              --data-urlencode 'query=sum(rate(http_requests_total{status=~"5..",deployment="canary"}[1m])) / sum(rate(http_requests_total{deployment="canary"}[1m]))' \
              | jq -r '.data.result[0].value[1] // "0"')
            if awk "BEGIN{exit !(${ERROR_RATE:-0} > 0.05)}"; then
              echo "Canary error rate ${ERROR_RATE} exceeds 5% — rolling back"
              kubectl rollout undo deployment/${{ inputs.deployment }} --namespace=${{ inputs.namespace }}
              exit 1
            fi
            echo "Canary healthy (error rate: ${ERROR_RATE})"; sleep 10
          done

      - name: Smoke tests
        if: inputs.base-url != ''
        run: |
          curl --retry 5 --retry-all-errors --retry-delay 3 -sf "${{ inputs.base-url }}/healthz"
          npm ci && npm run test:smoke -- --base-url="${{ inputs.base-url }}"

      - name: Auto-rollback + notify on failure
        if: failure()
        run: |
          kubectl rollout undo deployment/${{ inputs.deployment }} --namespace=${{ inputs.namespace }} || true
          curl -X POST "${{ secrets.SLACK_WEBHOOK }}" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"${{ inputs.environment }}/${{ inputs.deployment }} deploy failed — auto-rolled back\"}"
```

> **Prefer a progressive-delivery controller over hand-rolled canary bash.** [Argo Rollouts](https://argoproj.github.io/rollouts/) (`Rollout` CRD with `analysis` templates) and [Flagger](https://flagger.app/) automate traffic shifting, metric analysis (Prometheus/Datadog), and automatic rollback in-cluster — so your pipeline just pushes the digest and watches `kubectl argo rollouts status`. The bash gate above is the from-scratch fallback when you have no controller.

---

## Supply-Chain Security: SLSA Provenance + Keyless Signing

By 2026, signing artifacts and attaching verifiable provenance is table stakes, and admission controllers reject unsigned images. GitHub's native [artifact attestations](https://docs.github.com/en/actions/security-guides/using-artifact-attestations-to-establish-provenance-for-builds) generate SLSA-style provenance and sign it with Sigstore **keyless** (Fulcio short-lived certs tied to the workflow's OIDC identity — no private keys to store or rotate). Targets [SLSA](https://slsa.dev/) Build Level 3 when run from a non-falsifiable build.

### Generate provenance + sign at build time

```yaml
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      id-token: write       # OIDC identity for keyless signing (Fulcio)
      attestations: write   # required by attest-build-provenance
    outputs:
      image: ${{ steps.out.outputs.image }}
    steps:
      - uses: actions/checkout@v7
      - uses: docker/setup-buildx-action@v4
      - uses: docker/login-action@v4
        with: { registry: ghcr.io, username: '${{ github.actor }}', password: '${{ secrets.GITHUB_TOKEN }}' }

      - id: build
        uses: docker/build-push-action@v7
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
          # SBOM + provenance attestations emitted straight into the registry
          sbom: true
          provenance: mode=max

      # GitHub-native SLSA provenance attestation, signed keyless via Sigstore.
      - uses: actions/attest-build-provenance@v4
        with:
          subject-name: ghcr.io/${{ github.repository }}
          subject-digest: ${{ steps.build.outputs.digest }}
          push-to-registry: true

      # Optional explicit cosign signature (interop with non-GitHub verifiers).
      - uses: sigstore/cosign-installer@v4
      - run: cosign sign --yes ghcr.io/${{ github.repository }}@${{ steps.build.outputs.digest }}

      - id: out
        run: echo "image=ghcr.io/${{ github.repository }}@${{ steps.build.outputs.digest }}" >> "$GITHUB_OUTPUT"
```

### Verify before you deploy (fail-closed gate)

Put this in the deploy job so an unsigned or wrongly-provenanced image is never rolled out:

```yaml
      # 1) GitHub-native verification (`gh` is preinstalled on hosted runners):
      - run: |
          gh attestation verify oci://${{ needs.build.outputs.image }} \
            --repo ${{ github.repository }} \
            --predicate-type https://slsa.dev/provenance/v1
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      # 2) cosign verification, asserting the signer identity + issuer:
      - uses: sigstore/cosign-installer@v4
      - run: |
          cosign verify ${{ needs.build.outputs.image }} \
            --certificate-identity-regexp "^https://github.com/${{ github.repository }}/" \
            --certificate-oidc-issuer https://token.actions.githubusercontent.com
          cosign verify-attestation ${{ needs.build.outputs.image }} \
            --type slsaprovenance1 \
            --certificate-identity-regexp "^https://github.com/${{ github.repository }}/" \
            --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

### Enforce at admission time (not just in CI)

CI checks are advisory; a compromised CI can skip them. Enforce in-cluster so only attested images run:
- **Sigstore [policy-controller](https://docs.sigstore.dev/policy-controller/overview/)** or **[Kyverno](https://kyverno.io/)** `verifyImages` rules that require a valid Fulcio identity + SLSA provenance predicate before a pod is admitted.
- For pure source-build SLSA L3 (npm/Go/generic artifacts rather than containers), use the [slsa-framework/slsa-github-generator](https://github.com/slsa-framework/slsa-github-generator) reusable workflow to produce a non-forgeable provenance file, then verify with `slsa-verifier`.

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
    permissions:
      contents: write     # push version-bump commit / create release
      id-token: write      # npm Trusted Publishing (OIDC) — no NPM_TOKEN needed
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v6
        with: { node-version: '22', cache: 'npm', registry-url: 'https://registry.npmjs.org' }
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
          # NPM_TOKEN no longer required: configure Trusted Publishing for the
          # package on npmjs.com and publish via OIDC (npm CLI >= 11.5). npm then
          # attaches provenance automatically. Requires `id-token: write` above.
```

> **Trusted Publishing.** As of 2026, npm (and PyPI/RubyGems) support OIDC-based "trusted publishing": you register the GitHub repo+workflow as a trusted publisher on the registry, and CI mints a short-lived token at publish time instead of storing a long-lived `NPM_TOKEN`. npm also stamps published packages with provenance linking back to the build. Verify current CLI/flow at https://docs.npmjs.com/trusted-publishers.

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
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v6
        with: { node-version: '22', cache: 'npm' }
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
  uses: nrwl/nx-set-shas@v5
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
        uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions-deploy
          aws-region: us-east-1

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v3
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
- uses: actions/cache@v6
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
7. **Deploying mutable tags (`:latest`, a re-derived `:${{ github.sha }}`)** — pin to the pushed `@sha256` digest so what you tested is what runs
8. **`uses: org/workflow@main`** — a moving ref is a supply-chain foothold; pin to a tag or full SHA and let Dependabot bump it
9. **Trusting CI-side signature checks alone** — a compromised runner can skip them; enforce signatures/provenance at admission (Kyverno/policy-controller)

---

## Checklist: Production-Ready Pipeline

- [ ] Unit + integration tests on PRs, E2E on main merges
- [ ] Images deployed by immutable `@sha256` digest, computed once and threaded via job outputs
- [ ] SLSA provenance attached + image signed keyless (cosign/Sigstore); verified before deploy
- [ ] Signature/provenance enforced at admission (Kyverno / policy-controller), not just in CI
- [ ] Reusable workflows and third-party actions pinned to a tag or full SHA (not `@main`)
- [ ] `permissions:` set to least privilege per job (`packages: write`, `id-token: write` only where needed)
- [ ] Deploy jobs include cloud auth (OIDC) + kubeconfig + `kubectl` setup — not assumed present
- [ ] Staging deploy with smoke tests before production
- [ ] Manual approval gate for production (required reviewers on the `production` environment)
- [ ] Canary with metric-gated promotion + auto-rollback (Argo Rollouts/Flagger, or port-forwarded metrics)
- [ ] Slack notification on deploy success/failure
- [ ] Concurrency control prevents parallel deploys
- [ ] Secrets scoped to environments, rotated quarterly (or replaced by OIDC/trusted publishing)
- [ ] CI completes in under 10 minutes for PRs; redundant runs cancelled on new pushes
- [ ] Feature flags for risky changes
- [ ] Database migrations are reversible (expand-contract for breaking changes)
- [ ] Test matrix covers only supported runtimes (Node 22/24 in 2026; drop EOL 18/20)

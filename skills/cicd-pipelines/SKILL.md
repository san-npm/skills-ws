---
name: cicd-pipelines
description: "Production GitHub Actions CI/CD: least-privilege workflows, caching, OIDC deploys, Docker multi-stage builds, blue-green/canary, rollback, release automation (semantic-release, Changesets), and the 2026 supply-chain baseline. Use when writing/reviewing .github/workflows, automating releases, or debugging caching/secrets/OIDC."
---

# CI/CD Pipelines

Concrete, runnable patterns for production GitHub Actions pipelines. Every snippet below is self-contained: copy it, swap the placeholders, and ship. Action versions are current as of **July 2026**; pin by SHA in regulated/high-trust repos (see [Supply-Chain Baseline](#supply-chain-baseline-2026)). For sibling depth on container internals see `docker-production`; for cloud IAM specifics see `aws-production-deploy`.

## Action Version Matrix (July 2026)

Pin to these majors (or the exact SHA for the major). All listed majors run on the **Node 24** runtime. GitHub switched the Actions runtime default to Node 24 on **2026-06-16**, so any action still on Node 20 warns (the `ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true` opt-out lasts only until Node 20 is removed in fall 2026); bump them.

| Action | Pin | Notes |
|---|---|---|
| `actions/checkout` | `@v7` | v7 blocks checking out fork PR heads under `pull_request_target`/`workflow_run`. |
| `actions/setup-node` | `@v6` | |
| `actions/cache` | `@v6` | v6 = ESM migration; v5 still receives releases. |
| `actions/upload-artifact` | `@v7` | v7 adds non-zip uploads (`compression-level`/`archive`). **Not symmetric** with download. |
| `actions/download-artifact` | `@v8` | Pairs with upload v7; major numbers differ — don't assume they match. |
| `actions/attest-build-provenance` | `@v4` | Now a thin wrapper over `actions/attest@v4`. |
| `docker/build-push-action` | `@v7` | v7 = Node 24 default; requires runner ≥ v2.327.1 (GitHub-hosted is fine). |
| `docker/setup-buildx-action` | `@v4` | |
| `docker/login-action` | `@v4` | |
| `docker/metadata-action` | `@v6` | |
| `aws-actions/configure-aws-credentials` | `@v6` | |
| `actions/dependency-review-action` | `@v5` | |
| `github/codeql-action` | `@v4` | v4 is the latest supported line; v3 remains only for older GHES (3.16-3.19). |
| `codecov/codecov-action` | `@v7` | Requires `CODECOV_TOKEN` for public repos since v4. |
| `sigstore/cosign-installer` | `@v4` | |
| `anchore/sbom-action` | `@v0.24` | 0.x — pin the exact minor, no stable major yet. |
| `aquasecurity/trivy-action` | `@v0.36` | 0.x — pin the exact minor. |
| `step-security/harden-runner` | `@v2` | Egress filtering / runtime monitoring. |
| `changesets/action` | `@v1` (v1.9+) | |

> These move fast. The durable source of truth is each action's `releases` page; verify before pinning a SHA for production.

## GitHub Actions — Core CI Workflow

Set **least-privilege permissions at the top level** (`contents: read`) so every job defaults to read-only; grant writes only on the specific job that needs them. This is the single highest-leverage hardening step — a compromised dependency in a test job then cannot push code or mint releases.

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

# Least-privilege default for ALL jobs. Override per-job when a job needs more.
permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    # Pin the runner image. `ubuntu-latest` silently migrates (e.g. 24.04 -> 26.04)
    # and can break builds mid-sprint. Pin the version; bump it deliberately.
    runs-on: ubuntu-24.04
    strategy:
      fail-fast: false
      matrix:
        # Node 20 reached EOL 2026-04-30 — dropped. 22 = maintenance LTS (until 2027-04),
        # 24 = active LTS. Only matrix versions you actually support in production.
        node: [22, 24]
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: ${{ matrix.node }}
          cache: npm
      - run: npm ci
      - run: npm test -- --coverage
      - uses: actions/upload-artifact@v7
        with:
          name: coverage-${{ matrix.node }}
          path: coverage/
          retention-days: 7

  # Split lint/typecheck into their own job so they run in parallel with tests,
  # not as sequential steps that serialize the critical path.
  lint:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with: { node-version: 24, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
```

### Required status checks & branch protection

CI only protects you if merges are *blocked* on it. Configure once (Settings → Branches → branch protection rule, or via API/Terraform):

- Require pull request before merging; require ≥1 approval; dismiss stale approvals on new commits.
- Require status checks to pass: add the exact job names (`test (22)`, `test (24)`, `lint`). Matrix jobs register as separate checks — list each, or gate them behind one aggregator job.
- Require branches to be up to date before merging (forces re-run against latest `main`).
- Require signed commits and a linear history on release branches if your compliance posture needs it.

```yaml
# Aggregator pattern: make ONE check required instead of N flaky matrix entries.
ci-passed:
  runs-on: ubuntu-24.04
  needs: [test, lint]
  if: always()
  steps:
    - name: Fail if any dependency failed
      if: contains(needs.*.result, 'failure') || contains(needs.*.result, 'cancelled')
      run: exit 1
```

## Caching Strategies

```yaml
# 1) Node modules — let setup-node manage it (keyed on lockfile hash automatically).
- uses: actions/setup-node@v6
  with: { node-version: 24, cache: npm }   # use 'pnpm' or 'yarn' to match your PM

# 2) pnpm (needs the store + action-setup BEFORE setup-node's cache kicks in)
- uses: pnpm/action-setup@v6
  with: { version: 11 }   # or omit version to use the packageManager field from package.json
- uses: actions/setup-node@v6
  with: { node-version: 24, cache: pnpm }

# 3) Docker layer caching via the GitHub Actions cache backend
- uses: docker/build-push-action@v7
  with:
    context: .
    cache-from: type=gha
    cache-to: type=gha,mode=max     # mode=max also caches intermediate layers

# 4) Turborepo local cache (remote cache is better at scale — see monorepo section)
- uses: actions/cache@v6
  with:
    path: .turbo
    # Include the lockfile in the key so a dep change busts the cache.
    key: turbo-${{ hashFiles('**/turbo.json', '**/package-lock.json') }}-${{ github.sha }}
    restore-keys: |
      turbo-${{ hashFiles('**/turbo.json', '**/package-lock.json') }}-
- run: npx turbo build --cache-dir=.turbo
```

**Cache hygiene:** key on the lockfile hash (not loose globs), keep `restore-keys` as a prefix fallback, and never cache anything secret-derived. Untrusted PRs run in a restricted scope and **cannot write** to caches/branches your default branch created — don't design a workflow that depends on a PR populating a shared cache.

## Secrets & OIDC

Prefer **OIDC over long-lived static cloud keys**: the workflow mints a short-lived token at runtime, so there is no secret to leak or rotate. `id-token: write` is required for OIDC and must be granted explicitly (it is *not* in the `contents: read` default).

```yaml
# Repository / org secrets (Settings -> Secrets and variables -> Actions)
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}

jobs:
  # Environment-scoped secrets + manual gate. Secrets here are isolated from CI jobs.
  deploy:
    environment: production        # add "Required reviewers" + secrets on this environment
    permissions:
      id-token: write              # mint the OIDC token
      contents: read
    steps:
      # OIDC — no stored cloud keys. Configure the trust policy on the cloud side
      # to only accept tokens from THIS repo + ref (and ideally THIS environment).
      - uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: arn:aws:iam::123456789012:role/deploy
          aws-region: us-east-1
      - run: ./deploy.sh
```

**Trust-policy scoping (do this — a wildcard `repo:*` subject is a takeover risk):**

```jsonc
// AWS IAM trust policy condition — bind to exactly your repo, ref, and environment
"Condition": {
  "StringEquals": {
    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
    "token.actions.githubusercontent.com:sub": "repo:your-org/your-repo:environment:production"
  }
}
```

**Secret rules:**
- Never `echo`/`print` a secret; GitHub masks known values but interpolation can defeat masking.
- Never pass secrets into actions triggered by `pull_request` from forks (use `pull_request_target` only with extreme care — it runs with write scope against untrusted code).
- Prefer the auto-provisioned `GITHUB_TOKEN` (scoped, short-lived) over a PAT. If you need a PAT, use a fine-grained token with minimal repo/permission scope and a short expiry.
- Rotate any unavoidable static credential on a schedule and alert on use from unexpected IPs (`step-security/harden-runner@v2` can enforce egress allowlists).

## Docker Multi-Stage Build

The classic footgun: `npm ci` in the build stage (dev deps included for the build), then copying `node_modules` straight into the runtime image — **shipping dev dependencies, tooling, and a larger attack surface to production.** Fix it with a dedicated deps stage that installs production-only, and copy *that* into runtime.

```dockerfile
# syntax=docker/dockerfile:1

# --- deps: production-only dependencies for the runtime image ---
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
# BuildKit cache mount keeps the npm cache warm across builds without baking it in.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# --- build: full deps (incl. dev) just to compile, never shipped ---
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
RUN npm run build

# --- runtime: minimal, non-root, prod deps only ---
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 app && adduser -u 1001 -G app -s /bin/sh -D app
# prod deps only (from the deps stage)
COPY --from=deps  /app/node_modules ./node_modules
COPY --from=build /app/dist          ./dist
COPY package.json ./
USER app
EXPOSE 3000
# Container-level liveness; pair with your orchestrator's probes.
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
```

### Build, scan, sign, and attest in CI

```yaml
build-image:
  runs-on: ubuntu-24.04
  permissions:
    contents: read
    packages: write        # push to GHCR
    id-token: write        # keyless cosign signing + attestations
    attestations: write    # actions/attest-build-provenance
  steps:
    - uses: actions/checkout@v6
    - uses: docker/setup-buildx-action@v4
    - uses: docker/login-action@v4
      with:
        registry: ghcr.io
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    - id: meta
      uses: docker/metadata-action@v6
      with:
        images: ghcr.io/${{ github.repository }}
        tags: |
          type=sha
          type=semver,pattern={{version}}
    - id: build
      uses: docker/build-push-action@v7
      with:
        context: .
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
    # Vulnerability scan — fail the build on fixable HIGH/CRITICAL CVEs.
    - uses: aquasecurity/trivy-action@v0.36
      with:
        image-ref: ghcr.io/${{ github.repository }}@${{ steps.build.outputs.digest }}
        format: sarif
        output: trivy.sarif
        severity: HIGH,CRITICAL
        ignore-unfixed: true
        exit-code: '1'
    # Keyless image signing (Sigstore/Fulcio — no key to manage).
    - uses: sigstore/cosign-installer@v4
    - run: cosign sign --yes ghcr.io/${{ github.repository }}@${{ steps.build.outputs.digest }}
    # Build provenance attestation (SLSA) bound to the pushed digest.
    - uses: actions/attest-build-provenance@v4
      with:
        subject-name: ghcr.io/${{ github.repository }}
        subject-digest: ${{ steps.build.outputs.digest }}
        push-to-registry: true
```

Always reference images by **digest** (`@sha256:...`), never a mutable tag, downstream — that is what cosign signs and what provenance attests. Verify at deploy time: `cosign verify --certificate-identity-regexp '...' --certificate-oidc-issuer https://token.actions.githubusercontent.com IMAGE@DIGEST`.

## Deployment Strategies

| Strategy | Downtime | Rollback Speed | Risk | Best For |
|---|---|---|---|---|
| **Rolling** | Zero | Minutes | Medium | Stateless services |
| **Blue-Green** | Zero | Instant (swap) | Low | Critical services |
| **Canary** | Zero | Fast (shift back) | Lowest | High-traffic APIs |
| **Recreate** | Yes | Slow | High | Dev/staging only |

### Blue-Green with GitHub Actions

```yaml
deploy:
  runs-on: ubuntu-24.04
  environment: production
  permissions: { id-token: write, contents: read }
  steps:
    - uses: actions/checkout@v6
    - name: Deploy to idle (green) slot
      run: ./deploy.sh green
    - name: Health check green before any traffic
      run: |
        for i in $(seq 1 30); do
          curl -fsS https://green.app.example/health && exit 0
          sleep 5
        done
        echo "green never became healthy"; exit 1
    - name: Swap traffic to green
      run: ./swap-traffic.sh green
    - name: Keep blue warm as instant rollback
      run: echo "Rollback = ./swap-traffic.sh blue (previous version still running)"
```

### Canary (progressive traffic shift)

```yaml
canary:
  runs-on: ubuntu-24.04
  environment: production
  steps:
    - uses: actions/checkout@v6
    - run: ./deploy.sh canary
    - name: Shift 5% → watch SLOs → 25% → 50% → 100%
      run: |
        for pct in 5 25 50 100; do
          ./set-weight.sh canary "$pct"
          sleep 120
          # Bail (and auto-rollback) if error rate / latency SLO breaches.
          ./check-slo.sh canary || { ./set-weight.sh canary 0; exit 1; }
        done
```

## Environment Promotion (dev → staging → prod)

```yaml
# Trigger chain: push to main → dev → staging (auto) → prod (manual approval)
deploy-dev:
  if: github.ref == 'refs/heads/main'
  environment: dev
  permissions: { id-token: write, contents: read }

deploy-staging:
  needs: deploy-dev
  environment: staging
  permissions: { id-token: write, contents: read }

deploy-prod:
  needs: deploy-staging
  environment: production   # set "Required reviewers" + a wait timer on this environment
  permissions: { id-token: write, contents: read }
```

## Release Automation

### Option A — semantic-release (single package, automated versioning from commits)

`semantic-release` reads Conventional Commits, computes the next version, publishes to npm, creates the GitHub release, and commits the changelog — all in CI on `main`. The common failure is a release job missing Node setup, a clean install, or the npm auth token, so it either can't run or publishes unauthenticated.

```json
// .releaserc.json
{
  "branches": ["main", { "name": "next", "prerelease": true }],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    "@semantic-release/npm",
    "@semantic-release/github",
    ["@semantic-release/git", { "assets": ["CHANGELOG.md", "package.json"] }]
  ]
}
```

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    branches: [main]

permissions:
  contents: read   # least-privilege default; the release job widens it below

jobs:
  release:
    runs-on: ubuntu-24.04
    permissions:
      contents: write       # push the changelog/version commit + create the GitHub release
      issues: write         # comment on released issues
      pull-requests: write  # comment on released PRs
      id-token: write       # npm provenance (publish with verifiable origin)
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0     # full history — semantic-release diffs all tags
          persist-credentials: false
      - uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: npm
          registry-url: https://registry.npmjs.org   # writes the npm authToken line
      - run: npm ci
      - run: npm run build --if-present
      - run: npx semantic-release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # npm granular access token (write tokens max 90 days) or, preferably,
          # OIDC trusted publishing: classic automation tokens were revoked 2025-12-09.
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

> With `id-token: write` + a recent npm CLI, `@semantic-release/npm` publishes with **provenance**, linking the package on npm to the exact workflow run that built it. Prefer npm "trusted publishing" (OIDC) over a static `NPM_TOKEN` where your registry supports it.

### Option B — Changesets (monorepos, human-curated release notes)

Changesets is the better fit for monorepos: contributors drop an intent file per PR (`npx changeset`), and a bot opens/maintains a single "Version Packages" PR. Merging that PR versions every affected package and publishes them together.

```bash
npx changeset           # developer: select bumped packages + write a summary (commit the .md)
npx changeset version   # CI/maintainer: applies bumps, updates changelogs + lockfile
npx changeset publish   # CI: publishes every package that has a new version
```

```yaml
# .github/workflows/changesets.yml   (inlined — this is the full workflow)
name: Changesets Release
on:
  push:
    branches: [main]

permissions:
  contents: read

concurrency: changesets-${{ github.ref }}   # serialize so two pushes can't double-publish

jobs:
  release:
    runs-on: ubuntu-24.04
    permissions:
      contents: write        # create/update the "Version Packages" PR + tags
      pull-requests: write   # open/maintain the version PR
      id-token: write        # npm provenance on publish
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0
          persist-credentials: false
      - uses: pnpm/action-setup@v6
        with: { version: 11 }   # or omit version to use the packageManager field from package.json
      - uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: pnpm
          registry-url: https://registry.npmjs.org
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - id: changesets
        uses: changesets/action@v1
        with:
          # If changesets exist -> publish. Otherwise -> open/refresh the Version PR.
          publish: pnpm changeset publish
          version: pnpm changeset version
          commit: "chore: release packages"
          title: "chore: release packages"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # npm granular access token (write tokens max 90 days) or, preferably,
          # OIDC trusted publishing: classic automation tokens were revoked 2025-12-09.
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

```jsonc
// .changeset/config.json — key options
{
  "$schema": "https://unpkg.com/@changesets/config/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "access": "public",                 // "restricted" for private scoped packages
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "linked": [],                       // [["@scope/a","@scope/b"]] to version in lockstep
  "ignore": ["@scope/internal-tooling"]
}
```

## Monorepo: build/test only what changed

Don't run the whole matrix on every PR. Two production-grade options:

```yaml
# A) Turborepo affected graph (uses the cache + dependency graph)
- run: npx turbo run build test --filter='...[origin/main]'
#   '...[origin/main]' = packages changed since main, PLUS everything that depends on them.
#   Add a Remote Cache (Vercel or self-hosted) so CI reuses local/dev build artifacts.
```

```yaml
# B) Path filters to skip irrelevant jobs entirely
on:
  pull_request:
    paths: ['packages/api/**', 'package-lock.json']
# Or use dorny/paths-filter to set per-area outputs and gate downstream jobs with `if:`.
```

For Nx use `nx affected -t build test --base=origin/main --head=HEAD`.

## Rollback Procedures

```bash
# Kubernetes — roll back the last applied revision
kubectl rollout undo deployment/api
kubectl rollout status deployment/api --timeout=120s

# ECS — point the service back at the previous task-definition revision
aws ecs update-service --cluster prod --service api \
  --task-definition api:PREVIOUS_REVISION --force-new-deployment

# Vercel / Netlify — instant promote of the prior deployment
vercel rollback           # or: vercel promote <previous-deployment-url>
```

**Rollback checklist:**
1. Revert traffic immediately — do not debug in prod.
2. Verify the rollback with health checks / SLO dashboards.
3. Communicate in the incident channel (who, what, ETA).
4. Root-cause only after stability is restored.
5. Add a regression test that reproduces the failure before re-deploying the fix.

## Supply-Chain Baseline (2026)

The 2026 expectation for a trustworthy pipeline. Adopt top-to-bottom; the first three are the highest ROI.

1. **Pin actions by commit SHA, not tag.** Tags are mutable — a compromised maintainer can repoint `v6` to malicious code (this has happened in the wild). Use the SHA and let Dependabot bump it: `uses: actions/checkout@<40-char-sha> # v6.0.2`.
2. **Least-privilege `permissions:`** at the top level (`contents: read`), widened per-job only as shown above.
3. **Pin runner images** (`ubuntu-24.04`), not `ubuntu-latest`, so an image migration is a deliberate, reviewed change.
4. **Dependency review on PRs** — block merges that introduce known-vulnerable or disallowed-license deps:
   ```yaml
   dependency-review:
     runs-on: ubuntu-24.04
     permissions: { contents: read, pull-requests: write }
     steps:
       - uses: actions/checkout@v6
       - uses: actions/dependency-review-action@v5
         with:
           fail-on-severity: high
           comment-summary-in-pr: always
   ```
5. **SBOM generation** for releases (SPDX/CycloneDX), attached to the release or image:
   ```yaml
   - uses: anchore/sbom-action@v0.24
     with: { format: spdx-json, output-file: sbom.spdx.json }
   ```
6. **Provenance attestations + image signing** — see the [build-image job](#build-scan-sign-and-attest-in-ci) (`actions/attest-build-provenance@v4`, `cosign sign`). This is your SLSA build-provenance layer; verify signatures/attestations at deploy time before promoting an image.
7. **Harden the runner** for sensitive jobs: `step-security/harden-runner@v2` to block unexpected egress and detect tampering.
8. **CodeQL** for code scanning on a schedule + PRs (`github/codeql-action@v4`); route SARIF to the Security tab.

## Status Badges

```markdown
[![CI](https://github.com/your-org/your-repo/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/your-repo/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/your-org/your-repo/branch/main/graph/badge.svg)](https://codecov.io/gh/your-org/your-repo)
```

## CI Performance Tips

- Use `concurrency` with `cancel-in-progress` to kill superseded PR runs.
- Run lint/typecheck/test as **parallel jobs**, not sequential steps on one runner.
- Use `paths`/`paths-ignore` filters to skip workflows that can't be affected by a change.
- Cache aggressively but key on the **lockfile hash** — dependencies, build artifacts, Docker layers (`mode=max`).
- Matrix only what you actually ship (don't test 4 Node versions if you deploy one).
- Pin the runner image (`ubuntu-24.04`) — predictable performance and no surprise migrations.
- For monorepos, drive everything off the affected graph (Turborepo/Nx) instead of rebuilding the world.

## Copy-Paste Starter Workflows

### Minimal CI (single Node version, no matrix)

```yaml
# .github/workflows/ci.yml
name: CI
on: { push: { branches: [main] }, pull_request: { branches: [main] } }
permissions: { contents: read }
concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }
jobs:
  build:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with: { node-version: 24, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build --if-present
```

### Deploy to Vercel on push to main

```yaml
# .github/workflows/deploy.yml
name: Deploy
on: { push: { branches: [main] } }
permissions: { contents: read }
jobs:
  deploy:
    runs-on: ubuntu-24.04
    environment: production
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with: { node-version: 24, cache: npm }
      - run: npm ci
      - run: npx vercel deploy --prod --token "$VERCEL_TOKEN" --yes
        env: { VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }} }
```

### Scheduled dependency + security maintenance

```yaml
# .github/workflows/security.yml
name: Security
on:
  schedule: [{ cron: '0 6 * * 1' }]   # Mondays 06:00 UTC
  workflow_dispatch:
permissions: { contents: read, security-events: write }
jobs:
  codeql:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v6
      - uses: github/codeql-action/init@v4
        with: { languages: javascript-typescript }
      - uses: github/codeql-action/analyze@v4
```

> Also enable **Dependabot** (`.github/dependabot.yml`) with a `github-actions` ecosystem entry so your pinned action SHAs get bumped automatically:
> ```yaml
> version: 2
> updates:
>   - package-ecosystem: github-actions
>     directory: "/"
>     schedule: { interval: weekly }
>   - package-ecosystem: npm
>     directory: "/"
>     schedule: { interval: weekly }
> ```

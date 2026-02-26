---
name: cicd-pipelines
description: "Production-grade CI/CD with GitHub Actions, deployment strategies, caching, and release automation."
---

# CI/CD Pipelines

## GitHub Actions — Core Workflow

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: npm
      - run: npm ci
      - run: npm test -- --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage-${{ matrix.node }}
          path: coverage/
```

## Caching Strategies

```yaml
# Node modules — use setup-node cache (simplest)
- uses: actions/setup-node@v4
  with: { node-version: 22, cache: npm }

# Docker layer caching
- uses: docker/build-push-action@v5
  with:
    context: .
    cache-from: type=gha
    cache-to: type=gha,mode=max

# Turborepo remote cache
- run: npx turbo build --cache-dir=.turbo
- uses: actions/cache@v4
  with:
    path: .turbo
    key: turbo-${{ hashFiles('**/turbo.json') }}-${{ github.sha }}
    restore-keys: turbo-${{ hashFiles('**/turbo.json') }}-
```

## Secrets Management

```yaml
# Repository / org secrets (Settings → Secrets)
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}

# Environment-scoped secrets (dev/staging/prod)
jobs:
  deploy:
    environment: production  # requires approval + has own secrets
    steps:
      - run: deploy --token ${{ secrets.DEPLOY_TOKEN }}

# OIDC — no stored secrets (AWS, GCP, Azure)
- uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789:role/deploy
    aws-region: us-east-1
```

**Rules:** Never echo secrets. Use `GITHUB_TOKEN` where possible. Rotate credentials quarterly. Use OIDC over static keys.

## Docker Multi-Stage Build

```dockerfile
# Build stage
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false
COPY . .
RUN npm run build

# Production stage
FROM node:22-alpine
WORKDIR /app
RUN addgroup -g 1001 app && adduser -u 1001 -G app -s /bin/sh -D app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package.json .
USER app
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## Deployment Strategies

| Strategy | Downtime | Rollback Speed | Risk | Best For |
|---|---|---|---|---|
| **Rolling** | Zero | Minutes | Medium | Stateless services |
| **Blue-Green** | Zero | Instant (swap) | Low | Critical services |
| **Canary** | Zero | Fast | Lowest | High-traffic APIs |
| **Recreate** | Yes | Slow | High | Dev/staging only |

### Blue-Green with GitHub Actions

```yaml
deploy:
  runs-on: ubuntu-latest
  environment: production
  steps:
    - name: Deploy to green
      run: ./deploy.sh green
    - name: Health check
      run: curl -f https://green.app.com/health
    - name: Swap traffic
      run: ./swap-traffic.sh green
    - name: Keep blue as rollback
      run: echo "Blue is previous version — rollback with ./swap-traffic.sh blue"
```

## Environment Promotion (dev → staging → prod)

```yaml
# Trigger chain: push → dev → staging (auto) → prod (manual approval)
deploy-dev:
  if: github.ref == 'refs/heads/main'
  environment: dev

deploy-staging:
  needs: deploy-dev
  environment: staging

deploy-prod:
  needs: deploy-staging
  environment: production  # Configure "Required reviewers" in GitHub
```

## Release Automation

### semantic-release

```json
// .releaserc.json
{
  "branches": ["main"],
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
release:
  runs-on: ubuntu-latest
  permissions: { contents: write, packages: write }
  steps:
    - uses: actions/checkout@v4
      with: { fetch-depth: 0 }
    - run: npx semantic-release
      env: { GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} }
```

### Changesets (monorepos)

```bash
npx changeset          # developer adds changeset
npx changeset version  # CI bumps versions
npx changeset publish  # CI publishes packages
```

See `references/changeset-action.yml` for the GitHub Actions workflow.

## Rollback Procedures

```bash
# Kubernetes
kubectl rollout undo deployment/api
kubectl rollout status deployment/api

# Docker / ECS
aws ecs update-service --service api --task-definition api:PREVIOUS_REVISION

# Vercel / Netlify
vercel rollback        # instant, previous deployment
```

**Rollback checklist:**
1. Revert traffic immediately (don't debug in prod)
2. Verify rollback with health checks
3. Communicate in incident channel
4. Root-cause after stability is restored
5. Add regression test before re-deploying fix

## Status Badges

```markdown
[![CI](https://github.com/org/repo/actions/workflows/ci.yml/badge.svg)](https://github.com/org/repo/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/org/repo/branch/main/graph/badge.svg)](https://codecov.io/gh/org/repo)
```

## CI Performance Tips

- Use `concurrency` to cancel stale PR runs
- Run lint/typecheck/test in **parallel jobs**, not sequential steps
- Use `paths` filter to skip irrelevant workflows
- Cache aggressively: dependencies, build artifacts, Docker layers
- Use `ubuntu-latest` (fastest) unless you need a specific OS
- Matrix only what matters (don't test 4 Node versions if you deploy 1)

See `references/workflow-templates/` for copy-paste starter workflows.


## Contents

- Copy-Paste Starter Workflows
- Minimal CI (single Node version, no matrix)
- Deploy to Vercel on push to main
- Scheduled dependency + security maintenance

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

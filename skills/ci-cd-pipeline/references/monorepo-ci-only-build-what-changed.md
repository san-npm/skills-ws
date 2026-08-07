## Contents

- Monorepo CI: Only Build What Changed
- Turborepo Affected Detection
- Nx Affected

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

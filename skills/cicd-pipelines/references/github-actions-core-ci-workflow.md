## Contents

- GitHub Actions — Core CI Workflow
- Required status checks & branch protection

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

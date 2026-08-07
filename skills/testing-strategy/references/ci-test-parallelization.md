## Contents

- CI Test Parallelization
- Jest Sharding
- Playwright Sharding
- GitHub Actions Matrix
- Playwright Sharding with Blob Reports
- Split by Timing (Faster Shards)

## CI Test Parallelization

### Jest Sharding

```bash
# Split across N shards (built-in since Jest 28)
npx jest --shard=1/4  # run shard 1 of 4
npx jest --shard=2/4
npx jest --shard=3/4
npx jest --shard=4/4
```

### Playwright Sharding

```bash
npx playwright test --shard=1/4
npx playwright test --shard=2/4
```

### GitHub Actions Matrix

Coverage merge is the part that silently goes wrong. Vitest's **V8** provider does not emit nyc/Istanbul-compatible JSON, so `nyc merge` on raw V8 output produces empty or wrong reports. Two reliable options:

**A. Let your coverage service merge (simplest, recommended).** Each shard uploads its own `lcov`/json; Codecov/Coveralls stitches them by commit SHA. No manual merge step.

```yaml
# .github/workflows/test.yml
jobs:
  test:
    strategy: { matrix: { shard: [1, 2, 3, 4] } }
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4   # installs pnpm (reads version from packageManager)
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      # Each shard writes a uniquely-named lcov so uploads don't collide.
      - run: pnpm vitest run --shard=${{ matrix.shard }}/4 --coverage
      - uses: codecov/codecov-action@v5   # merges shards server-side by SHA
        with:
          files: ./coverage/lcov.info
          flags: shard-${{ matrix.shard }}
          token: ${{ secrets.CODECOV_TOKEN }}
```

**B. Merge yourself with Istanbul JSON.** Switch the Vitest provider to `istanbul` (which writes `coverage/coverage-final.json`), upload that per shard, then merge with `istanbul-merge` + `nyc report`:

```yaml
  merge-coverage:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with: { pattern: coverage-*, path: shards/ } # each = coverage-final.json
      # Combine the per-shard Istanbul JSON into one map, then report.
      - run: npx istanbul-merge --out coverage/coverage-final.json shards/**/coverage-final.json
      - run: npx nyc report --reporter=text --reporter=lcov --temp-dir=coverage/
```

(With provider `istanbul`, also `actions/upload-artifact@v4` each shard's `coverage/coverage-final.json` as `coverage-${{ matrix.shard }}` in the `test` job.)

### Playwright Sharding with Blob Reports

```yaml
jobs:
  e2e:
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - run: npx playwright test --shard=${{ matrix.shard }}/4
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: blob-report-${{ matrix.shard }}
          path: blob-report/

  merge-reports:
    needs: e2e
    if: always()
    steps:
      - uses: actions/download-artifact@v4
        with: { pattern: blob-report-*, merge-multiple: true, path: all-blob-reports/ }
      - run: npx playwright merge-reports --reporter=html all-blob-reports/
```

### Split by Timing (Faster Shards)

```bash
# Use jest-junit to export timing, then split:
npx jest --shard=1/4 --json --outputFile=timing.json
# Or use Knapsack Pro / split-tests for optimal distribution
npm i -D @split-tests/jest
npx split-tests --junit-xml=results.xml --node-index=0 --node-total=4 | xargs npx jest
```

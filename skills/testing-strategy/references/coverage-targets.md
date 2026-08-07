## Coverage Targets

Coverage is a *floor and a smoke alarm*, not a goal. High line coverage with weak assertions is **coverage theater** — code executes but nothing is verified. Calibrate per repo and pair coverage with mutation score (see Mutation Testing) to measure whether tests actually assert behavior.

| Metric | Starting target | Enforcement | Notes |
|--------|-----------------|-------------|-------|
| Line | ≥80% | CI gate | Per-repo; mature services often sit 85–90%, early prototypes lower |
| Branch | ≥75% | CI gate | Branch > line as a quality signal |
| Critical paths (auth, payments, pricing) | 100% | Code review + explicit test | Don't average these away |
| New/changed code | ≥90% | PR diff coverage (Codecov/Coveralls patch %) | Gate the diff, not the whole repo — avoids "ratchet" pain |

**Calibration rules**
- **Don't ratchet a legacy repo to 80% overnight.** Gate *diff coverage* on new code; let total coverage drift up over time.
- **Exclude generated/boilerplate** from the denominator: migrations, codegen output (`*.gen.ts`), type-only files, barrel `index.ts`, framework scaffolding.
- **Risk-based exceptions** are fine when documented: a thin adapter with a fully covered contract test may not need 90% line coverage of glue code. Record the exception in the PR.
- **A coverage gate alone proves nothing.** Add a mutation-score check on critical modules to catch assertion-free tests.

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      // 'v8' = fast, native, line/branch from V8 (default in Vitest 1.x+).
      // 'istanbul' = slower but more precise branch/statement attribution
      // and emits coverage-final.json that merges cleanly across shards.
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'lcov'], // lcov for Codecov; json for merging
      thresholds: { lines: 80, branches: 75, functions: 80, statements: 80 },
      exclude: [
        '**/*.test.ts',
        '**/*.config.ts',
        '**/*.d.ts',
        '**/types/**',
        '**/migrations/**',
        '**/*.gen.ts',
      ],
    },
  },
});
```

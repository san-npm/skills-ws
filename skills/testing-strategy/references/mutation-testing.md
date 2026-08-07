## Contents

- Mutation Testing
- Stryker Setup
- Interpreting Mutation Scores
- Which Mutants Matter

## Mutation Testing

### Stryker Setup

```bash
npm i -D @stryker-mutator/core @stryker-mutator/vitest-runner
npx stryker init  # generates stryker.config.mjs
```

```javascript
// stryker.config.mjs
export default {
  testRunner: 'vitest',
  mutate: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.d.ts',
    '!src/types/**',
  ],
  reporters: ['html', 'clear-text', 'progress'],
  thresholds: { high: 80, low: 60, break: 50 }, // fail CI below 50%
  concurrency: 4,
  timeoutMS: 10000,
};
```

```bash
npx stryker run
# Output: mutation score, surviving mutants, killed mutants
```

### Interpreting Mutation Scores

| Score | Quality | Action |
|-------|---------|--------|
| >80% | Excellent | Maintain — tests are thorough |
| 60-80% | Good | Review surviving mutants in critical paths |
| <60% | Weak | Tests miss significant logic branches |

### Which Mutants Matter

**Focus on:**
- Surviving mutants in business logic (pricing, auth, validation)
- Boundary condition mutants (`>` → `>=`, off-by-one)
- Removed conditional mutants (entire if-block deleted, tests pass)

**Ignore:**
- Logging/telemetry mutations
- UI text mutations (test with visual regression instead)
- Timeout value mutations

```typescript
// Example: this surviving mutant means your test doesn't check the boundary
// Original:  if (age >= 18) grantAccess();
// Mutant:    if (age > 18) grantAccess();   // ← survives? Add test for age=18
test('grants access at exactly 18', () => {
  expect(grantAccess(18)).toBe(true);  // kills the mutant
});
```

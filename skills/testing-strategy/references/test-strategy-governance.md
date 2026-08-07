## Contents

- Test Strategy & Governance
- Risk-Based Test Selection
- Ownership & Naming Conventions
- Hermetic, Reproducible CI
- Contract & Schema Versioning
- Data Privacy & Secrets in Tests
- Reviewing AI-Generated Tests

## Test Strategy & Governance

The hard part of a test suite at scale isn't writing tests — it's keeping them fast, owned, trustworthy, and safe. This section covers the strategy decisions reviewers look for.

### Risk-Based Test Selection

Don't test everything equally. Spend depth where a defect is likely *and* costly.

| Risk = Likelihood x Impact | Strategy |
|----------------------------|----------|
| High impact, high churn (auth, payments, pricing, permissions) | Unit + integration + contract + an E2E happy path; 100% critical-path coverage; mutation score gate |
| High impact, low churn (money math, tax, crypto) | Exhaustive unit + property-based tests; lock with mutation testing |
| Low impact, high churn (UI copy, layout) | Visual regression + a thin smoke test; skip deep unit tests |
| Low impact, low churn (internal admin tooling) | Smoke test only; don't gold-plate |

- **Change-based selection in CI:** run the full suite on `main`/release branches; on PRs run impacted tests first. Vitest `--changed` (vs a base ref) and Jest `--onlyChanged`/`--findRelatedTests <files>` cut feedback time on large repos.
- **Property-based tests** (fast-check) beat dozens of example tests for parsers, serializers, money/units, and invariant checks: assert a property over generated inputs (`fc.assert(fc.property(fc.integer(), (n) => decode(encode(n)) === n))`).

### Ownership & Naming Conventions

- **Co-locate tests** with the code (`foo.ts` → `foo.test.ts`) so ownership follows the module via `CODEOWNERS`. A failing test should have an obvious owner.
- **Name tests by behavior, not implementation.** Pattern: `<subject> <does X> when <condition>`. Good: `rejects checkout when cart is empty`. Bad: `test calculateTotal 2`. The test name should read as a spec line in CI output.
- **One assertion *concept* per test.** Multiple `expect`s are fine if they verify one behavior; if a test needs "and also" in its name, split it.
- **Tag slow/integration/e2e** tests so they can be filtered: Vitest/Jest test name tags or separate `*.integration.test.ts` globs; gate them to run post-unit.

### Hermetic, Reproducible CI

A test that depends on wall-clock time, network, ordering, or ambient state is a future flake. Make tests hermetic:

- **No real network.** Mock outbound HTTP at the boundary (msw/nock) or use Testcontainers for real deps you control. A test hitting `api.stripe.com` is not a test, it's an outage waiting to happen.
- **Freeze time and seed randomness.** `vi.setSystemTime(...)`; seed `faker` (`faker.seed(123)`) and any RNG so failures reproduce.
- **Pin everything:** `pnpm install --frozen-lockfile`, pinned base images (`postgres:17`, not `:latest`), pinned action SHAs/majors. Cache deps, never test results.
- **Randomize test order** (Vitest `sequence.shuffle`, Jest `--randomize`, pair with `--seed` to reproduce failures) to surface hidden inter-test coupling before it becomes a flake.
- **Fail on console.error/unhandled rejections** in CI to catch silent regressions.

### Contract & Schema Versioning

Independently deployed services drift. Version the contract, not just the code:

- **Pact:** publish the consumer's `pacticipant` *version* (`--consumer-app-version=$GIT_SHA`) and tag the deploy environment; gate releases with `can-i-deploy` (shown above). Use **provider versioning + branch tags** so a new consumer contract doesn't block an old provider.
- **OpenAPI/JSON Schema:** snapshot the schema in the repo and fail the build on a breaking diff (e.g. `oasdiff breaking old.yaml new.yaml`). Treat removing a field or tightening a type as a major-version change.
- **GraphQL:** run schema-diff in CI and block breaking changes unless the field is deprecated first.
- **Events/queues:** validate message payloads against a versioned schema (Zod/Avro/Protobuf) in a contract test on both producer and consumer.

### Data Privacy & Secrets in Tests

Test data and fixtures are a common leak path — treat them like production data.

- **Never use real PII in fixtures.** Generate it: `faker.internet.email()`, synthetic names/addresses. Never paste a real customer record, a production DB dump, or a real card number into a fixture.
- **No real secrets in the repo or CI logs.** Inject via the CI secret store (`${{ secrets.X }}`), not committed `.env`. Use obvious placeholders in examples (`Bearer <test-token>`, `AXIOM_TOKEN=<your-token>`, `0xYourWalletAddress`).
- **Use provider *test* modes,** never live keys: Stripe `sk_test_...` + test cards (`4242 4242 4242 4242`), sandbox endpoints, throwaway accounts.
- **Scrub before sharing.** Strip secrets/PII from CI artifacts and screenshots (mask in Playwright). Scan with a secret scanner (gitleaks/`trufflehog`) in CI to block accidental commits.
- **Anonymize prod-derived test data:** if you must seed from production, hash/redact identifiers and emails first; document the transform.

### Reviewing AI-Generated Tests

LLM-written tests are fast to produce and easy to trust too much. Before merging, verify:

1. **The test actually asserts behavior** — not just that code runs without throwing. Reject `expect(result).toBeDefined()` standing in for a real check (classic AI coverage theater).
2. **It can fail.** Temporarily break the implementation (or read the diff) and confirm the test goes red. A test that passes against broken code is worse than none. Run it through mutation testing on critical modules.
3. **No tautologies or mock-only assertions** — e.g. asserting a mock returns the value you told it to return, or re-implementing the function inside the test.
4. **Inputs are meaningful**, including edge/boundary cases (empty, null, max, negative, unicode), not just one happy path with round numbers.
5. **No hidden coupling to internals** that will break on refactor; it should test the public contract.
6. **It's hermetic** (no real network/time/order dependence) and uses synthetic, PII-free data.
7. **Snapshots are reviewed,** not blindly accepted — an AI that runs `--update` then commits a 500-line snapshot has tested nothing.

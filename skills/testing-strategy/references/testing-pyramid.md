## Testing Pyramid

| Layer | Ratio | Speed | Confidence | Tools |
|-------|-------|-------|------------|-------|
| Unit | 70% | <10ms each | Low-medium | Vitest, Jest |
| Integration | 20% | <1s each | Medium-high | Vitest, Supertest, Testcontainers |
| E2E | 10% | <30s each | High | Playwright, Cypress |

**Key principle (risk-based, not absolute):** Push tests down the pyramid *for logic mocks can fully validate* — pure functions, branching, edge cases. But unit-testability does **not** remove the need for higher tiers. Always add a test where mocks can lie:

- **Integration** for anything that crosses a boundary (DB, queue, cache, external API) — the place where serialization, transactions, and contracts actually break.
- **Contract** between services you deploy independently (see Contract Testing below) so a unit-green provider can't silently break a consumer.
- **E2E** for critical user workflows (signup, checkout, payment, auth) where the cost of a regression is high — a few deep E2E flows beat hundreds of shallow ones.

Rule of thumb: choose the *lowest tier that can fail the way production fails*. A unit test of a SQL query string proves nothing about whether the query runs; an integration test against a real Postgres (Testcontainers) does.

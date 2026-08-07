## 7. Cost control

- **Cache** read-only results (§6.3) — biggest single lever.
- **Batch** independent calls with `Promise.all` to cut latency (not necessarily cost).
- **Set timeouts** so a hung server doesn't stall the whole agent (§3.5).
- **Cap LLM-side spend** if you grant the server `sampling` — set a per-session token/dollar budget and require approval (§3.4).
- **Pick the pricing model** that fits volume: most providers offer a free tier, a flat subscription, and/or pay-per-call. Subscriptions win above the break-even call volume; pay-per-call/x402 wins for spiky low volume. Confirm the *current* numbers on the provider's pricing page before optimizing — prices and quotas drift.

---

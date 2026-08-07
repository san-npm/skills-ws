## 8. Pay-per-call (x402) — handle the challenge safely

Some HTTP MCP/API providers gate calls behind **x402** (HTTP `402 Payment Required` + onchain micropayment). x402 is **provider-specific and still evolving** (as of Jun 2026), so do **not** hardcode a price, token, chain, or receiver — read them from the server's 402 challenge each time.

**Correct flow:** call the endpoint → on `402`, parse the challenge the server returns (it specifies `accepts`: scheme(s), network/chain-id, token contract, amount, `payTo` receiver, and a nonce/validity window) → pay *exactly that*, audience/chain-bound → resend the request with the payment proof header the scheme defines → the server (or its facilitator) verifies and serves the response.

```typescript
// Pseudocode — adapt to the provider's documented x402 scheme; the server dictates the terms.
async function x402Fetch(url: string, opts: RequestInit = {}) {
  let res = await fetch(url, opts);
  if (res.status !== 402) return res;

  const challenge = await res.json(); // { accepts: [{ scheme, network, asset, amount, payTo, nonce, expiresAt }] }
  const terms = challenge.accepts[0];

  // ---- MANDATORY GUARDRAILS before spending money ----
  assertAllowlisted(terms.network, terms.asset, terms.payTo);   // chain/token/receiver allowlist
  assertWithinSpendLimit(terms.asset, terms.amount);            // per-call + rolling budget cap
  if (Date.now() > Date.parse(terms.expiresAt)) throw new Error('challenge expired');
  await confirmWithUser(terms);                                 // explicit human approval (skip only in dev)
  if (process.env.X402_MODE !== 'mainnet') terms.network = TESTNET_FOR(terms.network); // default to testnet

  const proof = await buildAndSignPayment(terms);  // sign per the scheme; bind to chain-id + nonce (replay-safe)
  return fetch(url, { ...opts, headers: { ...opts.headers, 'X-Payment': proof } });
}
```

**Guardrails (non-negotiable for money-moving code):**
- **Allowlist** the receiver, chain-id, and token contract; reject anything the challenge proposes that isn't pre-approved (a compromised server could swap in its own receiver).
- **Spend limits**: enforce a per-call max *and* a rolling session/day budget; abort on breach.
- **Explicit user confirmation** for every payment outside an automated dev/testnet context.
- **Default to testnet**; require an explicit `mainnet` opt-in env flag before real funds move.
- **Replay safety**: bind the payment to the challenge's nonce + chain-id + expiry; never reuse a proof.
- **No hardcoded receiver/price.** These come from the live challenge, not the skill.
- This is unaudited financial automation — verify the provider's scheme and your wallet handling, and treat keys per `wallet-integration` / `security-hardening`.

KYC/jurisdiction/tax: moving stablecoins may have tax and regulatory implications in your jurisdiction — keep records and consult a professional.

---

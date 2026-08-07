## Contents

- 7. Monetization Strategy
- Revenue Model
- x402 Payment Flow (v2)
- Easiest path: the official x402-express middleware
- Hand-rolled v2 helpers (when you can't use the middleware)
- Environment Config for x402
- Stripe Subscription Setup

## 7. Monetization Strategy

### Revenue Model

```
┌─────────────────────────────────────────────────────────┐
│                  Monetization Funnel                     │
├───────────┬──────────────┬──────────────────────────────┤
│ Free Tier │ $9/mo Pro    │ x402 Pay-per-use             │
│ Hook      │ Retain       │ Scale                         │
│           │              │                               │
│ 100/day   │ 10k/day      │ Unlimited                    │
│ IP limit  │ API key      │ USDC/USDT on Base or Celo    │
│ $0        │ Stripe sub   │ $0.005 per tool call          │
└───────────┴──────────────┴──────────────────────────────┘
```

### x402 Payment Flow (v2)

x402 is an HTTP-native stablecoin payment protocol (HTTP 402). **In v2 all payment data lives in headers** (base64-encoded JSON), freeing the response body for normal use. Three headers, three steps:

```
1. Client calls a paid tool with no payment → server returns HTTP 402 + header
     PAYMENT-REQUIRED: base64(JSON array of PaymentRequirement objects)
       each: { scheme:"exact", network:"base", asset:<token addr>, maxAmountRequired, payTo, resource, ... }
2. Client picks a requirement, signs a payload, retries with header
     PAYMENT-SIGNATURE: base64(JSON PaymentPayload)
       for the `exact` scheme on EVM this carries an EIP-3009 transferWithAuthorization signature
3. Server (via a facilitator) VERIFIES then SETTLES on-chain, then returns 200 + header
     PAYMENT-RESPONSE: base64(JSON { success, transaction:<txHash>, network, payer })
```

Notes that the old skill got wrong: the header names are `PAYMENT-REQUIRED` / `PAYMENT-SIGNATURE` / `PAYMENT-RESPONSE` (not `X-Payment` / `X-Payment-Required`), values are **base64 JSON**, and verification+settlement go through a **facilitator** (Coinbase's hosted one via `@coinbase/x402`, or another provider) — you don't POST ad-hoc fields to a bare `/verify` URL. Bind each requirement to the specific `resource` URL and rely on the facilitator/scheme for replay protection (EIP-3009 nonces); never treat a 200 from a random endpoint as proof of payment.

### Easiest path: the official `x402-express` middleware

Don't hand-roll header parsing for production. `x402-express` does the 402 challenge, header (de)serialization, verification, and settlement for you:

```bash
npm install x402-express @coinbase/x402
```

```typescript
// src/x402.ts
import { paymentMiddleware } from "x402-express";
import { facilitator } from "@coinbase/x402"; // Coinbase hosted facilitator (mainnet verify+settle)

// Gate specific routes/tools by price. Use a testnet network first (e.g. "base-sepolia").
export const x402 = paymentMiddleware(
  process.env.X402_RECIPIENT_ADDRESS as `0x${string}`,   // your receiving wallet
  {
    "POST /mcp": { price: "$0.005", network: process.env.X402_NETWORK || "base" },
  },
  facilitator,                                            // verifies + settles; omit to default to x402.org
);
// app.use(x402)  — mount BEFORE the /mcp handler so unpaid calls get a 402 automatically.
```

### Hand-rolled v2 helpers (when you can't use the middleware)

These back the `buildPaymentRequired` / `settleX402` hooks referenced in §6. They call a facilitator's `/verify` and `/settle` endpoints with the v2 payload shapes:

```typescript
// src/auth/x402.ts
import type express from "express";

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64");
const unb64 = <T>(s: string): T => JSON.parse(Buffer.from(s, "base64").toString("utf8"));
const FACILITATOR = process.env.X402_FACILITATOR_URL || "https://x402.org/facilitator";

// Build the 402 challenge: a base64 JSON array of PaymentRequirement objects.
export function buildPaymentRequired(req: express.Request): string {
  const resource = `${req.protocol}://${req.get("host")}${req.originalUrl}`; // bind payment to THIS URL
  return b64([{
    scheme: "exact",
    network: process.env.X402_NETWORK || "base",
    asset: process.env.X402_ASSET,                  // token contract address (see env below)
    payTo: process.env.X402_RECIPIENT_ADDRESS,
    maxAmountRequired: process.env.X402_PRICE_ATOMIC || "5000", // atomic units (USDC 6dp → 5000 = $0.005)
    resource,
    description: "MCP tool call",
    mimeType: "application/json",
    maxTimeoutSeconds: 60,
  }]);
}

// Verify + settle a PAYMENT-SIGNATURE via the facilitator; return the PAYMENT-RESPONSE header value.
export async function settleX402(paymentSignature: string, req: express.Request):
  Promise<{ settled: boolean; paymentResponse?: string; error?: string }> {
  try {
    const payload = unb64<Record<string, unknown>>(paymentSignature);
    const requirements = unb64<unknown[]>(buildPaymentRequired(req))[0];
    const headers = { "Content-Type": "application/json" }; // + CDP auth if using @coinbase/x402 facilitator
    // 1) verify the signed payload satisfies our requirement (amount, asset, payTo, resource, nonce)
    const v = await fetch(`${FACILITATOR}/verify`, { method: "POST", headers,
      body: JSON.stringify({ paymentPayload: payload, paymentRequirements: requirements }) });
    if (!v.ok || !(await v.json()).isValid) return { settled: false, error: "Payment invalid" };
    // 2) settle on-chain (idempotent on the payload nonce) and capture the tx hash
    const s = await fetch(`${FACILITATOR}/settle`, { method: "POST", headers,
      body: JSON.stringify({ paymentPayload: payload, paymentRequirements: requirements }) });
    const settlement = await s.json();
    if (!s.ok || !settlement.success) return { settled: false, error: "Settlement failed" };
    return { settled: true, paymentResponse: b64({ success: true, transaction: settlement.transaction, network: settlement.network, payer: settlement.payer }) };
  } catch (e: any) {
    return { settled: false, error: e.message };
  }
}
```

### Environment Config for x402

```bash
# .env
X402_RECIPIENT_ADDRESS=0xYourWalletAddress
X402_NETWORK=base                 # or "base-sepolia" (testnet), "celo", etc.
X402_ASSET=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913   # token contract (USDC on Base, 6 decimals)
X402_PRICE_ATOMIC=5000            # atomic units: USDC has 6 decimals → 5000 = $0.005
X402_FACILITATOR_URL=https://x402.org/facilitator        # or your CDP/Coinbase facilitator base URL
# Coinbase hosted facilitator (verify+settle on mainnet) also needs CDP API credentials:
# CDP_API_KEY_ID=...   CDP_API_KEY_SECRET=...

# Token addresses (verify current addresses at the issuer / docs.x402.org before mainnet):
# Base USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (6 decimals)
# Celo cUSD: 0x765DE816845861e75A25fCA122bb6898B8B1282a (18 decimals → atomic units differ)
```

> **Money-moving guardrail.** Test on a testnet (`base-sepolia`) first; pin/verify the exact token contract address and decimals before mainnet; treat the wallet key as a production secret. x402 settlement is a real on-chain transfer — your facilitator choice and replay/nonce handling are security-critical. See `security-hardening`.

### Stripe Subscription Setup

```typescript
// scripts/create-stripe-product.ts — run once to set up billing
import Stripe from "stripe";

// Omit `apiVersion` to use the version pinned by your installed stripe-node release
// (recommended — it matches the SDK's TypeScript types). Pin a date only when you must
// freeze behavior, and keep it current. As of Jul 2026 the latest is "2026-06-24.dahlia";
// check https://docs.stripe.com/api/versioning and the stripe-node CHANGELOG for today's value.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
// To pin explicitly:  new Stripe(key, { apiVersion: "2026-06-24.dahlia" });
// Stripe billing details (Checkout vs Payment Links, subscriptions, migrations): see `stripe-billing`.

async function createProduct() {
  const product = await stripe.products.create({
    name: "MCP Server Pro",
    description: "100 req/min, 10k/day API access to all MCP tools",
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 900, // $9.00
    currency: "usd",
    recurring: { interval: "month" },
  });

  const link = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    after_completion: {
      type: "redirect",
      redirect: { url: "https://your-server.com/welcome?session_id={CHECKOUT_SESSION_ID}" },
    },
  });

  console.log("Checkout link:", link.url);
  console.log("Price ID:", price.id);
}

createProduct();
```

---

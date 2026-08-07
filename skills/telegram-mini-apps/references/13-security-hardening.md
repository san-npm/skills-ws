## Contents

- 13. Security Hardening <a name="security"></a>
- Checklist
- Webhook Secret Validation
- Input Sanitization
- Rate Limiting (serverless-safe)
- Never Expose Bot Token

## 13. Security Hardening <a name="security"></a>

### Checklist

- [x] **Validate initData HMAC on every API request** — never trust client-side data
- [x] **Verify webhook secret header** — prevents forged webhook calls
- [x] **Check auth_date freshness** — reject stale initData (24h max)
- [x] **Use timing-safe comparison** — prevents timing attacks on HMAC
- [x] **Sanitize all inputs** — never trust user data in SQL or messages
- [x] **Rate limit with a shared store** — never an in-memory `Map` on serverless (see below)
- [x] **Treat CloudStorage as client-controlled** — entitlements live server-side, never in CloudStorage
- [x] **Biometry is not auth** — server trust comes only from validated initData
- [x] **Log payment events** — audit trail for disputes; reconcile with `getStarTransactions`

### Webhook Secret Validation

Already shown in the webhook route above. The secret is set via `setWebhook` API and sent by Telegram in the `X-Telegram-Bot-Api-Secret-Token` header.

### Input Sanitization

```ts
// src/lib/sanitize.ts

/**
 * Validate and sanitize a product ID.
 * Only allow alphanumeric + underscores.
 */
export function sanitizeProductId(input: unknown): string | null {
  if (typeof input !== "string") return null;
  if (input.length > 64) return null;
  if (!/^[a-zA-Z0-9_]+$/.test(input)) return null;
  return input;
}

/**
 * Validate a Telegram user ID.
 */
export function sanitizeUserId(input: unknown): number | null {
  const num =
    typeof input === "number" ? input : parseInt(String(input), 10);
  if (!Number.isInteger(num) || num <= 0 || num > 2 ** 52) return null;
  return num;
}

/**
 * Sanitize text for display (strip control characters).
 */
export function sanitizeText(input: string, maxLength = 500): string {
  return input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // strip control chars
    .slice(0, maxLength)
    .trim();
}
```

### Rate Limiting (serverless-safe)

> **Do not ship an in-memory `Map` rate limiter to Vercel/Cloudflare/any multi-instance deploy.** Each serverless invocation may run in a fresh isolate, so the counter resets between requests and across regions — attackers fan out and the limit never trips. The `setInterval` cleanup also won't run on serverless. Use a shared store (Upstash Redis, Vercel KV, Cloudflare Durable Object / Rate Limiting binding, or your DB).

**Recommended — Upstash Redis sliding window** (works on Vercel/Edge/Node, free tier available):

```bash
npm install @upstash/ratelimit @upstash/redis
```

```ts
// src/lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Reads UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN from env.
const redis = Redis.fromEnv();

const limiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "60 s"), // 30 req / 60s per key
  analytics: true,
  prefix: "miniapp:rl",
});

/** Returns true if the caller is OVER the limit (i.e. should be blocked). */
export async function isRateLimited(key: string): Promise<boolean> {
  const { success } = await limiter.limit(key);
  return !success;
}
```

Use it in the auth middleware, keyed by the validated user id (so it survives IP rotation):

```ts
// inside withTelegramAuth, after validation succeeds:
if (await isRateLimited(`u:${result.data.user.id}`)) {
  return NextResponse.json({ error: "Too many requests" }, { status: 429 });
}
```

**Vercel KV alternative** (same shape — Upstash-compatible):

```ts
import { kv } from "@vercel/kv";
import { Ratelimit } from "@upstash/ratelimit";
const limiter = new Ratelimit({ redis: kv, limiter: Ratelimit.slidingWindow(30, "60 s") });
```

> For a **single long-lived Node process** (a VPS, not serverless) the in-memory `Map` approach is acceptable, but gate it behind an explicit `process.env.RATE_LIMIT_BACKEND === "memory"` flag and keep the cleanup `setInterval` — never make it the default for a Vercel deploy.

### Never Expose Bot Token

```ts
// ❌ WRONG — bot token in client-side code
const BOT_TOKEN = "<your-bot-token>"; // NEVER hardcode or ship to the client

// ✅ CORRECT — only in server-side code / env vars
// .env.local (never committed to git)
// BOT_TOKEN=<your-bot-token-from-botfather>

// In API routes (server-side only):
const BOT_TOKEN = process.env.BOT_TOKEN!;
```

---

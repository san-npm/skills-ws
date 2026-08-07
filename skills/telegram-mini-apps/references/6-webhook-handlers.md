## Contents

- 6. Webhook Handlers <a name="webhook-handlers"></a>
- Next.js Webhook Route
- Setting the Webhook
- Environment Variables

## 6. Webhook Handlers <a name="webhook-handlers"></a>

### Next.js Webhook Route

```ts
// src/app/api/bot/route.ts
import { NextRequest, NextResponse } from "next/server";
import { handleWebhook } from "@/lib/bot";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  // Validate webhook secret header
  if (WEBHOOK_SECRET) {
    const secretHeader = req.headers.get("x-telegram-bot-api-secret-token");
    if (secretHeader !== WEBHOOK_SECRET) {
      console.warn("Webhook secret mismatch — rejecting request");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    // grammY's webhookCallback handles the update
    return await handleWebhook(req);
  } catch (err) {
    console.error("Webhook error:", err);
    // Always return 200 to Telegram to prevent retries
    return NextResponse.json({ ok: true });
  }
}

// Telegram only sends POST; reject other methods
export async function GET() {
  return NextResponse.json({ status: "Bot webhook active" });
}
```

### Setting the Webhook

```ts
// scripts/set-webhook.ts
// Run: npx tsx scripts/set-webhook.ts

const BOT_TOKEN = process.env.BOT_TOKEN!;
const WEBHOOK_URL = process.env.WEBHOOK_URL!; // e.g. https://yourapp.vercel.app/api/bot
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET!;

async function setWebhook() {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: WEBHOOK_URL,
      secret_token: WEBHOOK_SECRET,
      allowed_updates: [
        "message",
        "callback_query",
        "pre_checkout_query",
      ],
      drop_pending_updates: true,
    }),
  });

  const data = await res.json();
  console.log("setWebhook result:", JSON.stringify(data, null, 2));

  // Verify
  const infoRes = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`
  );
  const info = await infoRes.json();
  console.log("Webhook info:", JSON.stringify(info, null, 2));
}

setWebhook().catch(console.error);
```

### Environment Variables

```env
# .env.local
BOT_TOKEN=<your-bot-token-from-botfather>
DEV_BOT_TOKEN=<throwaway-bot-token-for-local-mock-signing>   # dev only
# Keep every bot token server-only. Never use a NEXT_PUBLIC_* bot-token variable.
MINI_APP_URL=https://yourapp.vercel.app
WEBHOOK_URL=https://yourapp.vercel.app/api/bot
WEBHOOK_SECRET=<random-secret-at-least-32-chars>

# Database
DATABASE_URL=file:local.db
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=<your-turso-auth-token>

# Rate limiting (serverless-safe)
UPSTASH_REDIS_REST_URL=<your-upstash-rest-url>
UPSTASH_REDIS_REST_TOKEN=<your-upstash-rest-token>
```

---

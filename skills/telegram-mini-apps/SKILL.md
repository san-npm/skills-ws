---
name: telegram-mini-apps
description: Build Telegram Mini Apps with Stars payments — TWA SDK, HMAC validation, bot webhooks, deep linking, Next.js deployment
version: 1.0.0
---

# Telegram Mini Apps with Stars Payments — Expert Skill

> The definitive guide to building Telegram Mini Apps (TWA) with Stars payments, bot webhooks, and production deployment.

## Table of Contents

1. [Overview & Architecture](#overview)
2. [TWA SDK Setup](#twa-sdk-setup)
3. [initData HMAC Validation](#initdata-validation)
4. [Bot Setup with grammY](#bot-setup-grammy)
5. [Webhook Handlers](#webhook-handlers)
6. [Stars Payments (XTR)](#stars-payments)
7. [Deep Linking](#deep-linking)
8. [Telegram Theme CSS Variables](#theme-css-variables)
9. [MarkdownV2 Escaping](#markdownv2-escaping)
10. [Database Options](#database-options)
11. [Next.js Deployment](#nextjs-deployment)
12. [Security Hardening](#security)
13. [Complete Example App](#complete-example)
14. [Troubleshooting](#troubleshooting)

---

## 1. Overview & Architecture <a name="overview"></a>

Telegram Mini Apps (formerly Web Apps) are web applications that run inside Telegram's in-app browser. They receive user context via `initData`, can trigger native Telegram UI, and accept payments via Telegram Stars (XTR currency).

### Architecture

```
┌─────────────────────────────────────────┐
│  Telegram Client (iOS/Android/Desktop)  │
│  ┌───────────────────────────────────┐  │
│  │  Mini App WebView (your Next.js)  │  │
│  │  - TWA SDK for native bridge      │  │
│  │  - Theme CSS vars auto-injected   │  │
│  │  - initData passed on launch      │  │
│  └──────────┬────────────────────────┘  │
└─────────────┼───────────────────────────┘
              │ HTTPS API calls
              ▼
┌─────────────────────────────────────────┐
│  Your Backend (Next.js API Routes)      │
│  - Validate initData HMAC              │
│  - Handle bot webhooks (grammY)         │
│  - Process Stars payments               │
│  - Database (SQLite/Turso)              │
└─────────────────────────────────────────┘
```

### Key Concepts

- **Mini App**: Your web frontend loaded inside Telegram's WebView
- **Bot**: The Telegram bot that owns the Mini App and handles payments
- **initData**: Signed payload Telegram passes to your app with user info
- **Stars (XTR)**: Telegram's digital currency for in-app purchases
- **Webhook**: Telegram sends bot updates to your HTTPS endpoint

### Prerequisites

- Node.js 18+
- A Telegram bot token (from @BotFather)
- A public HTTPS URL (Vercel, Cloudflare, or ngrok for dev)
- Mini App URL configured via @BotFather → `/newapp` or `/setmenubutton`

---

## 2. TWA SDK Setup <a name="twa-sdk-setup"></a>

### Installation

```bash
npm install @telegram-apps/sdk @telegram-apps/sdk-react
```

### Initialize the SDK (React)

```tsx
// src/app/providers.tsx
"use client";

import { useEffect, useState, type PropsWithChildren } from "react";
import {
  init,
  miniApp,
  themeParams,
  viewport,
  backButton,
  mainButton,
  closingBehavior,
  swipeBehavior,
} from "@telegram-apps/sdk-react";

export function TelegramProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Initialize the SDK — must be called before any other SDK method
      init();

      // Mount components you need
      miniApp.mount();
      themeParams.mount();
      viewport.mount().then(() => {
        viewport.expand(); // expand to full height
      });

      // Optional: back button, main button
      backButton.mount();
      mainButton.mount();

      // Prevent accidental close
      closingBehavior.mount();
      closingBehavior.enableConfirmation();

      // Disable swipe-to-close on iOS
      if (swipeBehavior.mount.isAvailable()) {
        swipeBehavior.mount();
        swipeBehavior.disableVerticalSwipe();
      }

      // Signal to Telegram that the app is ready
      miniApp.ready();
      setReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "SDK init failed");
    }
  }, []);

  if (error) return <div>Error: {error}</div>;
  if (!ready) return <div>Loading...</div>;

  return <>{children}</>;
}
```

### Accessing User Data (Client-Side)

```tsx
// src/hooks/useTelegramUser.ts
"use client";

import { initDataRaw, initData, useSignal } from "@telegram-apps/sdk-react";

export function useTelegramUser() {
  // In SDK v2, initDataRaw and initData return signals — use useSignal() to subscribe
  const raw = useSignal(initDataRaw); // the raw query string for backend validation
  const data = useSignal(initData);   // parsed initData object

  if (!data || !data.user) return null;

  return {
    id: data.user.id,
    firstName: data.user.firstName,
    lastName: data.user.lastName,
    username: data.user.username,
    languageCode: data.user.languageCode,
    isPremium: data.user.isPremium,
    photoUrl: data.user.photoUrl,
    raw, // send this to your backend for HMAC validation
  };
}
```

### Sending initData to Your Backend

```tsx
// src/lib/api.ts
// Use retrieveLaunchParams() for non-React contexts — it reads cached launch
// data without requiring a reactive signal context (no useSignal needed).
// initDataRaw() from sdk-react requires a React component/hook context.
import { retrieveLaunchParams } from "@telegram-apps/sdk";

export async function apiCall(path: string, options: RequestInit = {}) {
  const { initDataRaw: raw } = retrieveLaunchParams();

  const res = await fetch(path, {
    ...options,
    headers: {
      ...options.headers,
      "Content-Type": "application/json",
      // Send initData as authorization header
      Authorization: `tma ${raw}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }

  return res.json();
}
```

### Development Without Telegram

For local development outside Telegram's WebView, mock the environment:

```tsx
// src/app/providers.tsx — add mock support
import { mockTelegramEnv, parseInitData } from "@telegram-apps/sdk-react";

function mockDevEnvironment() {
  if (typeof window === "undefined") return;
  if (window.location.hostname !== "localhost") return;

  const initDataRaw = new URLSearchParams([
    ["user", JSON.stringify({
      id: 123456789,
      first_name: "Dev",
      last_name: "User",
      username: "devuser",
      language_code: "en",
    })],
    ["hash", "mock_hash_for_dev"],
    ["auth_date", String(Math.floor(Date.now() / 1000))],
    ["query_id", "mock_query_id"],
  ]).toString();

  mockTelegramEnv({
    themeParams: {
      accentTextColor: "#6ab2f2",
      bgColor: "#17212b",
      buttonColor: "#5288c1",
      buttonTextColor: "#ffffff",
      destructiveTextColor: "#ec3942",
      headerBgColor: "#17212b",
      hintColor: "#708499",
      linkColor: "#6ab3f3",
      secondaryBgColor: "#232e3c",
      sectionBgColor: "#17212b",
      sectionHeaderTextColor: "#6ab3f3",
      subtitleTextColor: "#708499",
      textColor: "#f5f5f5",
    },
    initData: parseInitData(initDataRaw),
    initDataRaw,
    version: "8.0",
    platform: "tdesktop",
  });
}
```

---

## 3. initData HMAC Validation <a name="initdata-validation"></a>

**This is critical for security.** The initData string is signed by Telegram using HMAC-SHA256. Your backend MUST validate it before trusting any user data.

### How It Works

1. Telegram creates a data string from initData fields (sorted alphabetically, excluding `hash`)
2. A secret key is derived: `HMAC-SHA256("WebAppData", bot_token)` — key is `"WebAppData"`, data is `bot_token`
3. The signature is: `HMAC-SHA256(secret_key, data_check_string)` — key is `secret_key`, data is `data_check_string`
4. You compare this against the `hash` field

### Complete Validation Implementation

```ts
// src/lib/validate-init-data.ts
import { createHmac, timingSafeEqual as cryptoTimingSafeEqual } from "node:crypto";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

interface InitData {
  query_id?: string;
  user?: TelegramUser;
  auth_date: number;
  hash: string;
  start_param?: string;
  chat_type?: string;
  chat_instance?: string;
}

interface ValidationResult {
  valid: boolean;
  data?: InitData;
  error?: string;
}

const MAX_AGE_SECONDS = 86400; // 24 hours — adjust for your needs

/**
 * Validate Telegram Mini App initData using HMAC-SHA256.
 *
 * @param initDataRaw - The raw query string from the client
 * @param botToken    - Your bot token from @BotFather
 * @returns           - Validation result with parsed data
 */
export function validateInitData(
  initDataRaw: string,
  botToken: string
): ValidationResult {
  if (!initDataRaw || !botToken) {
    return { valid: false, error: "Missing initData or bot token" };
  }

  // Parse the query string
  const params = new URLSearchParams(initDataRaw);
  const hash = params.get("hash");

  if (!hash) {
    return { valid: false, error: "Missing hash in initData" };
  }

  // Validate hash is a 64-character hex string before passing to Buffer.from.
  // Invalid hex silently produces a shorter buffer, causing timingSafeEqual to throw.
  if (!/^[0-9a-f]{64}$/i.test(hash)) {
    return { valid: false, error: "Invalid hash format in initData" };
  }

  // Build the data-check-string:
  // 1. Remove the hash parameter
  // 2. Sort remaining params alphabetically by key
  // 3. Join as "key=value" with newlines
  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  // Derive the secret key: HMAC-SHA256("WebAppData", bot_token)
  const secretKey = createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  // Compute the expected hash
  const computedHash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  // Timing-safe comparison to prevent timing attacks
  // Both are hex strings — use "hex" encoding so Buffer lengths match
  // the byte count (32 bytes) rather than the string length (64 chars).
  // Using "utf-8" works too since hex is ASCII-safe, but "hex" is semantically correct.
  const computedBuf = Buffer.from(computedHash, "hex");
  const hashBuf = Buffer.from(hash, "hex");

  if (computedBuf.length !== hashBuf.length || !cryptoTimingSafeEqual(computedBuf, hashBuf)) {
    return { valid: false, error: "Invalid hash — signature mismatch" };
  }

  // Check auth_date freshness
  const authDateStr = params.get("auth_date");
  if (!authDateStr) {
    return { valid: false, error: "Missing auth_date in initData" };
  }
  const authDate = parseInt(authDateStr, 10);
  const now = Math.floor(Date.now() / 1000);

  if (now - authDate > MAX_AGE_SECONDS) {
    return { valid: false, error: "initData expired" };
  }

  // Parse user data
  const userStr = params.get("user");
  let user: TelegramUser | undefined;
  if (userStr) {
    try {
      user = JSON.parse(userStr);
    } catch {
      return { valid: false, error: "Invalid user JSON in initData" };
    }
  }

  return {
    valid: true,
    data: {
      query_id: params.get("query_id") || undefined,
      user,
      auth_date: authDate,
      hash,
      start_param: params.get("start_param") || undefined,
      chat_type: params.get("chat_type") || undefined,
      chat_instance: params.get("chat_instance") || undefined,
    },
  };
}
```

### API Route Middleware

```ts
// src/lib/auth-middleware.ts
import { validateInitData } from "./validate-init-data";
import { NextRequest, NextResponse } from "next/server";

const BOT_TOKEN = process.env.BOT_TOKEN!;

export function withTelegramAuth(
  handler: (req: NextRequest, userId: number) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const authHeader = req.headers.get("authorization") || "";

    if (!authHeader.startsWith("tma ")) {
      return NextResponse.json(
        { error: "Missing Telegram authorization" },
        { status: 401 }
      );
    }

    const initDataRaw = authHeader.slice(4); // strip "tma "
    const result = validateInitData(initDataRaw, BOT_TOKEN);

    if (!result.valid || !result.data?.user) {
      return NextResponse.json(
        { error: result.error || "Invalid initData" },
        { status: 401 }
      );
    }

    return handler(req, result.data.user.id);
  };
}
```

### Usage in API Route

```ts
// src/app/api/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withTelegramAuth } from "@/lib/auth-middleware";

export const POST = withTelegramAuth(async (req, userId) => {
  // userId is guaranteed valid at this point
  const body = await req.json();

  // ... your logic here

  return NextResponse.json({ ok: true, userId });
});
```

---

## 4. Bot Setup with grammY <a name="bot-setup-grammy"></a>

### Installation

```bash
npm install grammy
```

### Bot Instance (Singleton)

```ts
// src/lib/bot.ts
import { Bot, webhookCallback } from "grammy";
import { escapeMarkdownV2 } from "./telegram-utils";

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error("BOT_TOKEN env var is required");

// Create bot instance — singleton for the process
export const bot = new Bot(BOT_TOKEN);

// Register commands
bot.command("start", async (ctx) => {
  const startParam = ctx.match; // deep link parameter

  if (startParam) {
    await handleDeepLink(ctx, startParam);
    return;
  }

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: "🚀 Open App",
          web_app: { url: process.env.MINI_APP_URL! },
        },
      ],
    ],
  };

  await ctx.reply("Welcome\\! Tap below to open the app\\.", {
    parse_mode: "MarkdownV2",
    reply_markup: keyboard,
  });
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    "Available commands:\n" +
    "/start — Launch the app\n" +
    "/help — Show this message\n" +
    "/balance — Check your Stars balance"
  );
});

// Error handler
bot.catch((err) => {
  console.error("Bot error:", err);
});

// Deep link handler
async function handleDeepLink(ctx: any, param: string) {
  // Parse deep link: "buy_123" → action=buy, id=123
  const [action, ...rest] = param.split("_");
  const id = rest.join("_");

  switch (action) {
    case "buy":
      await sendStarsInvoice(ctx.chat.id, id);
      break;
    case "ref":
      await handleReferral(ctx, id);
      break;
    default:
      await ctx.reply("Unknown link. Use /start to begin.");
  }
}

async function handleReferral(ctx: any, referrerId: string) {
  await ctx.reply(`Welcome! You were referred by a friend.`);
}

// Export webhook handler for Next.js
export const handleWebhook = webhookCallback(bot, "std/http");
```

---

## 5. Webhook Handlers <a name="webhook-handlers"></a>

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
BOT_TOKEN=7123456789:AAF...your-bot-token
MINI_APP_URL=https://yourapp.vercel.app
WEBHOOK_URL=https://yourapp.vercel.app/api/bot
WEBHOOK_SECRET=your-random-secret-string-at-least-32-chars

# Database
DATABASE_URL=file:local.db
TURSO_DATABASE_URL=libsql://your-db-turso.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token
```

---

## 6. Stars Payments (XTR) <a name="stars-payments"></a>

Telegram Stars is the in-app currency. Users buy Stars with real money, then spend them in Mini Apps. You receive Stars and can convert them to TON or fiat via @BotFather.

### Key Facts

- Currency code: `XTR` (always use this string)
- Minimum price: 1 Star
- No provider_token needed (pass empty string `""`)
- You MUST answer `pre_checkout_query` within 10 seconds
- Refunds via `refundStarPayment` API method

### Send an Invoice

```ts
// src/lib/payments.ts
import { bot } from "./bot";

interface Product {
  id: string;
  title: string;
  description: string;
  priceInStars: number;
  photoUrl?: string;
}

// Product catalog — in production, load from database
const PRODUCTS: Record<string, Product> = {
  premium_week: {
    id: "premium_week",
    title: "Premium Access (1 Week)",
    description: "Unlock all premium features for 7 days.",
    priceInStars: 50,
    photoUrl: "https://yourapp.com/images/premium.png",
  },
  credits_100: {
    id: "credits_100",
    title: "100 Credits",
    description: "Purchase 100 credits to use in the app.",
    priceInStars: 25,
  },
};

export { PRODUCTS };

/**
 * Send a Stars invoice to a user.
 */
export async function sendStarsInvoice(
  chatId: number,
  productId: string
): Promise<void> {
  const product = PRODUCTS[productId];
  if (!product) {
    await bot.api.sendMessage(chatId, "Product not found.");
    return;
  }

  // grammY v1.30+ removed provider_token from the positional signature.
  // Pass title, description, payload, currency, and prices as positional args,
  // then provider_token and other options in the `other` object parameter.
  await bot.api.sendInvoice(
    chatId,
    product.title,           // title
    product.description,     // description
    `${product.id}`,         // payload — you'll receive this in pre_checkout_query
    "XTR",                   // currency — always "XTR" for Stars
    [
      {
        label: product.title,
        amount: product.priceInStars, // amount in Stars (1 Star = 1 unit, no cents)
      },
    ],
    {
      provider_token: "",    // empty string for Stars — moved to `other` in grammY v1.30+
      photo_url: product.photoUrl,
      // For digital goods, no shipping needed:
      need_shipping_address: false,
      is_flexible: false,
    }
  );
}
```

### Handle pre_checkout_query

**You MUST answer this within 10 seconds or the payment fails.**

```ts
// In src/lib/bot.ts — add these handlers

import { db } from "./database";
import { PRODUCTS } from "./payments";

// Pre-checkout: validate the order before Telegram charges the user
bot.on("pre_checkout_query", async (ctx) => {
  const query = ctx.preCheckoutQuery;

  try {
    // Validate the payload
    const productId = query.invoice_payload;
    const product = PRODUCTS[productId];

    if (!product) {
      // Second argument is the error_message string directly, not an object
      await ctx.answerPreCheckoutQuery(false, "This product is no longer available.");
      return;
    }

    // Validate price hasn't changed
    if (query.total_amount !== product.priceInStars) {
      await ctx.answerPreCheckoutQuery(false, "Price has changed. Please try again.");
      return;
    }

    // All good — approve the checkout
    await ctx.answerPreCheckoutQuery(true);
  } catch (err) {
    console.error("pre_checkout_query error:", err);
    // If anything goes wrong, reject — better than charging for nothing
    await ctx.answerPreCheckoutQuery(false, "Something went wrong. Please try again.");
  }
});

// Successful payment: fulfill the order
bot.on("message:successful_payment", async (ctx) => {
  const payment = ctx.message!.successful_payment!;

  const userId = ctx.from!.id;
  const productId = payment.invoice_payload;
  const totalAmount = payment.total_amount;
  const telegramPaymentChargeId = payment.telegram_payment_charge_id;
  const providerPaymentChargeId = payment.provider_payment_charge_id;

  console.log(
    `Payment received: user=${userId} product=${productId} ` +
    `amount=${totalAmount} XTR charge=${telegramPaymentChargeId}`
  );

  try {
    // Record in database
    await db.execute({
      sql: `INSERT INTO payments (user_id, product_id, amount, telegram_charge_id, provider_charge_id, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      args: [
        userId,
        productId,
        totalAmount,
        telegramPaymentChargeId,
        providerPaymentChargeId,
      ],
    });

    // Fulfill the purchase
    await fulfillPurchase(userId, productId);

    // Confirm to user
    const product = PRODUCTS[productId];
    await ctx.reply(
      `✅ Payment successful\\!\n\n` +
      `You purchased *${escapeMarkdownV2(product?.title || productId)}*\n` +
      `Amount: ${totalAmount} ⭐`,
      { parse_mode: "MarkdownV2" }
    );
  } catch (err) {
    console.error("Payment fulfillment error:", err);
    // IMPORTANT: Log this for manual resolution.
    // The payment already went through — you need to fulfill it.
    await ctx.reply(
      "Payment received but there was an error activating your purchase. " +
      "Please contact support with your payment ID: " +
      telegramPaymentChargeId
    );
  }
});

async function fulfillPurchase(userId: number, productId: string) {
  switch (productId) {
    case "premium_week":
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await db.execute({
        sql: `INSERT OR REPLACE INTO subscriptions (user_id, plan, expires_at)
              VALUES (?, 'premium', ?)`,
        args: [userId, expiresAt.toISOString()],
      });
      break;

    case "credits_100":
      await db.execute({
        sql: `UPDATE users SET credits = credits + 100 WHERE telegram_id = ?`,
        args: [userId],
      });
      break;

    default:
      console.warn(`Unknown product: ${productId}`);
  }
}
```

### Refund a Payment

```ts
// src/lib/payments.ts — add to existing file

export async function refundStarPayment(
  userId: number,
  telegramPaymentChargeId: string
): Promise<boolean> {
  try {
    // Use bot.api.refundStarPayment — not bot.api.raw
    await bot.api.refundStarPayment(userId, telegramPaymentChargeId);
    return true;
  } catch (err) {
    console.error("Refund failed:", err);
    return false;
  }
}
```

### Triggering Payment from Mini App Frontend

```tsx
// src/components/BuyButton.tsx
"use client";

import { apiCall } from "@/lib/api";

export function BuyButton({ productId }: { productId: string }) {
  const handleBuy = async () => {
    // Option 1: Ask backend to send invoice via bot message
    await apiCall("/api/purchase", {
      method: "POST",
      body: JSON.stringify({ productId }),
    });
    // The bot will send an invoice message to the user's chat

    // Option 2: Use deep link to trigger invoice
    // window.open(`https://t.me/YourBotName?start=buy_${productId}`, "_blank");
  };

  return (
    <button onClick={handleBuy} className="buy-button">
      ⭐ Buy with Stars
    </button>
  );
}
```

```ts
// src/app/api/purchase/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withTelegramAuth } from "@/lib/auth-middleware";
import { sendStarsInvoice } from "@/lib/payments";

export const POST = withTelegramAuth(async (req, userId) => {
  const { productId } = await req.json();

  if (typeof productId !== "string" || !/^[a-z0-9_]+$/.test(productId)) {
    return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
  }

  await sendStarsInvoice(userId, productId);

  return NextResponse.json({ ok: true });
});
```

---

## 7. Deep Linking <a name="deep-linking"></a>

Deep links let you pass parameters when users open your bot via a link.

### Link Format

```
https://t.me/YourBotName?start=PARAMETER
https://t.me/YourBotName?startapp=PARAMETER   (opens Mini App directly)
```

- `?start=` → opens chat with bot, triggers `/start PARAMETER`
- `?startapp=` → opens Mini App directly, `PARAMETER` available in initData.start_param

### Handling /start Deep Links

```ts
// Already shown in bot.ts above, but here's the full pattern:
bot.command("start", async (ctx) => {
  const param = ctx.match; // everything after "/start "

  if (!param) {
    // No deep link — show default welcome
    return;
  }

  // Parse compound parameters: "action_data"
  const underscoreIdx = param.indexOf("_");
  const action = underscoreIdx > -1 ? param.slice(0, underscoreIdx) : param;
  const data = underscoreIdx > -1 ? param.slice(underscoreIdx + 1) : "";

  switch (action) {
    case "buy":
      await sendStarsInvoice(ctx.chat.id, data);
      break;
    case "ref":
      await processReferral(ctx.from.id, data);
      await ctx.reply("Welcome! 🎉");
      break;
    case "open":
      // Redirect to Mini App with context
      await ctx.reply("Opening app...", {
        reply_markup: {
          inline_keyboard: [[
            { text: "Open", web_app: { url: `${process.env.MINI_APP_URL}?item=${data}` } }
          ]]
        }
      });
      break;
    default:
      await ctx.reply("Welcome! Use /help to see available commands.");
  }
});
```

### Reading startapp in Mini App

```tsx
// The start_param is available in initData — use useSignal() in React components
import { initData, useSignal } from "@telegram-apps/sdk-react";

function App() {
  const data = useSignal(initData); // SDK v2 signals require useSignal()
  const startParam = data?.startParam; // e.g., "item_123"

  useEffect(() => {
    if (startParam) {
      // Route to the appropriate view
      router.push(`/item/${startParam}`);
    }
  }, [startParam]);
}
```

---

## 8. Telegram Theme CSS Variables <a name="theme-css-variables"></a>

Telegram injects CSS variables into the Mini App WebView so your app can match the user's theme. **Always use these instead of hardcoding colors.**

### Available Variables

```css
/* Core colors */
--tg-theme-bg-color              /* Main background */
--tg-theme-text-color            /* Primary text */
--tg-theme-hint-color            /* Secondary/hint text */
--tg-theme-link-color            /* Links */
--tg-theme-button-color          /* Primary button background */
--tg-theme-button-text-color     /* Primary button text */

/* Extended palette (Telegram 7.0+) */
--tg-theme-secondary-bg-color    /* Secondary background (cards, sections) */
--tg-theme-header-bg-color       /* Header background */
--tg-theme-accent-text-color     /* Accent text */
--tg-theme-section-bg-color      /* Section/card background */
--tg-theme-section-header-text-color  /* Section headers */
--tg-theme-subtitle-text-color   /* Subtitles */
--tg-theme-destructive-text-color /* Destructive/danger actions */

/* Viewport */
--tg-viewport-height             /* Visible viewport height */
--tg-viewport-stable-height      /* Stable height (excludes keyboard) */
```

### Base CSS Setup

```css
/* src/app/globals.css */

:root {
  /* Fallbacks for development outside Telegram */
  --tg-theme-bg-color: #ffffff;
  --tg-theme-text-color: #000000;
  --tg-theme-hint-color: #999999;
  --tg-theme-link-color: #2481cc;
  --tg-theme-button-color: #5288c1;
  --tg-theme-button-text-color: #ffffff;
  --tg-theme-secondary-bg-color: #f0f0f0;
  --tg-theme-header-bg-color: #ffffff;
  --tg-theme-accent-text-color: #2481cc;
  --tg-theme-section-bg-color: #ffffff;
  --tg-theme-section-header-text-color: #2481cc;
  --tg-theme-subtitle-text-color: #999999;
  --tg-theme-destructive-text-color: #cc2424;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
  overflow: hidden; /* Mini App manages its own scroll */
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  background-color: var(--tg-theme-bg-color);
  color: var(--tg-theme-text-color);
  -webkit-font-smoothing: antialiased;
  /* Prevent text selection in app-like UI */
  -webkit-user-select: none;
  user-select: none;
}

/* Allow text selection in content areas */
.selectable {
  -webkit-user-select: text;
  user-select: text;
}

/* Scrollable content area */
.content {
  height: var(--tg-viewport-stable-height, 100vh);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* Component examples */
.card {
  background: var(--tg-theme-section-bg-color);
  border-radius: 12px;
  padding: 16px;
  margin: 8px 16px;
}

.card-title {
  color: var(--tg-theme-section-header-text-color);
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.hint {
  color: var(--tg-theme-hint-color);
  font-size: 13px;
}

.button-primary {
  background: var(--tg-theme-button-color);
  color: var(--tg-theme-button-text-color);
  border: none;
  border-radius: 10px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  transition: opacity 0.2s;
}

.button-primary:active {
  opacity: 0.7;
}

.button-destructive {
  background: transparent;
  color: var(--tg-theme-destructive-text-color);
  border: none;
  font-size: 16px;
  cursor: pointer;
}

.divider {
  height: 1px;
  background: var(--tg-theme-hint-color);
  opacity: 0.2;
  margin: 0 16px;
}

a {
  color: var(--tg-theme-link-color);
  text-decoration: none;
}
```

### Tailwind CSS Integration

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        tg: {
          bg: "var(--tg-theme-bg-color)",
          text: "var(--tg-theme-text-color)",
          hint: "var(--tg-theme-hint-color)",
          link: "var(--tg-theme-link-color)",
          button: "var(--tg-theme-button-color)",
          "button-text": "var(--tg-theme-button-text-color)",
          "secondary-bg": "var(--tg-theme-secondary-bg-color)",
          "header-bg": "var(--tg-theme-header-bg-color)",
          accent: "var(--tg-theme-accent-text-color)",
          "section-bg": "var(--tg-theme-section-bg-color)",
          "section-header": "var(--tg-theme-section-header-text-color)",
          subtitle: "var(--tg-theme-subtitle-text-color)",
          destructive: "var(--tg-theme-destructive-text-color)",
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

Usage: `<div className="bg-tg-bg text-tg-text">` — adapts automatically to user theme.

---

## 9. MarkdownV2 Escaping <a name="markdownv2-escaping"></a>

Telegram's MarkdownV2 requires escaping special characters. Get this wrong and your messages fail silently or look broken.

### Characters That Must Be Escaped

```
_ * [ ] ( ) ~ ` > # + - = | { } . !
```

### Escape Function

```ts
// src/lib/telegram-utils.ts

/**
 * Escape a string for Telegram MarkdownV2.
 * Use this for ANY user-generated or dynamic text inserted into MarkdownV2 messages.
 */
export function escapeMarkdownV2(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

/**
 * Escape text for use inside a MarkdownV2 code block (`` ` `` or ``` ``` ```).
 * Only ` and \ need escaping inside code blocks.
 */
export function escapeMarkdownV2Code(text: string): string {
  return text.replace(/([`\\])/g, "\\$1");
}

/**
 * Escape text for use inside a MarkdownV2 link URL.
 * Only ) and \ need escaping inside (...) of links.
 */
export function escapeMarkdownV2Url(url: string): string {
  return url.replace(/([)\\])/g, "\\$1");
}

// --- Usage examples ---

// Simple message with dynamic content
const username = "John_Doe";
const msg = `Hello, *${escapeMarkdownV2(username)}*\\!`;
// Result: "Hello, *John\_Doe*\!"

// Link with dynamic URL
const title = "My Page (v2)";
const url = "https://example.com/page?a=1&b=2";
const linkMsg = `[${escapeMarkdownV2(title)}](${escapeMarkdownV2Url(url)})`;

// Code block
const code = "const x = `hello`";
const codeMsg = `\`\`\`js\n${escapeMarkdownV2Code(code)}\n\`\`\``;
```

### Common Patterns

```ts
// Bold text with dynamic content
`*${escapeMarkdownV2(product.title)}*`

// Italic
`_${escapeMarkdownV2(text)}_`

// Strikethrough
`~${escapeMarkdownV2(text)}~`

// Inline code
`\`${escapeMarkdownV2Code(text)}\``

// Spoiler
`||${escapeMarkdownV2(text)}||`

// ⚠️ WRONG — will break if text contains special chars:
`*${product.title}*`

// ✅ CORRECT:
`*${escapeMarkdownV2(product.title)}*`
```

---

## 10. Database Options <a name="database-options"></a>

### Development: SQLite (local file)

```bash
npm install @libsql/client
```

### Production: Turso (distributed SQLite at the edge)

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Create a database
turso db create my-miniapp
turso db show my-miniapp --url    # get the URL
turso db tokens create my-miniapp  # get auth token
```

### Unified Database Client

```ts
// src/lib/database.ts
import { createClient, type Client } from "@libsql/client";

let _db: Client | null = null;

export function getDb(): Client {
  if (_db) return _db;

  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && process.env.TURSO_DATABASE_URL) {
    _db = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  } else {
    // Local SQLite file for development
    _db = createClient({
      url: process.env.DATABASE_URL || "file:local.db",
    });
  }

  return _db;
}

export const db = getDb();

// Run migrations on startup
export async function migrate() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id INTEGER UNIQUE NOT NULL,
      username TEXT,
      first_name TEXT,
      credits INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      telegram_charge_id TEXT UNIQUE NOT NULL,
      provider_charge_id TEXT,
      status TEXT DEFAULT 'completed',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      plan TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, plan)
    );

    CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
    CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
    CREATE INDEX IF NOT EXISTS idx_payments_charge_id ON payments(telegram_charge_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
  `);
}
```

### Using the Database

```ts
// Upsert user on first visit
export async function ensureUser(
  telegramId: number,
  username?: string,
  firstName?: string
) {
  await db.execute({
    sql: `INSERT INTO users (telegram_id, username, first_name)
          VALUES (?, ?, ?)
          ON CONFLICT (telegram_id) DO UPDATE SET
            username = COALESCE(excluded.username, users.username),
            first_name = COALESCE(excluded.first_name, users.first_name),
            updated_at = datetime('now')`,
    args: [telegramId, username || null, firstName || null],
  });
}

// Check subscription
export async function hasActiveSubscription(
  telegramId: number
): Promise<boolean> {
  const result = await db.execute({
    sql: `SELECT 1 FROM subscriptions
          WHERE user_id = ? AND expires_at > datetime('now')
          LIMIT 1`,
    args: [telegramId],
  });
  return result.rows.length > 0;
}

// Get user credits
export async function getUserCredits(telegramId: number): Promise<number> {
  const result = await db.execute({
    sql: `SELECT credits FROM users WHERE telegram_id = ?`,
    args: [telegramId],
  });
  return (result.rows[0]?.credits as number) ?? 0;
}
```

---

## 11. Next.js Deployment <a name="nextjs-deployment"></a>

### Project Structure

```
my-miniapp/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── bot/route.ts         # Webhook endpoint
│   │   │   ├── purchase/route.ts    # Stars purchase trigger
│   │   │   └── profile/route.ts     # User profile
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── providers.tsx            # TelegramProvider
│   ├── components/
│   │   ├── BuyButton.tsx
│   │   └── ProductCard.tsx
│   ├── hooks/
│   │   └── useTelegramUser.ts
│   └── lib/
│       ├── api.ts                   # Frontend API client
│       ├── auth-middleware.ts       # initData validation middleware
│       ├── bot.ts                   # grammY bot instance
│       ├── database.ts             # SQLite/Turso client
│       ├── payments.ts             # Stars payment logic
│       ├── telegram-utils.ts       # MarkdownV2 helpers
│       └── validate-init-data.ts   # HMAC validation
├── scripts/
│   └── set-webhook.ts
├── .env.local
├── next.config.ts
├── package.json
└── tsconfig.json
```

### next.config.ts

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // X-Frame-Options ALLOW-FROM is deprecated and ignored by modern browsers.
          // Use Content-Security-Policy frame-ancestors instead (below).
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### Root Layout

```tsx
// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { TelegramProvider } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Mini App",
  description: "A Telegram Mini App",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevent zoom in Mini App
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Telegram Web App script — REQUIRED */}
        <script src="https://telegram.org/js/telegram-web-app.js" async />
      </head>
      <body>
        <TelegramProvider>{children}</TelegramProvider>
      </body>
    </html>
  );
}
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add BOT_TOKEN
vercel env add MINI_APP_URL
vercel env add WEBHOOK_URL
vercel env add WEBHOOK_SECRET
vercel env add TURSO_DATABASE_URL
vercel env add TURSO_AUTH_TOKEN

# Deploy to production
vercel --prod

# Set webhook after deployment
WEBHOOK_URL=https://your-app.vercel.app/api/bot npx tsx scripts/set-webhook.ts
```

### Configure in BotFather

1. Message @BotFather
2. `/setmenubutton` → select your bot → enter your Mini App URL
3. Or `/newapp` to create a named Mini App (accessible via `t.me/YourBot/appname`)

---

## 12. Security Hardening <a name="security"></a>

### Checklist

- [x] **Validate initData HMAC on every API request** — never trust client-side data
- [x] **Verify webhook secret header** — prevents forged webhook calls
- [x] **Check auth_date freshness** — reject stale initData (24h max)
- [x] **Use timing-safe comparison** — prevents timing attacks on HMAC
- [x] **Sanitize all inputs** — never trust user data in SQL or messages
- [x] **Rate limit API endpoints** — prevent abuse
- [x] **Log payment events** — audit trail for disputes

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

### Rate Limiting (Simple In-Memory)

```ts
// src/lib/rate-limit.ts

const requests = new Map<string, number[]>();
const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 30;  // per window

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const timestamps = requests.get(key) || [];

  // Remove expired entries
  const valid = timestamps.filter((t) => now - t < WINDOW_MS);

  if (valid.length >= MAX_REQUESTS) {
    return true;
  }

  valid.push(now);
  requests.set(key, valid);
  return false;
}

// Clean up periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of requests) {
    const valid = timestamps.filter((t) => now - t < WINDOW_MS);
    if (valid.length === 0) {
      requests.delete(key);
    } else {
      requests.set(key, valid);
    }
  }
}, 60_000);
```

### Never Expose Bot Token

```ts
// ❌ WRONG — bot token in client-side code
const BOT_TOKEN = "7123456789:AAF..."; // NEVER do this

// ✅ CORRECT — only in server-side code / env vars
// .env.local (never committed to git)
// BOT_TOKEN=7123456789:AAF...

// In API routes (server-side only):
const BOT_TOKEN = process.env.BOT_TOKEN!;
```

---

## 13. Complete Example App <a name="complete-example"></a>

### package.json

```json
{
  "name": "telegram-miniapp",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "set-webhook": "tsx scripts/set-webhook.ts",
    "migrate": "tsx scripts/migrate.ts"
  },
  "dependencies": {
    "@libsql/client": "^0.14.0",
    "@telegram-apps/sdk": "^2.0.0",
    "@telegram-apps/sdk-react": "^2.0.0",
    "grammy": "^1.30.0",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
```

### Main Page

```tsx
// src/app/page.tsx
"use client";

import { useTelegramUser } from "@/hooks/useTelegramUser";
import { BuyButton } from "@/components/BuyButton";

export default function Home() {
  const user = useTelegramUser();

  if (!user) {
    return (
      <div className="content">
        <p className="hint">Loading...</p>
      </div>
    );
  }

  return (
    <div className="content" style={{ padding: "16px" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "8px" }}>
        Welcome, {user.firstName}!
      </h1>

      <p className="hint" style={{ marginBottom: "24px" }}>
        {user.isPremium ? "⭐ Premium user" : "Free user"}
      </p>

      <div className="card">
        <div className="card-title">Premium Access</div>
        <p style={{ marginBottom: "16px" }}>
          Unlock all features for 7 days.
        </p>
        <BuyButton productId="premium_week" />
      </div>

      <div className="card" style={{ marginTop: "12px" }}>
        <div className="card-title">100 Credits</div>
        <p style={{ marginBottom: "16px" }}>
          Top up your credit balance.
        </p>
        <BuyButton productId="credits_100" />
      </div>
    </div>
  );
}
```

### Migration Script

```ts
// scripts/migrate.ts
import { migrate } from "../src/lib/database";

migrate()
  .then(() => {
    console.log("Migration complete");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
```

---

## 14. Troubleshooting <a name="troubleshooting"></a>

### Common Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| `hash` validation fails | URL-decoding mismatch | Use raw query string, don't decode before validation |
| Payment never arrives | `pre_checkout_query` not answered in 10s | Ensure handler is fast; avoid DB calls before answering |
| Mini App blank white screen | CSP blocking frame | Add `frame-ancestors` header for telegram.org |
| Theme variables undefined | SDK not initialized | Call `init()` before accessing theme |
| Bot commands not working | Webhook not set or wrong URL | Run `set-webhook.ts` and check `getWebhookInfo` |
| `sendInvoice` error 400 | Wrong currency or missing fields | Must use `"XTR"`, empty `provider_token`, integer amount |
| MarkdownV2 parse error | Unescaped special characters | Use `escapeMarkdownV2()` on ALL dynamic text |
| `initData` empty in dev | Running outside Telegram | Use `mockTelegramEnv()` for local development |

### Debug Webhook Locally

```bash
# Use ngrok to expose local server
ngrok http 3000

# Set webhook to ngrok URL
WEBHOOK_URL=https://abc123.ngrok.io/api/bot npx tsx scripts/set-webhook.ts

# Watch logs
npm run dev
```

### Verify Webhook Status

```bash
curl "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | jq
```

Response should show:
- `url` → your webhook URL
- `has_custom_certificate` → false (Vercel handles TLS)
- `pending_update_count` → 0 (no backlog)
- `last_error_message` → check this if updates aren't arriving

### Test Stars Payment in Dev

Stars payments work in Telegram's test environment:
1. Create a test bot via the **test-server** @BotFather (not the production one). You must log into the test server Telegram app first — the token from the production @BotFather will NOT work on test servers and vice versa.
2. Use Telegram test apps (available on Android/iOS test builds)
3. Test bots use the `https://api.telegram.org/bot<token>/test/METHOD` format (append `/test/` before the method name)

Or test on production with 1-Star items and refund immediately after.

---

## Quick Reference

### Environment Variables Needed

```
BOT_TOKEN              # From @BotFather
MINI_APP_URL           # Your deployed frontend URL
WEBHOOK_URL            # Your /api/bot endpoint
WEBHOOK_SECRET         # Random 32+ char string for webhook auth
DATABASE_URL           # file:local.db for dev
TURSO_DATABASE_URL     # libsql://... for production
TURSO_AUTH_TOKEN       # Turso auth token for production
```

### Key API Methods

| Method | Use |
|--------|-----|
| `bot.api.sendInvoice(...)` | Send Stars payment invoice |
| `ctx.answerPreCheckoutQuery(true)` | Approve checkout |
| `ctx.answerPreCheckoutQuery(false, "error message")` | Reject checkout |
| `bot.api.refundStarPayment(userId, chargeId)` | Refund a Stars payment |
| `bot.api.setWebhook(...)` | Set webhook URL |
| `bot.api.getWebhookInfo()` | Check webhook status |

### initData Validation Flow

```
Client sends: Authorization: tma <initDataRaw>
                    │
                    ▼
        Parse URLSearchParams
                    │
                    ▼
        Extract & remove `hash`
                    │
                    ▼
     Sort remaining params by key
                    │
                    ▼
     Join as "key=value\nkey=value"
                    │
                    ▼
  secretKey = HMAC-SHA256("WebAppData", BOT_TOKEN)
                    │
                    ▼
  computed = HMAC-SHA256(secretKey, dataCheckString)
                    │
                    ▼
     Timing-safe compare with hash
                    │
                    ▼
       Check auth_date < 24h old
                    │
                    ▼
         ✅ Trust user data
```

---

## Rules for the Agent

1. **Always validate initData server-side** — never trust the client
2. **Always escape dynamic text in MarkdownV2** — use `escapeMarkdownV2()`
3. **Answer `pre_checkout_query` FAST** — do validation only, defer DB writes to `successful_payment`
4. **Use `"XTR"` for Stars currency** — not "STARS" or "stars"
5. **Pass empty string `""` for `provider_token`** in Stars invoices
6. **Use Telegram theme CSS variables** — never hardcode colors
7. **Set webhook secret** — validate `X-Telegram-Bot-Api-Secret-Token` header
8. **Use Turso for production** — SQLite for dev, Turso for distributed edge
9. **Log all payment events** — you need an audit trail
10. **Return 200 to Telegram webhooks even on error** — prevents retry storms

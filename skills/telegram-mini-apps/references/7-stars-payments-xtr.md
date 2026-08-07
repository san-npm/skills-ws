## Contents

- 7. Stars Payments (XTR) <a name="stars-payments"></a>
- Key Facts
- Two ways to charge — pick by context
- Send an Invoice
- Handle precheckoutquery
- Refund a Payment
- Triggering Payment from Mini App Frontend (recommended: openInvoice)

## 7. Stars Payments (XTR) <a name="stars-payments"></a>

Telegram Stars is the in-app currency. Users buy Stars with real money, then spend them in Mini Apps. You receive Stars and can withdraw them as Toncoin rewards via Fragment, or put them toward Telegram Ads.

### Key Facts

- Currency code: `XTR` (always use this string)
- Minimum price: 1 Star
- No provider_token needed (pass empty string `""`)
- You MUST answer `pre_checkout_query` within 10 seconds
- Refunds via `refundStarPayment` API method
- Audit/reconcile with `getStarTransactions` (Bot API method)

### Two ways to charge — pick by context

| Flow | Trigger | Requires open chat with bot? | When to use |
|---|---|---|---|
| **`openInvoice` (recommended in-app)** | Backend `createInvoiceLink` → frontend `openInvoice(link)` | **No** | The user is *inside the Mini App*. Opens the native payment sheet in place; no DM needed. |
| **`sendInvoice` message** | Backend pushes an invoice message to the chat | **Yes** — `sendInvoice(chatId, …)` needs a chat the bot can post to | Deep-link/`/start buy_…` entry, or re-engaging a user who already DM'd the bot. |

> **`sendInvoice(chatId, …)` requires a chat id, not a user id.** They coincide *only* for users who have started a private chat with your bot. If the user opened the Mini App from a group/channel/attachment menu and never DM'd the bot, `sendInvoice(user.id, …)` fails with **`403 Forbidden: bot can't initiate conversation with a user`** (or `400 chat not found`). For in-app purchases, prefer the `openInvoice` flow below, which has no such prerequisite.

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
 * NOTE: `chatId` must be a chat the bot can post to — for a private purchase
 * that means the user has started the bot. Throws `BotInvoiceError` with a
 * `needsBotStart` flag on 403/400 so callers can fall back to a deep link or
 * the in-app `openInvoice` flow.
 */
export class BotInvoiceError extends Error {
  constructor(message: string, public needsBotStart: boolean) {
    super(message);
    this.name = "BotInvoiceError";
  }
}

export async function sendStarsInvoice(
  chatId: number,
  productId: string
): Promise<void> {
  const product = PRODUCTS[productId];
  if (!product) {
    throw new BotInvoiceError("Product not found", false);
  }

  // grammY v1.24+ (Bot API 7.4 support) removed provider_token from the positional signature.
  // Pass title, description, payload, currency, and prices as positional args,
  // then provider_token and other options in the `other` object parameter.
  try {
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
        provider_token: "",    // empty string for Stars (moved to `other` in grammY v1.24+)
        photo_url: product.photoUrl,
        // For digital goods, no shipping needed:
        need_shipping_address: false,
        is_flexible: false,
      }
    );
  } catch (err: any) {
    // 403: bot can't initiate conversation; 400: chat not found.
    const code = err?.error_code;
    if (code === 403 || code === 400) {
      throw new BotInvoiceError(
        "Bot cannot message this user — they must start the bot, or use openInvoice in-app.",
        true
      );
    }
    throw err;
  }
}

/**
 * Create a Stars invoice LINK (no chat required). Hand this link to the Mini App
 * frontend, which opens it with `openInvoice(link)` — the recommended in-app flow.
 */
export async function createStarsInvoiceLink(productId: string): Promise<string> {
  const product = PRODUCTS[productId];
  if (!product) throw new BotInvoiceError("Product not found", false);

  // createInvoiceLink takes the same fields; no chatId, no shipping for digital goods.
  return bot.api.createInvoiceLink(
    product.title,
    product.description,
    `${product.id}`, // payload — echoed back in pre_checkout_query
    "XTR",
    [{ label: product.title, amount: product.priceInStars }],
    { provider_token: "", photo_url: product.photoUrl }
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

### Triggering Payment from Mini App Frontend (recommended: `openInvoice`)

The in-app flow works for **every** user (no DM prerequisite): the backend creates an invoice *link*, the frontend opens it with `openInvoice`, and the native payment sheet appears in place. Fulfillment still happens server-side in the `successful_payment` webhook — never trust the `openInvoice` status string for entitlements.

```tsx
// src/components/BuyButton.tsx
"use client";

import { useState } from "react";
import { openInvoice } from "@telegram-apps/sdk-react";
import { apiCall } from "@/lib/api";

export function BuyButton({ productId }: { productId: string }) {
  const [busy, setBusy] = useState(false);

  const handleBuy = async () => {
    setBusy(true);
    try {
      // 1. Ask the backend for a signed invoice link (no chat required).
      const { link } = await apiCall("/api/purchase", {
        method: "POST",
        body: JSON.stringify({ productId }),
      });

      // 2. Open the native Stars payment sheet in-app (URL mode).
      if (openInvoice.isAvailable()) {
        // status is Telegram's invoiceClosed status: "paid" | "cancelled" | "failed" | "pending".
        const status = await openInvoice(link, "url");
        // UI hint only — the webhook is the source of truth for fulfillment.
        if (status === "paid") {
          // optimistically refresh UI; real unlock arrives via successful_payment
        }
      } else {
        // Fallback for very old clients: open the link in Telegram.
        window.open(link, "_blank");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button onClick={handleBuy} disabled={busy} className="button-primary">
      {busy ? "…" : "⭐ Buy with Stars"}
    </button>
  );
}
```

```ts
// src/app/api/purchase/route.ts
import { NextResponse } from "next/server";
import { withTelegramAuth } from "@/lib/auth-middleware";
import { createStarsInvoiceLink, sendStarsInvoice, BotInvoiceError } from "@/lib/payments";

export const POST = withTelegramAuth(async (req, userId) => {
  const { productId, mode } = await req.json();

  if (typeof productId !== "string" || !/^[a-z0-9_]+$/.test(productId)) {
    return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
  }

  try {
    // Default: return an invoice link for the in-app openInvoice flow.
    if (mode !== "message") {
      const link = await createStarsInvoiceLink(productId);
      return NextResponse.json({ link });
    }

    // Optional: push an invoice message to the user's chat (needs an open chat).
    await sendStarsInvoice(userId, productId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof BotInvoiceError) {
      // 409 lets the client fall back to openInvoice or prompt "start the bot first".
      return NextResponse.json(
        { error: err.message, needsBotStart: err.needsBotStart },
        { status: err.needsBotStart ? 409 : 400 }
      );
    }
    throw err;
  }
});
```

> **`sendInvoice` message fallback:** only reach for `mode: "message"` when you specifically want a persistent invoice in the chat (e.g. from a `/start buy_…` deep link, where `ctx.chat.id` is a valid private chat). For purchases initiated inside the Mini App, the `openInvoice` link flow above is correct and avoids the 403/409 "user hasn't started the bot" failure.

---

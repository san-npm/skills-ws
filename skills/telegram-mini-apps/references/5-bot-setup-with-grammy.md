## Contents

- 5. Bot Setup with grammY <a name="bot-setup-grammy"></a>
- Installation
- Bot Instance (Singleton)

## 5. Bot Setup with grammY <a name="bot-setup-grammy"></a>

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

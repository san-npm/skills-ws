## Contents

- 8. Deep Linking <a name="deep-linking"></a>
- Link Format
- Handling /start Deep Links
- Reading startapp in Mini App

## 8. Deep Linking <a name="deep-linking"></a>

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
// In v3 the ?startapp= value arrives as `tgWebAppStartParam` in launch params.
// useLaunchParams() (sdk-react) is the reactive way to read it in a component.
import { useLaunchParams } from "@telegram-apps/sdk-react";

function App() {
  const lp = useLaunchParams();
  const startParam = lp.tgWebAppStartParam; // e.g., "item_123" from t.me/Bot/app?startapp=item_123

  useEffect(() => {
    if (startParam) {
      // Route to the appropriate view
      router.push(`/item/${startParam}`);
    }
  }, [startParam]);
}
```

> Distinguish the two params: `?start=` (chat deep link, handled by the bot's `/start` handler) vs `?startapp=` (Mini App deep link, read here as `tgWebAppStartParam`). They are *separate* — a `startapp` value does **not** reach your bot's `/start` handler.

---

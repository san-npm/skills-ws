## Contents

- Quick Reference
- Environment Variables Needed
- Key API Methods
- initData Validation Flow

## Quick Reference

### Environment Variables Needed

```
BOT_TOKEN                  # From @BotFather (production/test bot)
DEV_BOT_TOKEN              # Throwaway bot token for signing mock initData (dev only)
MINI_APP_URL               # Your deployed frontend URL
WEBHOOK_URL                # Your /api/bot endpoint
WEBHOOK_SECRET             # Random 32+ char string for webhook auth
DATABASE_URL               # file:local.db for dev
TURSO_DATABASE_URL         # libsql://... for production
TURSO_AUTH_TOKEN           # Turso auth token for production
UPSTASH_REDIS_REST_URL     # Serverless-safe rate limiting
UPSTASH_REDIS_REST_TOKEN   # Serverless-safe rate limiting
```

### Key API Methods

| Method | Use |
|--------|-----|
| `bot.api.createInvoiceLink(...)` | Create a Stars invoice link for in-app `openInvoice` (no chat needed) |
| `openInvoice(link, "url")` (client) | Open the native Stars payment sheet in-app |
| `bot.api.sendInvoice(chatId, ...)` | Push an invoice message to a chat (requires open chat with bot) |
| `ctx.answerPreCheckoutQuery(true)` | Approve checkout (within 10s) |
| `ctx.answerPreCheckoutQuery(false, "error message")` | Reject checkout |
| `bot.api.refundStarPayment(userId, chargeId)` | Refund a Stars payment |
| `bot.api.getStarTransactions()` | Reconcile/audit Stars balance |
| `bot.api.setWebhook(...)` / `getWebhookInfo()` | Set / check webhook |
| `cloudStorage.{setItem,getItem,getKeys,deleteItem}` (client) | Per-user KV cache (guard with `isAvailable()`) |
| `biometry.{requestAccess,authenticate,updateToken}` (client) | Device-gated local token (not server auth) |
| `viewport.{requestFullscreen,exitFullscreen}` (client) | Fullscreen (WebApp 8.0+) |
| `shareStory(mediaUrl, opts)` / `shareMessage(id)` (client) | Virality / sharing |

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

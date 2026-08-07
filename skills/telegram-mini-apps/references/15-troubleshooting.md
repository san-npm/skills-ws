## Contents

- 15. Troubleshooting <a name="troubleshooting"></a>
- Common Issues
- Debug Webhook Locally
- Verify Webhook Status
- Test Stars Payment in Dev

## 15. Troubleshooting <a name="troubleshooting"></a>

### Common Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| `hash` validation fails | URL-decoding mismatch | Use raw query string, don't decode before validation |
| Payment never arrives | `pre_checkout_query` not answered in 10s | Ensure handler is fast; avoid DB calls before answering |
| Mini App blank white screen | CSP blocking frame | Add `frame-ancestors` header for telegram.org |
| Theme variables undefined | SDK not initialized / bindCssVars not called | Call `init()`, then `themeParams.bindCssVars()` in the provider |
| Bot commands not working | Webhook not set or wrong URL | Run `set-webhook.ts` and check `getWebhookInfo` |
| `sendInvoice` error 400 | Wrong currency or missing fields | Must use `"XTR"`, empty `provider_token`, integer amount |
| `sendInvoice` 403 "can't initiate conversation" | User never started the bot; `chatId`≠open chat | Use the `openInvoice` link flow instead, or prompt the user to `/start` first |
| MarkdownV2 parse error | Unescaped special characters | Use `escapeMarkdownV2()` on ALL dynamic text |
| `initData` empty in dev | Running outside Telegram | Use the signed `mockDevEnvironment()` (real HMAC), not a fake `hash` string |
| API 401 in local dev | Mock `hash` doesn't match backend token | Sign mock initData with `DEV_BOT_TOKEN` and validate against it in dev (see §2) |
| `x is not available` / throws on call | Capability missing on this client/version | Guard every bridge call with `x.isAvailable()` / `x.ifAvailable()` |
| Rate limit never trips on Vercel | In-memory counter resets per invocation | Use Upstash/Vercel KV shared store (see §13) |
| Fullscreen content hidden by status bar | Safe-area insets ignored | Pad with `--tg-safe-area-inset-top` etc. |

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

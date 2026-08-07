## Rules for the Agent

1. **Always validate initData server-side** — never trust the client
2. **Guard every SDK bridge call** — `x.isAvailable()` / `x.ifAvailable()`; capabilities vary by client/version (SDK v3)
3. **Pin `@telegram-apps/sdk` v3** — there is no npm "SDK 7.x"; that number is the Telegram WebApp *platform* version
4. **Prefer `openInvoice` for in-app purchases** — `sendInvoice(chatId, …)` needs an open chat and 403s otherwise
5. **Always escape dynamic text in MarkdownV2** — use `escapeMarkdownV2()`
6. **Answer `pre_checkout_query` FAST** — do validation only, defer DB writes to `successful_payment`
7. **Use `"XTR"` for Stars currency** — not "STARS" or "stars"; pass empty string `""` for `provider_token`
8. **Use Telegram theme CSS variables** — call `themeParams.bindCssVars()`, never hardcode colors
9. **Set webhook secret** — validate `X-Telegram-Bot-Api-Secret-Token` header
10. **Rate limit with a shared store** — Upstash/Vercel KV, never in-memory on serverless
11. **CloudStorage and biometry are client-side** — keep entitlements/auth on the server, keyed by validated `user.id`
12. **Use Turso for production** — SQLite for dev, Turso for distributed edge
13. **Log all payment events & reconcile** — audit trail via DB + `getStarTransactions`
14. **Return 200 to Telegram webhooks even on error** — prevents retry storms
15. **Sign mock initData in dev** — never a fake `hash`; validate against `DEV_BOT_TOKEN` locally

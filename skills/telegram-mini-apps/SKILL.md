---
name: telegram-mini-apps
description: "Build & ship production Telegram Mini Apps with Stars (XTR) payments on Next.js — @telegram-apps/sdk v3 (cloudStorage, biometry, fullscreen, shareStory) with isAvailable() guards, server-side initData HMAC validation, grammY bot webhooks, and serverless-safe rate limiting. Use when building, debugging, or deploying a Telegram Mini App / TWA or Stars billing."
---
# Telegram Mini Apps with Stars Payments — Expert Skill

> A production-grade reference for building Telegram Mini Apps (TWA) on Next.js: `@telegram-apps/sdk` **v3** init, native capabilities (CloudStorage, biometry, fullscreen, shareStory), server-side initData HMAC validation, grammY bot webhooks, Stars (XTR) payments, and serverless deployment. Scope is the **bot + Mini App + Stars billing** stack; for advanced BotFather configuration and Bot API specifics, cross-check [core.telegram.org/bots/webapps](https://core.telegram.org/bots/webapps) and [docs.telegram-mini-apps.com](https://docs.telegram-mini-apps.com).

### Tested version matrix (as of Jun 2026)

These versions were verified to work together. Always confirm latest at each package's releases page before pinning.

| Package / runtime | Pin used here | Notes |
|---|---|---|
| Node.js | **22 LTS or 24 LTS** | Node 18 and 20 are both EOL, do not target them for new deploys. |
| `@telegram-apps/sdk` | `^3` | v2 → v3 renamed several mount/signal APIs (see migration note below). |
| `@telegram-apps/sdk-react` | `^3` | React bindings (`useSignal`, `useLaunchParams`). |
| `grammy` | `^1.30` | Verify method signatures at [grammy.dev](https://grammy.dev); `sendInvoice` dropped positional `provider_token` in 1.24+ (Bot API 7.4 support). |
| `next` | `^15` (App Router) | Next.js 16 is current — verify at [nextjs.org](https://nextjs.org); RSC/route-handler APIs unchanged for this skill. |
| `react` / `react-dom` | `^19` | |
| `@libsql/client` (Turso) | `^0.15` | Verify at [github.com/tursodatabase/libsql-client-ts](https://github.com/tursodatabase/libsql-client-ts/releases). |
| `typescript` | `^5.6+` | |
| Telegram Bot API | 7.x+ | Stars/`XTR`, `refundStarPayment`, `getStarTransactions`. |
| Telegram WebApp platform | 8.0+ | `requestFullscreen`, `shareStory`, home-screen shortcuts require 8.0+. |

> **Do not confuse the two "versions".** The npm package `@telegram-apps/sdk` (major **v3** in mid-2026) is independent of the **Telegram WebApp platform version** (e.g. `8.0`) reported in launch params. Older docs/skills saying "TMA SDK 7.x" conflated the two — there is no npm SDK 7.x.

## Reference guide

Read only the references needed for the current request:

- **Table of Contents**: [references/table-of-contents.md](references/table-of-contents.md)
- **1. Overview & Architecture**: [references/1-overview-architecture.md](references/1-overview-architecture.md)
- **2. TWA SDK Setup (v3) + v2→v3 Migration**: [references/2-twa-sdk-setup-v3-v2-v3-migration.md](references/2-twa-sdk-setup-v3-v2-v3-migration.md)
- **3. Native Capabilities: CloudStorage, Biometry, Fullscreen, shareStory**: [references/3-native-capabilities-cloudstorage-biometry-fullscreen-sharestory.md](references/3-native-capabilities-cloudstorage-biometry-fullscreen-sharestory.md)
- **4. initData HMAC Validation**: [references/4-initdata-hmac-validation.md](references/4-initdata-hmac-validation.md)
- **5. Bot Setup with grammY**: [references/5-bot-setup-with-grammy.md](references/5-bot-setup-with-grammy.md)
- **6. Webhook Handlers**: [references/6-webhook-handlers.md](references/6-webhook-handlers.md)
- **7. Stars Payments (XTR)**: [references/7-stars-payments-xtr.md](references/7-stars-payments-xtr.md)
- **8. Deep Linking**: [references/8-deep-linking.md](references/8-deep-linking.md)
- **9. Telegram Theme CSS Variables**: [references/9-telegram-theme-css-variables.md](references/9-telegram-theme-css-variables.md)
- **10. MarkdownV2 Escaping**: [references/10-markdownv2-escaping.md](references/10-markdownv2-escaping.md)
- **11. Database Options**: [references/11-database-options.md](references/11-database-options.md)
- **12. Next.js Deployment**: [references/12-next-js-deployment.md](references/12-next-js-deployment.md)
- **13. Security Hardening**: [references/13-security-hardening.md](references/13-security-hardening.md)
- **14. Complete Example App**: [references/14-complete-example-app.md](references/14-complete-example-app.md)
- **15. Troubleshooting**: [references/15-troubleshooting.md](references/15-troubleshooting.md)
- **Quick Reference**: [references/quick-reference.md](references/quick-reference.md)
- **Rules for the Agent**: [references/rules-for-the-agent.md](references/rules-for-the-agent.md)

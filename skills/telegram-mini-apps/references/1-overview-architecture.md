## Contents

- 1. Overview & Architecture <a name="overview"></a>
- Architecture
- Key Concepts
- Prerequisites

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

- **Node.js 22 LTS or 24 LTS** (Node 18 and 20 are both EOL, do not target them for new deployments)
- A Telegram bot token (from @BotFather)
- A public HTTPS URL (Vercel, Cloudflare, or ngrok for dev)
- Mini App URL configured via @BotFather → `/newapp` or `/setmenubutton`

---

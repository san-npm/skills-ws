## Contents

- 12. Next.js Deployment <a name="nextjs-deployment"></a>
- Project Structure
- next.config.ts
- Root Layout
- Deploy to Vercel
- Configure in BotFather

## 12. Next.js Deployment <a name="nextjs-deployment"></a>

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

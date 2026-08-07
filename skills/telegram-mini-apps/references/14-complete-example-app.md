## Contents

- 14. Complete Example App <a name="complete-example"></a>
- package.json
- Main Page
- Migration Script

## 14. Complete Example App <a name="complete-example"></a>

### package.json

> Version ranges below are the **mid-2026 tested set** (see the matrix at the top). Run `npm outdated` and check each package's releases page before pinning — Telegram's SDK and Bot API move quickly.

```json
{
  "name": "telegram-miniapp",
  "private": true,
  "engines": {
    "node": ">=22"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "set-webhook": "tsx scripts/set-webhook.ts",
    "migrate": "tsx scripts/migrate.ts"
  },
  "dependencies": {
    "@libsql/client": "^0.15.0",
    "@telegram-apps/sdk": "^3.0.0",
    "@telegram-apps/sdk-react": "^3.0.0",
    "@upstash/ratelimit": "^2.0.0",
    "@upstash/redis": "^1.34.0",
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

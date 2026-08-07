## Contents

- 2. TWA SDK Setup (v3) + v2→v3 Migration <a name="twa-sdk-setup"></a>
- Installation
- v2 → v3 migration cheatsheet
- Initialize the SDK (React, v3)
- Accessing User Data (Client-Side)
- Sending initData to Your Backend
- Development Without Telegram

## 2. TWA SDK Setup (v3) + v2→v3 Migration <a name="twa-sdk-setup"></a>

### Installation

```bash
# Pin the v3 majors explicitly — v2 is still on npm and `@latest` on an old lockfile can pull it.
npm install @telegram-apps/sdk@^3 @telegram-apps/sdk-react@^3
```

### v2 → v3 migration cheatsheet

If you're upgrading an existing app (or following an older tutorial), these are the breaking changes that bite most:

| v2 | v3 | Why |
|---|---|---|
| `viewport.expand()` only | `viewport.requestFullscreen()` / `exitFullscreen()` / `isFullscreen()` added | Fullscreen API landed with WebApp 8.0. `expand()` still exists. |
| `initData` returned a parsed object via `useSignal(initData)` | `initData` is a **namespace of signals**: `initData.state()`, `initData.user()`, `initData.raw()` | Finer-grained reactivity; subscribe to just what you read. |
| `bindCssVars` was sometimes implicit | Call `themeParams.bindCssVars()` / `viewport.bindCssVars()` explicitly (guard with `.isAvailable()`) | Auto-injects `--tg-theme-*` / `--tg-viewport-*` CSS vars. |
| Mixed sync/throwing mounts | Every async-capable method exposes `.isAvailable()` and `.ifAvailable(...)`; mounts (`miniApp.mount`, `viewport.mount`, `biometry.mount`) return promises | Bridge support varies by client/version — never call blind. |
| `cloudStorage` / `biometry` partial | First-class `cloudStorage.*` and `biometry.*` components | See [Native Capabilities](#native-capabilities). |

> **Rule:** in v3, treat every bridge call as "may not exist on this client". Guard with `x.isAvailable()` (or fire-and-forget with `x.ifAvailable(...)`) before calling. The examples below do this consistently.

### Initialize the SDK (React, v3)

In v3, **every bridge call may be unavailable** on a given client/platform/version, so guard each one with `.isAvailable()`. The async mounts (`miniApp.mount`, `viewport.mount`, `biometry.mount`) return promises — await them before reading their state. `mount()` on synchronous components (`backButton`, `mainButton`, `closingBehavior`) is safe to call inside the same guard.

```tsx
// src/app/providers.tsx
"use client";

import { useEffect, useState, type PropsWithChildren } from "react";
import {
  init,
  miniApp,
  themeParams,
  viewport,
  backButton,
  mainButton,
  closingBehavior,
  swipeBehavior,
  cloudStorage,
} from "@telegram-apps/sdk-react";

export function TelegramProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Initialize the SDK — must run before any other SDK method.
        // Pass mockForMacOS where relevant; init() is idempotent.
        init();

        // Mini App + theme. mount() is async in v3 (fetches theme params).
        if (miniApp.mount.isAvailable()) {
          await miniApp.mount();
        }
        if (themeParams.mount.isAvailable()) {
          themeParams.mount();
          // Auto-inject --tg-theme-* CSS variables (see Theme CSS section).
          themeParams.bindCssVars.ifAvailable();
        }

        // Viewport: mount (async), bind CSS vars, expand to full height.
        if (viewport.mount.isAvailable()) {
          await viewport.mount();
          viewport.bindCssVars.ifAvailable();
          viewport.expand.ifAvailable();
        }

        // Back/main buttons — guard each; older clients may lack them.
        if (backButton.mount.isAvailable()) backButton.mount();
        if (mainButton.mount.isAvailable()) mainButton.mount();

        // Prevent accidental close.
        if (closingBehavior.mount.isAvailable()) {
          closingBehavior.mount();
          closingBehavior.enableConfirmation.ifAvailable();
        }

        // Disable swipe-to-close (helps full-screen scrollers on iOS).
        if (swipeBehavior.mount.isAvailable()) {
          swipeBehavior.mount();
          swipeBehavior.disableVertical.ifAvailable();
        }

        // CloudStorage has no theme/UI side effects; mounting is cheap.
        if (cloudStorage.mount?.isAvailable?.()) {
          cloudStorage.mount();
        }

        // Signal to Telegram that the app finished loading (hides the loader).
        miniApp.ready.ifAvailable();
        setReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "SDK init failed");
      }
    })();
  }, []);

  if (error) return <div>Error: {error}</div>;
  if (!ready) return <div>Loading...</div>;

  return <>{children}</>;
}
```

> `x.ifAvailable(...)` is the fire-and-forget twin of `if (x.isAvailable()) x(...)` — it no-ops on clients that don't support the call instead of throwing. Use it for non-critical UI affordances.

### Accessing User Data (Client-Side)

```tsx
// src/hooks/useTelegramUser.ts
"use client";

// In SDK v3, `initData` is a namespace of signals. Subscribe with useSignal():
//   initData.user()  -> parsed user object
//   initData.raw()   -> raw query string (send THIS to the backend to validate)
//   initData.state() -> the full parsed object
import { initData, useSignal } from "@telegram-apps/sdk-react";

export function useTelegramUser() {
  const user = useSignal(initData.user); // reactive parsed user
  const raw = useSignal(initData.raw);   // raw string for backend HMAC validation

  if (!user) return null;

  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    username: user.username,
    languageCode: user.language_code,
    isPremium: user.is_premium,
    photoUrl: user.photo_url,
    raw, // POST this to your backend (Authorization: tma <raw>) for validation
  };
}
```

> v3 parses `initData.user()` with **snake_case** Telegram field names (`first_name`, `is_premium`, `photo_url`). If you prefer camelCase in the UI, map it here as shown.

### Sending initData to Your Backend

```tsx
// src/lib/api.ts
// Use retrieveRawInitData() for non-React contexts — it returns the cached raw
// initData query string without requiring a reactive signal/hook context.
// (In v3, retrieveLaunchParams() returns a parsed object under `tgWebAppData`,
//  not the raw string — use retrieveRawInitData() when you need the signed string.)
import { retrieveRawInitData } from "@telegram-apps/sdk";

export async function apiCall(path: string, options: RequestInit = {}) {
  const raw = retrieveRawInitData();
  if (!raw) throw new Error("No initData — are you running inside Telegram?");

  const res = await fetch(path, {
    ...options,
    headers: {
      ...options.headers,
      "Content-Type": "application/json",
      // Send initData as authorization header
      Authorization: `tma ${raw}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }

  return res.json();
}
```

### Development Without Telegram

For local UI work outside Telegram's WebView, mock the environment without putting any
BotFather token in browser code. Bot tokens are credentials even when the bot is intended
only for development. Never expose one through a `NEXT_PUBLIC_*` variable or client bundle.

Use one of these safe approaches:

1. Keep UI-only mocks unsigned and do not call authenticated backend routes.
2. Generate a short-lived signed fixture from a localhost-only server route that reads
   `DEV_BOT_TOKEN` server-side. Restrict the route to development and loopback requests.
3. Store a pre-generated, expired fixture for parsing/UI tests; do not use it for backend
   authentication tests.

```ts
// src/app/api/dev/telegram-fixture/route.ts
import { NextRequest, NextResponse } from "next/server";
import { signMockInitData } from "@/server/sign-mock-init-data";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }
  const host = req.headers.get("host")?.split(":")[0];
  if (host !== "localhost" && host !== "127.0.0.1" && host !== "[::1]") {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const token = process.env.DEV_BOT_TOKEN;
  if (!token) return new NextResponse("DEV_BOT_TOKEN is missing", { status: 503 });
  return NextResponse.json({ initDataRaw: signMockInitData(token) });
}
```

```tsx
// src/app/providers.tsx: add mock support (await mockDevEnvironment() before init())
import { mockTelegramEnv } from "@telegram-apps/sdk-react";

export async function mockDevEnvironment() {
  if (typeof window === "undefined") return;
  if (window.location.hostname !== "localhost") return;

  const response = await fetch("/api/dev/telegram-fixture", { method: "POST" });
  if (!response.ok) throw new Error("Could not create local Telegram fixture");
  const { initDataRaw } = await response.json();

  mockTelegramEnv({
    launchParams: {
      tgWebAppData: initDataRaw,
      tgWebAppVersion: "8.0",
      tgWebAppPlatform: "tdesktop",
      tgWebAppThemeParams: {
        accent_text_color: "#6ab2f2",
        bg_color: "#17212b",
        button_color: "#5288c1",
        button_text_color: "#ffffff",
        destructive_text_color: "#ec3942",
        header_bg_color: "#17212b",
        hint_color: "#708499",
        link_color: "#6ab3f3",
        secondary_bg_color: "#232e3c",
        section_bg_color: "#17212b",
        section_header_text_color: "#6ab3f3",
        subtitle_text_color: "#708499",
        text_color: "#f5f5f5",
      },
    },
  });
}
```

> Keep both `BOT_TOKEN` and `DEV_BOT_TOKEN` server-only. In development, validate the
> fixture against `DEV_BOT_TOKEN`. Test the production validation path separately with an
> actual Telegram launch; never weaken validation to make local mocks pass.

---

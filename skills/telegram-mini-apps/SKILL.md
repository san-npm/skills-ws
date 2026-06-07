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
| Node.js | **20 LTS or 22 LTS** | Node 18 is EOL — do not target it for new deploys. |
| `@telegram-apps/sdk` | `^3` | v2 → v3 renamed several mount/signal APIs (see migration note below). |
| `@telegram-apps/sdk-react` | `^3` | React bindings (`useSignal`, `useLaunchParams`). |
| `grammy` | `^1.30` | Verify method signatures at [grammy.dev](https://grammy.dev); `sendInvoice` options changed in 1.30+. |
| `next` | `^15` (App Router) | Next.js 16 is current — verify at [nextjs.org](https://nextjs.org); RSC/route-handler APIs unchanged for this skill. |
| `react` / `react-dom` | `^19` | |
| `@libsql/client` (Turso) | `^0.15` | Verify at [github.com/tursodatabase/libsql-client-ts](https://github.com/tursodatabase/libsql-client-ts/releases). |
| `typescript` | `^5.6+` | |
| Telegram Bot API | 7.x+ | Stars/`XTR`, `refundStarPayment`, `getStarTransactions`. |
| Telegram WebApp platform | 8.0+ | `requestFullscreen`, `shareStory`, home-screen shortcuts require 8.0+. |

> **Do not confuse the two "versions".** The npm package `@telegram-apps/sdk` (major **v3** in mid-2026) is independent of the **Telegram WebApp platform version** (e.g. `8.0`) reported in launch params. Older docs/skills saying "TMA SDK 7.x" conflated the two — there is no npm SDK 7.x.

## Table of Contents

1. [Overview & Architecture](#overview)
2. [TWA SDK Setup (v3) + v2→v3 Migration](#twa-sdk-setup)
3. [Native Capabilities: CloudStorage, Biometry, Fullscreen, shareStory](#native-capabilities)
4. [initData HMAC Validation](#initdata-validation)
5. [Bot Setup with grammY](#bot-setup-grammy)
6. [Webhook Handlers](#webhook-handlers)
7. [Stars Payments (XTR) — invoice messages & openInvoice](#stars-payments)
8. [Deep Linking](#deep-linking)
9. [Telegram Theme CSS Variables](#theme-css-variables)
10. [MarkdownV2 Escaping](#markdownv2-escaping)
11. [Database Options](#database-options)
12. [Next.js Deployment](#nextjs-deployment)
13. [Security Hardening (serverless-safe rate limiting)](#security)
14. [Complete Example App](#complete-example)
15. [Troubleshooting](#troubleshooting)

---

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

- **Node.js 20 LTS or 22 LTS** (Node 18 is EOL — do not target it for new deployments)
- A Telegram bot token (from @BotFather)
- A public HTTPS URL (Vercel, Cloudflare, or ngrok for dev)
- Mini App URL configured via @BotFather → `/newapp` or `/setmenubutton`

---

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

For local UI work outside Telegram's WebView you must mock the environment. **The naïve mistake is to use a fake `hash` like `"mock_hash_for_dev"` — that string will fail your own backend HMAC check, giving you a broken end-to-end dev flow.** Instead, sign the mock initData with a *dev-only* bot token so it passes validation locally.

This file is `localhost`-only and uses a **separate dev bot token** (`DEV_BOT_TOKEN`) so you never have to bypass validation. The token is read from `NEXT_PUBLIC_DEV_BOT_TOKEN` — only ever a throwaway test bot, never your production token.

```ts
// src/lib/mock-init-data.ts  (dev only — never bundled in production)
import { createHmac } from "node:crypto";

/** Build a correctly HMAC-signed initData string that passes validateInitData(). */
export function signMockInitData(devBotToken: string): string {
  const params = new URLSearchParams([
    ["user", JSON.stringify({
      id: 123456789,
      first_name: "Dev",
      last_name: "User",
      username: "devuser",
      language_code: "en",
    })],
    ["auth_date", String(Math.floor(Date.now() / 1000))],
    ["query_id", "AAH-mock-query-id"],
  ]);

  // Same algorithm as the backend: data_check_string sorted by key, then
  // secret = HMAC_SHA256("WebAppData", token), hash = HMAC_SHA256(secret, dcs).
  const dcs = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(devBotToken).digest();
  const hash = createHmac("sha256", secret).update(dcs).digest("hex");

  params.append("hash", hash);
  return params.toString();
}
```

```tsx
// src/app/providers.tsx — add mock support (call mockDevEnvironment() before init())
import { mockTelegramEnv } from "@telegram-apps/sdk-react";
import { signMockInitData } from "@/lib/mock-init-data";

export function mockDevEnvironment() {
  if (typeof window === "undefined") return;
  if (window.location.hostname !== "localhost") return;

  // Throwaway dev bot token. NEVER use the production BOT_TOKEN here, and never
  // ship this code path to production (tree-shaken by the hostname guard above).
  const devToken = process.env.NEXT_PUBLIC_DEV_BOT_TOKEN;
  if (!devToken) {
    console.warn("Set NEXT_PUBLIC_DEV_BOT_TOKEN to sign mock initData; UI will load but API calls will 401.");
  }

  // A real, signed initData string — your backend validateInitData() will ACCEPT it
  // as long as DEV_BOT_TOKEN (server) matches NEXT_PUBLIC_DEV_BOT_TOKEN (client).
  const initDataRaw = devToken ? signMockInitData(devToken) : "";

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

> Server side, your `.env.local` then has **two** tokens: `BOT_TOKEN` (production/test bot used for real validation) and `DEV_BOT_TOKEN` (the throwaway used to sign mock data). In dev, point `validateInitData` at `DEV_BOT_TOKEN` when `NODE_ENV !== "production"`. Both come from @BotFather as ordinary bot tokens — there is no "fake" token.

---

## 3. Native Capabilities: CloudStorage, Biometry, Fullscreen, shareStory <a name="native-capabilities"></a>

These are the four native bridges most apps reach for after the basics. **All four vary by Telegram client and WebApp platform version**, so every call is guarded with `.isAvailable()` (throwing variant) or `.ifAvailable()` (no-op variant). Mount the relevant component once in your provider (see §2) before use.

| Capability | Min WebApp platform | SDK v3 API | Notes |
|---|---|---|---|
| CloudStorage | 6.9+ | `cloudStorage.{setItem,getItem,getKeys,deleteItem}` | Per-user, per-bot KV. **Not secret** (user can read it) and **not large** — keys ≤128 chars, values ≤4096 chars, ≤1024 keys. |
| Biometry | 7.2+ | `biometry.{mount,requestAccess,authenticate,updateToken}` | `authenticate()` returns a token *you* previously stored on-device; it is **not** a server auth — still validate initData. |
| Fullscreen | 8.0+ | `viewport.{requestFullscreen,exitFullscreen,isFullscreen}` | Distinct from `viewport.expand()`. Needs a user gesture on some clients. |
| shareStory | 7.8+ (media URL); widgetLink premium | `shareStory(mediaUrl, opts)` | Opens the native story editor pre-filled with your media. |
| shareMessage | 8.0+ | `shareMessage(preparedMessageId)` | Share a bot-prepared inline message; id from Bot API `savePreparedInlineMessage`. |

> Check the live platform version with `useLaunchParams()` → `tgWebAppVersion` (or `retrieveLaunchParams().tgWebAppVersion`) and degrade gracefully when a capability is missing. Version availability shifts over time — confirm at [docs.telegram-mini-apps.com](https://docs.telegram-mini-apps.com) and the [Bot API changelog](https://core.telegram.org/bots/api-changelog).

### 3.1 CloudStorage (per-user persistence)

```ts
// src/lib/cloud-storage.ts
import { cloudStorage } from "@telegram-apps/sdk";

// Telegram CloudStorage values are strings; wrap JSON yourself.
export async function cloudSet<T>(key: string, value: T): Promise<void> {
  if (!cloudStorage.setItem.isAvailable()) {
    throw new Error("CloudStorage unavailable on this client");
  }
  await cloudStorage.setItem(key, JSON.stringify(value)); // value ≤ 4096 chars
}

export async function cloudGet<T>(key: string): Promise<T | null> {
  if (!cloudStorage.getItem.isAvailable()) return null;
  const raw = await cloudStorage.getItem(key); // "" if missing
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function cloudKeys(): Promise<string[]> {
  if (!cloudStorage.getKeys.isAvailable()) return [];
  return cloudStorage.getKeys();
}

export async function cloudDelete(keys: string | string[]): Promise<void> {
  if (!cloudStorage.deleteItem.isAvailable()) return;
  await cloudStorage.deleteItem(keys);
}
```

> **Security:** CloudStorage is **client-readable and client-writable** — treat it as a UX cache (last route, draft text, onboarding flag), never as a source of truth for entitlements or balances. Authoritative state (credits, subscriptions, payments) lives in your server DB keyed by the *validated* `user.id`.

### 3.2 Biometry (device unlock for a locally-stored token)

```ts
// src/lib/biometry.ts
import { biometry } from "@telegram-apps/sdk";

/** Ensure the biometry component is mounted (async) before use. */
export async function ensureBiometry(): Promise<boolean> {
  if (!biometry.mount.isAvailable()) return false;
  if (!biometry.isMounted()) await biometry.mount();
  return biometry.isMounted();
}

/** Prompt the device biometric check; returns a token you previously stored. */
export async function biometricUnlock(reason = "Unlock your wallet"): Promise<string | null> {
  if (!(await ensureBiometry())) return null;

  // Ask for OS permission the first time (resolves to a boolean).
  if (biometry.requestAccess.isAvailable()) {
    const granted = await biometry.requestAccess();
    if (!granted) return null;
  }

  if (!biometry.authenticate.isAvailable()) return null;
  const { status, token } = await biometry.authenticate({ reason });
  return status === "authorized" ? token ?? null : null;
}

/** Store/replace the token gated behind biometry (e.g. an app PIN or session key). */
export async function setBiometricToken(token: string): Promise<boolean> {
  if (!(await ensureBiometry())) return false;
  if (!biometry.updateToken.isAvailable()) return false;
  // updateToken resolves with whether the saved token changed.
  // Pass `token` to set/replace; omit it to delete the stored token.
  const updated = await biometry.updateToken({ token, reason: "Save secure token" });
  return Boolean(updated);
}
```

> **Biometry is not authentication.** A passing biometric check only proves the *device* unlocked a locally-stored token — it does **not** authenticate the user to your server. Server trust still comes exclusively from validated initData (§4). Use biometry to gate sensitive *local* actions (reveal a key, confirm a high-value purchase), not to skip server-side checks.

### 3.3 Fullscreen & viewport behavior

```tsx
// src/components/FullscreenToggle.tsx
"use client";

import { viewport, useSignal } from "@telegram-apps/sdk-react";

export function FullscreenToggle() {
  const isFullscreen = useSignal(viewport.isFullscreen);

  const toggle = async () => {
    // requestFullscreen / exitFullscreen require WebApp platform 8.0+.
    if (isFullscreen) {
      if (viewport.exitFullscreen.isAvailable()) await viewport.exitFullscreen();
    } else if (viewport.requestFullscreen.isAvailable()) {
      await viewport.requestFullscreen(); // may need a user gesture
    } else {
      // Fallback for < 8.0 clients: just expand to max height.
      viewport.expand.ifAvailable();
    }
  };

  return (
    <button onClick={toggle} className="button-primary">
      {isFullscreen ? "Exit fullscreen" : "Go fullscreen"}
    </button>
  );
}
```

> In fullscreen, the device status bar overlaps your UI. Read the safe-area insets Telegram exposes as CSS vars — `--tg-safe-area-inset-top/-bottom/-left/-right` and `--tg-content-safe-area-inset-top` — and pad your header accordingly (e.g. `padding-top: var(--tg-safe-area-inset-top, 0px)`), or your top controls hide behind the clock/notch.

### 3.4 shareStory & shareMessage (virality)

```ts
// src/lib/share.ts
import { shareStory, shareMessage } from "@telegram-apps/sdk";

/** Open the native story editor pre-filled with your image/video URL. */
export function shareToStory(mediaUrl: string, caption?: string) {
  if (!shareStory.isAvailable()) return false;
  shareStory(mediaUrl, {
    text: caption, // ≤ 200 chars free users, ≤ 2048 premium
    widgetLink: { url: "https://t.me/YourBot/app", name: "Open the app" }, // premium-only link
  });
  return true;
}

/**
 * Share a message your BOT prepared via the Bot API `savePreparedInlineMessage`
 * (returns a prepared message id). Lets the user forward it into any chat.
 */
export function shareBotMessage(preparedMessageId: string) {
  // No-ops on clients that don't support it (8.0+).
  shareMessage.ifAvailable(preparedMessageId);
}
```

> `shareStory` media must be a publicly reachable HTTPS URL (Telegram fetches it). `widgetLink` is silently ignored for non-premium users, so don't rely on it as your only call-to-action.

---

## 4. initData HMAC Validation <a name="initdata-validation"></a>

**This is critical for security.** The initData string is signed by Telegram using HMAC-SHA256. Your backend MUST validate it before trusting any user data.

### How It Works

1. Telegram creates a data string from initData fields (sorted alphabetically, excluding `hash`)
2. A secret key is derived: `HMAC-SHA256("WebAppData", bot_token)` — key is `"WebAppData"`, data is `bot_token`
3. The signature is: `HMAC-SHA256(secret_key, data_check_string)` — key is `secret_key`, data is `data_check_string`
4. You compare this against the `hash` field

### Complete Validation Implementation

```ts
// src/lib/validate-init-data.ts
import { createHmac, timingSafeEqual as cryptoTimingSafeEqual } from "node:crypto";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

interface InitData {
  query_id?: string;
  user?: TelegramUser;
  auth_date: number;
  hash: string;
  start_param?: string;
  chat_type?: string;
  chat_instance?: string;
}

interface ValidationResult {
  valid: boolean;
  data?: InitData;
  error?: string;
}

const MAX_AGE_SECONDS = 86400; // 24 hours — adjust for your needs

/**
 * Validate Telegram Mini App initData using HMAC-SHA256.
 *
 * @param initDataRaw - The raw query string from the client
 * @param botToken    - Your bot token from @BotFather
 * @returns           - Validation result with parsed data
 */
export function validateInitData(
  initDataRaw: string,
  botToken: string
): ValidationResult {
  if (!initDataRaw || !botToken) {
    return { valid: false, error: "Missing initData or bot token" };
  }

  // Parse the query string
  const params = new URLSearchParams(initDataRaw);
  const hash = params.get("hash");

  if (!hash) {
    return { valid: false, error: "Missing hash in initData" };
  }

  // Validate hash is a 64-character hex string before passing to Buffer.from.
  // Invalid hex silently produces a shorter buffer, causing timingSafeEqual to throw.
  if (!/^[0-9a-f]{64}$/i.test(hash)) {
    return { valid: false, error: "Invalid hash format in initData" };
  }

  // Build the data-check-string:
  // 1. Remove the hash parameter
  // 2. Sort remaining params alphabetically by key
  // 3. Join as "key=value" with newlines
  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  // Derive the secret key: HMAC-SHA256("WebAppData", bot_token)
  const secretKey = createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  // Compute the expected hash
  const computedHash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  // Timing-safe comparison to prevent timing attacks
  // Both are hex strings — use "hex" encoding so Buffer lengths match
  // the byte count (32 bytes) rather than the string length (64 chars).
  // Using "utf-8" works too since hex is ASCII-safe, but "hex" is semantically correct.
  const computedBuf = Buffer.from(computedHash, "hex");
  const hashBuf = Buffer.from(hash, "hex");

  if (computedBuf.length !== hashBuf.length || !cryptoTimingSafeEqual(computedBuf, hashBuf)) {
    return { valid: false, error: "Invalid hash — signature mismatch" };
  }

  // Check auth_date freshness
  const authDateStr = params.get("auth_date");
  if (!authDateStr) {
    return { valid: false, error: "Missing auth_date in initData" };
  }
  const authDate = parseInt(authDateStr, 10);
  const now = Math.floor(Date.now() / 1000);

  if (now - authDate > MAX_AGE_SECONDS) {
    return { valid: false, error: "initData expired" };
  }

  // Parse user data
  const userStr = params.get("user");
  let user: TelegramUser | undefined;
  if (userStr) {
    try {
      user = JSON.parse(userStr);
    } catch {
      return { valid: false, error: "Invalid user JSON in initData" };
    }
  }

  return {
    valid: true,
    data: {
      query_id: params.get("query_id") || undefined,
      user,
      auth_date: authDate,
      hash,
      start_param: params.get("start_param") || undefined,
      chat_type: params.get("chat_type") || undefined,
      chat_instance: params.get("chat_instance") || undefined,
    },
  };
}
```

### API Route Middleware

```ts
// src/lib/auth-middleware.ts
import { validateInitData } from "./validate-init-data";
import { NextRequest, NextResponse } from "next/server";

const BOT_TOKEN = process.env.BOT_TOKEN!;
// In development we validate against the throwaway DEV_BOT_TOKEN, which is the
// token the client used to SIGN the mock initData (see "Development Without
// Telegram"). This keeps the dev flow end-to-end without a validation bypass.
const VALIDATION_TOKEN =
  process.env.NODE_ENV !== "production" && process.env.DEV_BOT_TOKEN
    ? process.env.DEV_BOT_TOKEN
    : BOT_TOKEN;

export function withTelegramAuth(
  handler: (req: NextRequest, userId: number) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const authHeader = req.headers.get("authorization") || "";

    if (!authHeader.startsWith("tma ")) {
      return NextResponse.json(
        { error: "Missing Telegram authorization" },
        { status: 401 }
      );
    }

    const initDataRaw = authHeader.slice(4); // strip "tma "
    const result = validateInitData(initDataRaw, VALIDATION_TOKEN);

    if (!result.valid || !result.data?.user) {
      return NextResponse.json(
        { error: result.error || "Invalid initData" },
        { status: 401 }
      );
    }

    return handler(req, result.data.user.id);
  };
}
```

### Usage in API Route

```ts
// src/app/api/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withTelegramAuth } from "@/lib/auth-middleware";

export const POST = withTelegramAuth(async (req, userId) => {
  // userId is guaranteed valid at this point
  const body = await req.json();

  // ... your logic here

  return NextResponse.json({ ok: true, userId });
});
```

---

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

## 6. Webhook Handlers <a name="webhook-handlers"></a>

### Next.js Webhook Route

```ts
// src/app/api/bot/route.ts
import { NextRequest, NextResponse } from "next/server";
import { handleWebhook } from "@/lib/bot";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  // Validate webhook secret header
  if (WEBHOOK_SECRET) {
    const secretHeader = req.headers.get("x-telegram-bot-api-secret-token");
    if (secretHeader !== WEBHOOK_SECRET) {
      console.warn("Webhook secret mismatch — rejecting request");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    // grammY's webhookCallback handles the update
    return await handleWebhook(req);
  } catch (err) {
    console.error("Webhook error:", err);
    // Always return 200 to Telegram to prevent retries
    return NextResponse.json({ ok: true });
  }
}

// Telegram only sends POST; reject other methods
export async function GET() {
  return NextResponse.json({ status: "Bot webhook active" });
}
```

### Setting the Webhook

```ts
// scripts/set-webhook.ts
// Run: npx tsx scripts/set-webhook.ts

const BOT_TOKEN = process.env.BOT_TOKEN!;
const WEBHOOK_URL = process.env.WEBHOOK_URL!; // e.g. https://yourapp.vercel.app/api/bot
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET!;

async function setWebhook() {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: WEBHOOK_URL,
      secret_token: WEBHOOK_SECRET,
      allowed_updates: [
        "message",
        "callback_query",
        "pre_checkout_query",
      ],
      drop_pending_updates: true,
    }),
  });

  const data = await res.json();
  console.log("setWebhook result:", JSON.stringify(data, null, 2));

  // Verify
  const infoRes = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`
  );
  const info = await infoRes.json();
  console.log("Webhook info:", JSON.stringify(info, null, 2));
}

setWebhook().catch(console.error);
```

### Environment Variables

```env
# .env.local
BOT_TOKEN=<your-bot-token-from-botfather>
DEV_BOT_TOKEN=<throwaway-bot-token-for-local-mock-signing>   # dev only
NEXT_PUBLIC_DEV_BOT_TOKEN=<same-as-DEV_BOT_TOKEN>            # dev only, client-side
MINI_APP_URL=https://yourapp.vercel.app
WEBHOOK_URL=https://yourapp.vercel.app/api/bot
WEBHOOK_SECRET=<random-secret-at-least-32-chars>

# Database
DATABASE_URL=file:local.db
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=<your-turso-auth-token>

# Rate limiting (serverless-safe)
UPSTASH_REDIS_REST_URL=<your-upstash-rest-url>
UPSTASH_REDIS_REST_TOKEN=<your-upstash-rest-token>
```

---

## 7. Stars Payments (XTR) <a name="stars-payments"></a>

Telegram Stars is the in-app currency. Users buy Stars with real money, then spend them in Mini Apps. You receive Stars and can convert them to TON or fiat via @BotFather.

### Key Facts

- Currency code: `XTR` (always use this string)
- Minimum price: 1 Star
- No provider_token needed (pass empty string `""`)
- You MUST answer `pre_checkout_query` within 10 seconds
- Refunds via `refundStarPayment` API method
- Audit/reconcile with `getStarTransactions` (Bot API method)

### Two ways to charge — pick by context

| Flow | Trigger | Requires open chat with bot? | When to use |
|---|---|---|---|
| **`openInvoice` (recommended in-app)** | Backend `createInvoiceLink` → frontend `openInvoice(link)` | **No** | The user is *inside the Mini App*. Opens the native payment sheet in place; no DM needed. |
| **`sendInvoice` message** | Backend pushes an invoice message to the chat | **Yes** — `sendInvoice(chatId, …)` needs a chat the bot can post to | Deep-link/`/start buy_…` entry, or re-engaging a user who already DM'd the bot. |

> **`sendInvoice(chatId, …)` requires a chat id, not a user id.** They coincide *only* for users who have started a private chat with your bot. If the user opened the Mini App from a group/channel/attachment menu and never DM'd the bot, `sendInvoice(user.id, …)` fails with **`403 Forbidden: bot can't initiate conversation with a user`** (or `400 chat not found`). For in-app purchases, prefer the `openInvoice` flow below, which has no such prerequisite.

### Send an Invoice

```ts
// src/lib/payments.ts
import { bot } from "./bot";

interface Product {
  id: string;
  title: string;
  description: string;
  priceInStars: number;
  photoUrl?: string;
}

// Product catalog — in production, load from database
const PRODUCTS: Record<string, Product> = {
  premium_week: {
    id: "premium_week",
    title: "Premium Access (1 Week)",
    description: "Unlock all premium features for 7 days.",
    priceInStars: 50,
    photoUrl: "https://yourapp.com/images/premium.png",
  },
  credits_100: {
    id: "credits_100",
    title: "100 Credits",
    description: "Purchase 100 credits to use in the app.",
    priceInStars: 25,
  },
};

export { PRODUCTS };

/**
 * Send a Stars invoice to a user.
 * NOTE: `chatId` must be a chat the bot can post to — for a private purchase
 * that means the user has started the bot. Throws `BotInvoiceError` with a
 * `needsBotStart` flag on 403/400 so callers can fall back to a deep link or
 * the in-app `openInvoice` flow.
 */
export class BotInvoiceError extends Error {
  constructor(message: string, public needsBotStart: boolean) {
    super(message);
    this.name = "BotInvoiceError";
  }
}

export async function sendStarsInvoice(
  chatId: number,
  productId: string
): Promise<void> {
  const product = PRODUCTS[productId];
  if (!product) {
    throw new BotInvoiceError("Product not found", false);
  }

  // grammY v1.30+ removed provider_token from the positional signature.
  // Pass title, description, payload, currency, and prices as positional args,
  // then provider_token and other options in the `other` object parameter.
  try {
    await bot.api.sendInvoice(
      chatId,
      product.title,           // title
      product.description,     // description
      `${product.id}`,         // payload — you'll receive this in pre_checkout_query
      "XTR",                   // currency — always "XTR" for Stars
      [
        {
          label: product.title,
          amount: product.priceInStars, // amount in Stars (1 Star = 1 unit, no cents)
        },
      ],
      {
        provider_token: "",    // empty string for Stars — moved to `other` in grammY v1.30+
        photo_url: product.photoUrl,
        // For digital goods, no shipping needed:
        need_shipping_address: false,
        is_flexible: false,
      }
    );
  } catch (err: any) {
    // 403: bot can't initiate conversation; 400: chat not found.
    const code = err?.error_code;
    if (code === 403 || code === 400) {
      throw new BotInvoiceError(
        "Bot cannot message this user — they must start the bot, or use openInvoice in-app.",
        true
      );
    }
    throw err;
  }
}

/**
 * Create a Stars invoice LINK (no chat required). Hand this link to the Mini App
 * frontend, which opens it with `openInvoice(link)` — the recommended in-app flow.
 */
export async function createStarsInvoiceLink(productId: string): Promise<string> {
  const product = PRODUCTS[productId];
  if (!product) throw new BotInvoiceError("Product not found", false);

  // createInvoiceLink takes the same fields; no chatId, no shipping for digital goods.
  return bot.api.createInvoiceLink(
    product.title,
    product.description,
    `${product.id}`, // payload — echoed back in pre_checkout_query
    "XTR",
    [{ label: product.title, amount: product.priceInStars }],
    { provider_token: "", photo_url: product.photoUrl }
  );
}
```

### Handle pre_checkout_query

**You MUST answer this within 10 seconds or the payment fails.**

```ts
// In src/lib/bot.ts — add these handlers

import { db } from "./database";
import { PRODUCTS } from "./payments";

// Pre-checkout: validate the order before Telegram charges the user
bot.on("pre_checkout_query", async (ctx) => {
  const query = ctx.preCheckoutQuery;

  try {
    // Validate the payload
    const productId = query.invoice_payload;
    const product = PRODUCTS[productId];

    if (!product) {
      // Second argument is the error_message string directly, not an object
      await ctx.answerPreCheckoutQuery(false, "This product is no longer available.");
      return;
    }

    // Validate price hasn't changed
    if (query.total_amount !== product.priceInStars) {
      await ctx.answerPreCheckoutQuery(false, "Price has changed. Please try again.");
      return;
    }

    // All good — approve the checkout
    await ctx.answerPreCheckoutQuery(true);
  } catch (err) {
    console.error("pre_checkout_query error:", err);
    // If anything goes wrong, reject — better than charging for nothing
    await ctx.answerPreCheckoutQuery(false, "Something went wrong. Please try again.");
  }
});

// Successful payment: fulfill the order
bot.on("message:successful_payment", async (ctx) => {
  const payment = ctx.message!.successful_payment!;

  const userId = ctx.from!.id;
  const productId = payment.invoice_payload;
  const totalAmount = payment.total_amount;
  const telegramPaymentChargeId = payment.telegram_payment_charge_id;
  const providerPaymentChargeId = payment.provider_payment_charge_id;

  console.log(
    `Payment received: user=${userId} product=${productId} ` +
    `amount=${totalAmount} XTR charge=${telegramPaymentChargeId}`
  );

  try {
    // Record in database
    await db.execute({
      sql: `INSERT INTO payments (user_id, product_id, amount, telegram_charge_id, provider_charge_id, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      args: [
        userId,
        productId,
        totalAmount,
        telegramPaymentChargeId,
        providerPaymentChargeId,
      ],
    });

    // Fulfill the purchase
    await fulfillPurchase(userId, productId);

    // Confirm to user
    const product = PRODUCTS[productId];
    await ctx.reply(
      `✅ Payment successful\\!\n\n` +
      `You purchased *${escapeMarkdownV2(product?.title || productId)}*\n` +
      `Amount: ${totalAmount} ⭐`,
      { parse_mode: "MarkdownV2" }
    );
  } catch (err) {
    console.error("Payment fulfillment error:", err);
    // IMPORTANT: Log this for manual resolution.
    // The payment already went through — you need to fulfill it.
    await ctx.reply(
      "Payment received but there was an error activating your purchase. " +
      "Please contact support with your payment ID: " +
      telegramPaymentChargeId
    );
  }
});

async function fulfillPurchase(userId: number, productId: string) {
  switch (productId) {
    case "premium_week":
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await db.execute({
        sql: `INSERT OR REPLACE INTO subscriptions (user_id, plan, expires_at)
              VALUES (?, 'premium', ?)`,
        args: [userId, expiresAt.toISOString()],
      });
      break;

    case "credits_100":
      await db.execute({
        sql: `UPDATE users SET credits = credits + 100 WHERE telegram_id = ?`,
        args: [userId],
      });
      break;

    default:
      console.warn(`Unknown product: ${productId}`);
  }
}
```

### Refund a Payment

```ts
// src/lib/payments.ts — add to existing file

export async function refundStarPayment(
  userId: number,
  telegramPaymentChargeId: string
): Promise<boolean> {
  try {
    // Use bot.api.refundStarPayment — not bot.api.raw
    await bot.api.refundStarPayment(userId, telegramPaymentChargeId);
    return true;
  } catch (err) {
    console.error("Refund failed:", err);
    return false;
  }
}
```

### Triggering Payment from Mini App Frontend (recommended: `openInvoice`)

The in-app flow works for **every** user (no DM prerequisite): the backend creates an invoice *link*, the frontend opens it with `openInvoice`, and the native payment sheet appears in place. Fulfillment still happens server-side in the `successful_payment` webhook — never trust the `openInvoice` status string for entitlements.

```tsx
// src/components/BuyButton.tsx
"use client";

import { useState } from "react";
import { openInvoice } from "@telegram-apps/sdk-react";
import { apiCall } from "@/lib/api";

export function BuyButton({ productId }: { productId: string }) {
  const [busy, setBusy] = useState(false);

  const handleBuy = async () => {
    setBusy(true);
    try {
      // 1. Ask the backend for a signed invoice link (no chat required).
      const { link } = await apiCall("/api/purchase", {
        method: "POST",
        body: JSON.stringify({ productId }),
      });

      // 2. Open the native Stars payment sheet in-app (URL mode).
      if (openInvoice.isAvailable()) {
        // status is Telegram's invoiceClosed status: "paid" | "cancelled" | "failed" | "pending".
        const status = await openInvoice(link, "url");
        // UI hint only — the webhook is the source of truth for fulfillment.
        if (status === "paid") {
          // optimistically refresh UI; real unlock arrives via successful_payment
        }
      } else {
        // Fallback for very old clients: open the link in Telegram.
        window.open(link, "_blank");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button onClick={handleBuy} disabled={busy} className="button-primary">
      {busy ? "…" : "⭐ Buy with Stars"}
    </button>
  );
}
```

```ts
// src/app/api/purchase/route.ts
import { NextResponse } from "next/server";
import { withTelegramAuth } from "@/lib/auth-middleware";
import { createStarsInvoiceLink, sendStarsInvoice, BotInvoiceError } from "@/lib/payments";

export const POST = withTelegramAuth(async (req, userId) => {
  const { productId, mode } = await req.json();

  if (typeof productId !== "string" || !/^[a-z0-9_]+$/.test(productId)) {
    return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
  }

  try {
    // Default: return an invoice link for the in-app openInvoice flow.
    if (mode !== "message") {
      const link = await createStarsInvoiceLink(productId);
      return NextResponse.json({ link });
    }

    // Optional: push an invoice message to the user's chat (needs an open chat).
    await sendStarsInvoice(userId, productId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof BotInvoiceError) {
      // 409 lets the client fall back to openInvoice or prompt "start the bot first".
      return NextResponse.json(
        { error: err.message, needsBotStart: err.needsBotStart },
        { status: err.needsBotStart ? 409 : 400 }
      );
    }
    throw err;
  }
});
```

> **`sendInvoice` message fallback:** only reach for `mode: "message"` when you specifically want a persistent invoice in the chat (e.g. from a `/start buy_…` deep link, where `ctx.chat.id` is a valid private chat). For purchases initiated inside the Mini App, the `openInvoice` link flow above is correct and avoids the 403/409 "user hasn't started the bot" failure.

---

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

## 9. Telegram Theme CSS Variables <a name="theme-css-variables"></a>

Your app should match the user's Telegram theme. **Always use CSS variables instead of hardcoding colors.** With `@telegram-apps/sdk` v3, calling `themeParams.bindCssVars()` (done in the provider in §2) injects the `--tg-theme-*` variables below and keeps them updated when the user switches light/dark — you do **not** need to read each color manually. (The raw `telegram-web-app.js` script also injects a similar set; bindCssVars normalizes naming across SDK versions.) `viewport.bindCssVars()` likewise injects `--tg-viewport-*` and the safe-area insets.

### Available Variables

```css
/* Core colors */
--tg-theme-bg-color              /* Main background */
--tg-theme-text-color            /* Primary text */
--tg-theme-hint-color            /* Secondary/hint text */
--tg-theme-link-color            /* Links */
--tg-theme-button-color          /* Primary button background */
--tg-theme-button-text-color     /* Primary button text */

/* Extended palette (Telegram 7.0+) */
--tg-theme-secondary-bg-color    /* Secondary background (cards, sections) */
--tg-theme-header-bg-color       /* Header background */
--tg-theme-accent-text-color     /* Accent text */
--tg-theme-section-bg-color      /* Section/card background */
--tg-theme-section-header-text-color  /* Section headers */
--tg-theme-subtitle-text-color   /* Subtitles */
--tg-theme-destructive-text-color /* Destructive/danger actions */

/* Viewport */
--tg-viewport-height             /* Visible viewport height */
--tg-viewport-stable-height      /* Stable height (excludes keyboard) */
```

### Base CSS Setup

```css
/* src/app/globals.css */

:root {
  /* Fallbacks for development outside Telegram */
  --tg-theme-bg-color: #ffffff;
  --tg-theme-text-color: #000000;
  --tg-theme-hint-color: #999999;
  --tg-theme-link-color: #2481cc;
  --tg-theme-button-color: #5288c1;
  --tg-theme-button-text-color: #ffffff;
  --tg-theme-secondary-bg-color: #f0f0f0;
  --tg-theme-header-bg-color: #ffffff;
  --tg-theme-accent-text-color: #2481cc;
  --tg-theme-section-bg-color: #ffffff;
  --tg-theme-section-header-text-color: #2481cc;
  --tg-theme-subtitle-text-color: #999999;
  --tg-theme-destructive-text-color: #cc2424;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
  overflow: hidden; /* Mini App manages its own scroll */
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  background-color: var(--tg-theme-bg-color);
  color: var(--tg-theme-text-color);
  -webkit-font-smoothing: antialiased;
  /* Prevent text selection in app-like UI */
  -webkit-user-select: none;
  user-select: none;
}

/* Allow text selection in content areas */
.selectable {
  -webkit-user-select: text;
  user-select: text;
}

/* Scrollable content area */
.content {
  height: var(--tg-viewport-stable-height, 100vh);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* Component examples */
.card {
  background: var(--tg-theme-section-bg-color);
  border-radius: 12px;
  padding: 16px;
  margin: 8px 16px;
}

.card-title {
  color: var(--tg-theme-section-header-text-color);
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.hint {
  color: var(--tg-theme-hint-color);
  font-size: 13px;
}

.button-primary {
  background: var(--tg-theme-button-color);
  color: var(--tg-theme-button-text-color);
  border: none;
  border-radius: 10px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  transition: opacity 0.2s;
}

.button-primary:active {
  opacity: 0.7;
}

.button-destructive {
  background: transparent;
  color: var(--tg-theme-destructive-text-color);
  border: none;
  font-size: 16px;
  cursor: pointer;
}

.divider {
  height: 1px;
  background: var(--tg-theme-hint-color);
  opacity: 0.2;
  margin: 0 16px;
}

a {
  color: var(--tg-theme-link-color);
  text-decoration: none;
}
```

### Tailwind CSS Integration

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        tg: {
          bg: "var(--tg-theme-bg-color)",
          text: "var(--tg-theme-text-color)",
          hint: "var(--tg-theme-hint-color)",
          link: "var(--tg-theme-link-color)",
          button: "var(--tg-theme-button-color)",
          "button-text": "var(--tg-theme-button-text-color)",
          "secondary-bg": "var(--tg-theme-secondary-bg-color)",
          "header-bg": "var(--tg-theme-header-bg-color)",
          accent: "var(--tg-theme-accent-text-color)",
          "section-bg": "var(--tg-theme-section-bg-color)",
          "section-header": "var(--tg-theme-section-header-text-color)",
          subtitle: "var(--tg-theme-subtitle-text-color)",
          destructive: "var(--tg-theme-destructive-text-color)",
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

Usage: `<div className="bg-tg-bg text-tg-text">` — adapts automatically to user theme.

---

## 10. MarkdownV2 Escaping <a name="markdownv2-escaping"></a>

Telegram's MarkdownV2 requires escaping special characters. Get this wrong and your messages fail silently or look broken.

### Characters That Must Be Escaped

```
_ * [ ] ( ) ~ ` > # + - = | { } . !
```

### Escape Function

```ts
// src/lib/telegram-utils.ts

/**
 * Escape a string for Telegram MarkdownV2.
 * Use this for ANY user-generated or dynamic text inserted into MarkdownV2 messages.
 */
export function escapeMarkdownV2(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

/**
 * Escape text for use inside a MarkdownV2 code block (`` ` `` or ``` ``` ```).
 * Only ` and \ need escaping inside code blocks.
 */
export function escapeMarkdownV2Code(text: string): string {
  return text.replace(/([`\\])/g, "\\$1");
}

/**
 * Escape text for use inside a MarkdownV2 link URL.
 * Only ) and \ need escaping inside (...) of links.
 */
export function escapeMarkdownV2Url(url: string): string {
  return url.replace(/([)\\])/g, "\\$1");
}

// --- Usage examples ---

// Simple message with dynamic content
const username = "John_Doe";
const msg = `Hello, *${escapeMarkdownV2(username)}*\\!`;
// Result: "Hello, *John\_Doe*\!"

// Link with dynamic URL
const title = "My Page (v2)";
const url = "https://example.com/page?a=1&b=2";
const linkMsg = `[${escapeMarkdownV2(title)}](${escapeMarkdownV2Url(url)})`;

// Code block
const code = "const x = `hello`";
const codeMsg = `\`\`\`js\n${escapeMarkdownV2Code(code)}\n\`\`\``;
```

### Common Patterns

```ts
// Bold text with dynamic content
`*${escapeMarkdownV2(product.title)}*`

// Italic
`_${escapeMarkdownV2(text)}_`

// Strikethrough
`~${escapeMarkdownV2(text)}~`

// Inline code
`\`${escapeMarkdownV2Code(text)}\``

// Spoiler
`||${escapeMarkdownV2(text)}||`

// ⚠️ WRONG — will break if text contains special chars:
`*${product.title}*`

// ✅ CORRECT:
`*${escapeMarkdownV2(product.title)}*`
```

---

## 11. Database Options <a name="database-options"></a>

### Development: SQLite (local file)

```bash
npm install @libsql/client
```

### Production: Turso (distributed SQLite at the edge)

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Create a database
turso db create my-miniapp
turso db show my-miniapp --url    # get the URL
turso db tokens create my-miniapp  # get auth token
```

### Unified Database Client

```ts
// src/lib/database.ts
import { createClient, type Client } from "@libsql/client";

let _db: Client | null = null;

export function getDb(): Client {
  if (_db) return _db;

  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && process.env.TURSO_DATABASE_URL) {
    _db = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  } else {
    // Local SQLite file for development
    _db = createClient({
      url: process.env.DATABASE_URL || "file:local.db",
    });
  }

  return _db;
}

export const db = getDb();

// Run migrations on startup
export async function migrate() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id INTEGER UNIQUE NOT NULL,
      username TEXT,
      first_name TEXT,
      credits INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      telegram_charge_id TEXT UNIQUE NOT NULL,
      provider_charge_id TEXT,
      status TEXT DEFAULT 'completed',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      plan TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, plan)
    );

    CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
    CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
    CREATE INDEX IF NOT EXISTS idx_payments_charge_id ON payments(telegram_charge_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
  `);
}
```

### Using the Database

```ts
// Upsert user on first visit
export async function ensureUser(
  telegramId: number,
  username?: string,
  firstName?: string
) {
  await db.execute({
    sql: `INSERT INTO users (telegram_id, username, first_name)
          VALUES (?, ?, ?)
          ON CONFLICT (telegram_id) DO UPDATE SET
            username = COALESCE(excluded.username, users.username),
            first_name = COALESCE(excluded.first_name, users.first_name),
            updated_at = datetime('now')`,
    args: [telegramId, username || null, firstName || null],
  });
}

// Check subscription
export async function hasActiveSubscription(
  telegramId: number
): Promise<boolean> {
  const result = await db.execute({
    sql: `SELECT 1 FROM subscriptions
          WHERE user_id = ? AND expires_at > datetime('now')
          LIMIT 1`,
    args: [telegramId],
  });
  return result.rows.length > 0;
}

// Get user credits
export async function getUserCredits(telegramId: number): Promise<number> {
  const result = await db.execute({
    sql: `SELECT credits FROM users WHERE telegram_id = ?`,
    args: [telegramId],
  });
  return (result.rows[0]?.credits as number) ?? 0;
}
```

---

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

## 13. Security Hardening <a name="security"></a>

### Checklist

- [x] **Validate initData HMAC on every API request** — never trust client-side data
- [x] **Verify webhook secret header** — prevents forged webhook calls
- [x] **Check auth_date freshness** — reject stale initData (24h max)
- [x] **Use timing-safe comparison** — prevents timing attacks on HMAC
- [x] **Sanitize all inputs** — never trust user data in SQL or messages
- [x] **Rate limit with a shared store** — never an in-memory `Map` on serverless (see below)
- [x] **Treat CloudStorage as client-controlled** — entitlements live server-side, never in CloudStorage
- [x] **Biometry is not auth** — server trust comes only from validated initData
- [x] **Log payment events** — audit trail for disputes; reconcile with `getStarTransactions`

### Webhook Secret Validation

Already shown in the webhook route above. The secret is set via `setWebhook` API and sent by Telegram in the `X-Telegram-Bot-Api-Secret-Token` header.

### Input Sanitization

```ts
// src/lib/sanitize.ts

/**
 * Validate and sanitize a product ID.
 * Only allow alphanumeric + underscores.
 */
export function sanitizeProductId(input: unknown): string | null {
  if (typeof input !== "string") return null;
  if (input.length > 64) return null;
  if (!/^[a-zA-Z0-9_]+$/.test(input)) return null;
  return input;
}

/**
 * Validate a Telegram user ID.
 */
export function sanitizeUserId(input: unknown): number | null {
  const num =
    typeof input === "number" ? input : parseInt(String(input), 10);
  if (!Number.isInteger(num) || num <= 0 || num > 2 ** 52) return null;
  return num;
}

/**
 * Sanitize text for display (strip control characters).
 */
export function sanitizeText(input: string, maxLength = 500): string {
  return input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // strip control chars
    .slice(0, maxLength)
    .trim();
}
```

### Rate Limiting (serverless-safe)

> **Do not ship an in-memory `Map` rate limiter to Vercel/Cloudflare/any multi-instance deploy.** Each serverless invocation may run in a fresh isolate, so the counter resets between requests and across regions — attackers fan out and the limit never trips. The `setInterval` cleanup also won't run on serverless. Use a shared store (Upstash Redis, Vercel KV, Cloudflare Durable Object / Rate Limiting binding, or your DB).

**Recommended — Upstash Redis sliding window** (works on Vercel/Edge/Node, free tier available):

```bash
npm install @upstash/ratelimit @upstash/redis
```

```ts
// src/lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Reads UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN from env.
const redis = Redis.fromEnv();

const limiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "60 s"), // 30 req / 60s per key
  analytics: true,
  prefix: "miniapp:rl",
});

/** Returns true if the caller is OVER the limit (i.e. should be blocked). */
export async function isRateLimited(key: string): Promise<boolean> {
  const { success } = await limiter.limit(key);
  return !success;
}
```

Use it in the auth middleware, keyed by the validated user id (so it survives IP rotation):

```ts
// inside withTelegramAuth, after validation succeeds:
if (await isRateLimited(`u:${result.data.user.id}`)) {
  return NextResponse.json({ error: "Too many requests" }, { status: 429 });
}
```

**Vercel KV alternative** (same shape — Upstash-compatible):

```ts
import { kv } from "@vercel/kv";
import { Ratelimit } from "@upstash/ratelimit";
const limiter = new Ratelimit({ redis: kv, limiter: Ratelimit.slidingWindow(30, "60 s") });
```

> For a **single long-lived Node process** (a VPS, not serverless) the in-memory `Map` approach is acceptable, but gate it behind an explicit `process.env.RATE_LIMIT_BACKEND === "memory"` flag and keep the cleanup `setInterval` — never make it the default for a Vercel deploy.

### Never Expose Bot Token

```ts
// ❌ WRONG — bot token in client-side code
const BOT_TOKEN = "<your-bot-token>"; // NEVER hardcode or ship to the client

// ✅ CORRECT — only in server-side code / env vars
// .env.local (never committed to git)
// BOT_TOKEN=<your-bot-token-from-botfather>

// In API routes (server-side only):
const BOT_TOKEN = process.env.BOT_TOKEN!;
```

---

## 14. Complete Example App <a name="complete-example"></a>

### package.json

> Version ranges below are the **mid-2026 tested set** (see the matrix at the top). Run `npm outdated` and check each package's releases page before pinning — Telegram's SDK and Bot API move quickly.

```json
{
  "name": "telegram-miniapp",
  "private": true,
  "engines": {
    "node": ">=20"
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

## Quick Reference

### Environment Variables Needed

```
BOT_TOKEN                  # From @BotFather (production/test bot)
DEV_BOT_TOKEN              # Throwaway bot token for signing mock initData (dev only)
NEXT_PUBLIC_DEV_BOT_TOKEN  # Same value, exposed client-side (dev only)
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

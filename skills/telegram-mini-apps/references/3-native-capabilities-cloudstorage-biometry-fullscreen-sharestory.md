## Contents

- 3. Native Capabilities: CloudStorage, Biometry, Fullscreen, shareStory <a name="native-capabilities"></a>
- 3.1 CloudStorage (per-user persistence)
- 3.2 Biometry (device unlock for a locally-stored token)
- 3.3 Fullscreen & viewport behavior
- 3.4 shareStory & shareMessage (virality)

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

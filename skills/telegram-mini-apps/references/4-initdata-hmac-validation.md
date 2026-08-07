## Contents

- 4. initData HMAC Validation <a name="initdata-validation"></a>
- How It Works
- Complete Validation Implementation
- API Route Middleware
- Usage in API Route

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

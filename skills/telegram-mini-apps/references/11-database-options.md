## Contents

- 11. Database Options <a name="database-options"></a>
- Development: SQLite (local file)
- Production: Turso (distributed SQLite at the edge)
- Unified Database Client
- Using the Database

## 11. Database Options <a name="database-options"></a>

### Development: SQLite (local file)

```bash
npm install @libsql/client
```

### Production: Turso (distributed SQLite at the edge)

```bash
# Install Turso CLI
# Official Turso installer; review it first if you prefer: curl -sSfL https://get.tur.so/install.sh | less
installer_1="$(mktemp)"
curl -sSfL https://get.tur.so/install.sh -o "$installer_1"
less "$installer_1"  # Review before execution; verify the release checksum/signature when published.
bash "$installer_1"

# Create a database
rm -f "$installer_1"
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

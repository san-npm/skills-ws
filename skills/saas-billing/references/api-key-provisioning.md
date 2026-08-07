## Contents

- API Key Provisioning
- Generating Secure API Keys
- Database Schema
- Provisioning & Revocation
- API Key Authentication Middleware

## API Key Provisioning

For SaaS products that expose an API, provision keys tied to the subscription lifecycle.

### Generating Secure API Keys

```js
const crypto = require('crypto');

// Generate a cryptographically secure API key.
// Use a PRODUCT-specific prefix (e.g. `myapp_live_`) — never `sk_`, which collides
// with Stripe secret keys (`sk_live_`/`sk_test_`) and confuses secret scanners.
function generateApiKey(prefix = 'myapp_live') {
  const key = crypto.randomBytes(32).toString('hex');  // 64 hex chars
  return `${prefix}_${key}`;
  // Example: myapp_live_a1b2c3d4e5f6...
}

// Hash for storage (never store plaintext keys in your DB)
function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}
```

### Database Schema

```sql
CREATE TABLE api_keys (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  key_hash VARCHAR(64) NOT NULL UNIQUE,
  key_prefix VARCHAR(24) NOT NULL,        -- leading chars for display: "myapp_live_a1b2..."
  name VARCHAR(100) DEFAULT 'Default',
  scopes TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_hash ON api_keys (key_hash) WHERE is_active = true;
CREATE INDEX idx_api_keys_user ON api_keys (user_id) WHERE is_active = true;
```

### Provisioning & Revocation

```js
async function provisionApiKey(userId) {
  // Check if user already has an active key
  const existing = await db.query(
    'SELECT id FROM api_keys WHERE user_id = $1 AND is_active = true',
    [userId]
  );

  if (existing.rows.length > 0) {
    return; // Already has a key
  }

  const apiKey = generateApiKey();           // product-prefixed, e.g. myapp_live_...
  const keyHash = hashApiKey(apiKey);
  const keyPrefix = apiKey.substring(0, 18) + '...'; // store namespace + a few chars for display

  await db.query(
    `INSERT INTO api_keys (user_id, key_hash, key_prefix, name)
     VALUES ($1, $2, $3, 'Default')`,
    [userId, keyHash, keyPrefix]
  );

  // Send the key to the user (email, dashboard, etc.)
  // This is the ONLY time the full key is visible.
  await sendEmail(userId, 'api-key-provisioned', { apiKey, keyPrefix });

  return apiKey;
}

async function revokeApiKey(userId) {
  await db.query(
    `UPDATE api_keys SET
      is_active = false,
      revoked_at = NOW()
    WHERE user_id = $1 AND is_active = true`,
    [userId]
  );
}

// Validate an API key on incoming requests
async function validateApiKey(apiKey) {
  const keyHash = hashApiKey(apiKey);

  const result = await db.query(
    `SELECT ak.id, ak.user_id, ak.scopes, u.plan, u.subscription_status
     FROM api_keys ak
     JOIN users u ON u.id = ak.user_id
     WHERE ak.key_hash = $1
       AND ak.is_active = true
       AND (ak.expires_at IS NULL OR ak.expires_at > NOW())`,
    [keyHash]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const keyData = result.rows[0];

  // Check subscription is active
  if (!['active', 'trialing'].includes(keyData.subscription_status)) {
    return null;
  }

  // Update last_used_at (fire and forget)
  db.query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [keyData.id]);

  return keyData;
}
```

### API Key Authentication Middleware

```js
async function authenticateApiKey(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing API key' });
  }

  const apiKey = authHeader.substring(7);
  const keyData = await validateApiKey(apiKey);

  if (!keyData) {
    return res.status(401).json({ error: 'Invalid or expired API key' });
  }

  req.userId = keyData.user_id;
  req.plan = keyData.plan;
  req.scopes = keyData.scopes;
  next();
}

// Usage
app.get('/api/v1/data', authenticateApiKey, (req, res) => {
  res.json({ userId: req.userId, plan: req.plan });
});
```

---

## Contents

- Core Concepts
- Stripe Object Hierarchy
- Required Dependencies
- Environment Variables
- Stripe Client Initialization

## Core Concepts

### Stripe Object Hierarchy

```
Customer
  └── Subscription
        ├── Subscription Item (linked to a Price)
        │     └── Price (linked to a Product)
        │           └── Product
        └── Invoice
              └── Payment Intent → Payment Method
```

### Required Dependencies

```bash
npm install stripe express dotenv express-rate-limit
# Note: `crypto` is a Node.js core module — do NOT `npm install crypto`
# (that installs an abandoned, deprecated userland package). `require('crypto')` works out of the box.
# `body-parser` is unnecessary — Express 4.16+/5 ship `express.raw()` and `express.json()` built in.
```

Pin the Stripe SDK to a known major (`npm install stripe@^22`); the SDK major and the pinned `apiVersion` evolve together.

### Environment Variables

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PORTAL_CONFIG_ID=bpc_...    # optional
DATABASE_URL=postgres://...
```

### Stripe Client Initialization

```js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-06-24.dahlia',   // pin the API version
  maxNetworkRetries: 2,
});
```

**Always pin your API version.** Stripe changes behavior across versions. Pinning prevents silent breakage.

> Version note (as of Jul 2026): `2026-06-24.dahlia` is the current GA version and stripe-node v22 pins it. Before copying these examples, confirm the version your account defaults to (Dashboard → Developers → API version / Workbench) and the version your installed SDK major expects, then verify the latest at https://docs.stripe.com/api/versioning and https://docs.stripe.com/changelog. Bumping the version may change object shapes (e.g. invoice/subscription fields), so test webhooks against the new version before deploying.

---

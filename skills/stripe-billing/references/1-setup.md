## 1. Setup

```bash
npm install stripe@19.1 @stripe/stripe-js @stripe/react-stripe-js
```

```typescript
// lib/stripe.ts — server-side only
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Pin a specific Stripe API version and the matching SDK release (stripe-node 19.0-19.1
  // pins 2025-09-30.clover; 19.2 moved to 2025-10-29.clover). Bump both together,
  // deliberately: newer majors (stripe 21+) pin the Dahlia line (2026-06-24.dahlia is
  // current GA) and their TypeScript types reject older apiVersion literals.
  apiVersion: '2025-09-30.clover',
  typescript: true,
  maxNetworkRetries: 3,
  timeout: 20000,
});
```

```typescript
// lib/stripe-client.ts — browser-safe
import { loadStripe } from '@stripe/stripe-js';

let stripePromise: ReturnType<typeof loadStripe>;
export function getStripe() {
  if (!stripePromise) stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  return stripePromise;
}
```

---

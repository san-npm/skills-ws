## Contents

- 5. Customer Portal
- Portal configuration

## 5. Customer Portal

```typescript
// app/api/billing/portal/route.ts
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await db.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { stripeCustomerId: true },
  });

  const portal = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId!,
    return_url: `${process.env.NEXT_PUBLIC_URL}/settings/billing`,
  });

  return NextResponse.json({ url: portal.url });
}
```

### Portal configuration

Configure the portal once per environment (run with `npx tsx scripts/configure-portal.ts`). Re-running `create` makes a new default configuration each time, so update the existing default if present to keep this idempotent:

```typescript
// scripts/configure-portal.ts
import Stripe from 'stripe';
import { stripe } from '../lib/stripe';

const params: Stripe.BillingPortal.ConfigurationCreateParams = {
  business_profile: {
    headline: 'Manage your subscription',
    privacy_policy_url: 'https://example.com/privacy',
    terms_of_service_url: 'https://example.com/terms',
  },
  features: {
    subscription_update: {
      enabled: true,
      default_allowed_updates: ['price', 'quantity'],
      proration_behavior: 'always_invoice',
      products: [{
        product: process.env.STRIPE_PRODUCT_ID!,
        prices: [process.env.STRIPE_PRICE_PRO!, process.env.STRIPE_PRICE_TEAM!],
      }],
    },
    subscription_cancel: {
      enabled: true,
      mode: 'at_period_end',
      cancellation_reason: {
        enabled: true,
        options: ['too_expensive', 'missing_features', 'switched_service', 'unused', 'other'],
      },
    },
    payment_method_update: { enabled: true },
    invoice_history: { enabled: true },
  },
};

async function main() {
  const existing = await stripe.billingPortal.configurations.list({ is_default: true, limit: 1 });
  const cfg = existing.data[0]
    ? await stripe.billingPortal.configurations.update(existing.data[0].id, params)
    : await stripe.billingPortal.configurations.create(params);
  console.log('Portal configuration:', cfg.id);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

---

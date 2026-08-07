## Payments (Stripe)

Security rules that the naive snippet gets wrong — apply all of them:

- **Never trust `userId` from the request body.** Derive identity from the server session (`auth()`).
- **Never pass an arbitrary `priceId` from the client.** Allowlist your real price IDs server-side and map a plan key → price ID. A spoofed `priceId` lets a user subscribe at the wrong (e.g. $0) price.
- **Create/reuse one Stripe customer per user** and stash `stripeCustomerId` in your DB, so billing, portal, and webhooks line up.
- Centralize the SDK in `src/lib/stripe.ts` and **pin `apiVersion`** so Stripe API upgrades don't silently change behavior (check the current version in your Stripe dashboard).

```typescript
// src/lib/stripe.ts
import Stripe from 'stripe';
// Pin to your account's current API version (Dashboard → Developers → API version).
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-06-24.dahlia' });

// Server-side allowlist — the client sends a plan key, never a price ID.
export const PRICES = {
  pro_monthly: process.env.STRIPE_PRO_PRICE_ID!,
} as const;
export type PlanKey = keyof typeof PRICES;
```

```typescript
// src/app/api/stripe/checkout/route.ts
import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { stripe, PRICES, type PlanKey } from '@/lib/stripe';

export async function POST(req: Request) {
  const { userId } = await auth();                       // identity from session
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const { plan } = (await req.json()) as { plan: PlanKey };
  const price = PRICES[plan];                             // allowlisted; reject unknown plans
  if (!price) return new NextResponse('Invalid plan', { status: 400 });

  const user = await db.user.findUniqueOrThrow({ where: { clerkId: userId } });

  // Create or reuse exactly one Stripe customer for this user.
  let customerId = user.subscription?.stripeCustomerId;
  if (!customerId) {
    const cu = await currentUser();
    const customer = await stripe.customers.create({
      email: cu?.emailAddresses[0]?.emailAddress,
      metadata: { appUserId: user.id },
    });
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_URL}/dashboard?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/pricing`,
    // Tie the session back to your user for the webhook (do NOT trust client userId).
    metadata: { appUserId: user.id },
    subscription_data: { metadata: { appUserId: user.id } },
  });
  return NextResponse.json({ url: session.url });
}
```

**Customer portal** — let users manage/cancel without you building billing UI:

```typescript
// src/app/api/stripe/portal/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { stripe } from '@/lib/stripe';

export async function POST() {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });
  const user = await db.user.findUniqueOrThrow({
    where: { clerkId: userId }, include: { subscription: true },
  });
  const customerId = user.subscription?.stripeCustomerId;
  if (!customerId) return new NextResponse('No customer', { status: 400 });
  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_URL}/dashboard`,
  });
  return NextResponse.json({ url: portal.url });
}
```

**Webhook** — the route's correctness is load-bearing. Requirements:
- `export const runtime = 'nodejs'` — signature verification needs Node crypto and the **raw** body. Do not run it on Edge.
- Read the **raw** request text with `await req.text()` — never `req.json()`, which mutates the body and breaks the signature.
- **Verify the signature**, then process. An unverified body is attacker-controlled.
- **Idempotency:** Stripe retries and may deliver duplicates/out-of-order. Record processed `event.id`s (unique column) and no-op on repeats so a retried `subscription.deleted` can't clobber a newer `subscription.updated`.
- Handle the **full lifecycle**, not just two events.
- Return 2xx fast; if a handler throws, return non-2xx so Stripe retries.

```typescript
// src/app/api/stripe/webhook/route.ts
export const runtime = 'nodejs';            // REQUIRED: raw body + node crypto

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const body = await req.text();            // RAW body, not json()
  const sig = (await headers()).get('stripe-signature')!;
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new NextResponse('Invalid signature', { status: 400 });
  }

  // Idempotency: skip if we've already handled this event id.
  // (Model: WebhookEvent { id String @id }  — `id` is Stripe's event.id.)
  try {
    await db.webhookEvent.create({ data: { id: event.id } });
  } catch {
    return NextResponse.json({ received: true, duplicate: true });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object as Stripe.Checkout.Session;
      const sub = await stripe.subscriptions.retrieve(s.subscription as string);
      await upsertSubscription(s.metadata?.appUserId, sub);
      break;
    }
    case 'customer.subscription.updated':      // plan change, renewal, trial end
    case 'customer.subscription.deleted': {     // canceled / fully ended
      const sub = event.data.object as Stripe.Subscription;
      await upsertSubscription(sub.metadata?.appUserId, sub);
      break;
    }
    case 'invoice.payment_failed': {            // dunning — flag the account
      // mark subscription past_due / notify the user
      break;
    }
  }
  return NextResponse.json({ received: true });
}

async function upsertSubscription(appUserId: string | undefined, sub: Stripe.Subscription) {
  if (!appUserId) return;                       // trust metadata we set server-side only
  const data = {
    stripeCustomerId: sub.customer as string,
    stripeSubscriptionId: sub.id,
    stripePriceId: sub.items.data[0]?.price.id ?? '',
    status: sub.status,                         // active | trialing | past_due | canceled
    currentPeriodEnd: new Date(sub.items.data[0].current_period_end * 1000),
  };
  await db.subscription.upsert({
    where: { userId: appUserId },
    create: { userId: appUserId, ...data },
    update: data,
  });
}
```

Add the dedupe model to your schema: `model WebhookEvent { id String @id; createdAt DateTime @default(now()) }`. Deeper Stripe billing patterns (proration, trials, metered usage, tax) are in `stripe-billing`.

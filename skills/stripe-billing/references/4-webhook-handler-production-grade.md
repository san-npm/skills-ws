## 4. Webhook Handler — Production Grade

Idempotency must be **durable and atomic**, not Redis-only. A Redis flush would let old events replay and re-mutate billing state, and two concurrent deliveries of the same event can both pass a `GET` before either `SETEX`. Use the database as the source of truth with a unique constraint on the event id, and *claim before processing*:

```prisma
// schema.prisma
model ProcessedWebhook {
  eventId     String   @id          // Stripe event.id — unique constraint = the idempotency lock
  type        String
  processedAt DateTime @default(now())
}
```

```typescript
// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  const body = await req.text();        // raw body — required for signature verification
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Claim the event durably and atomically BEFORE doing work. The unique PK makes a
  // duplicate delivery (or a concurrent one) fail the insert → we ack 200 and skip.
  try {
    await db.processedWebhook.create({ data: { eventId: event.id, type: event.type } });
  } catch (err) {
    if (isUniqueViolation(err)) return NextResponse.json({ received: true, duplicate: true });
    throw err;
  }

  try {
    await handleEvent(event);
    return NextResponse.json({ received: true });
  } catch (err) {
    // Roll back the claim so Stripe's retry can reprocess. Stripe retries 5xx with backoff.
    await db.processedWebhook.delete({ where: { eventId: event.id } }).catch(() => {});
    console.error(`Webhook error [${event.type}]:`, err);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }
}

// Prisma unique-constraint code is P2002; adapt for your driver.
function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002';
}

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      // A sub can have multiple items (e.g. base + metered). Pick the licensed plan item,
      // not blindly items.data[0], or a metered add-on can shadow the real plan.
      const planMap: Record<string, string> = {
        [process.env.STRIPE_PRICE_PRO!]: 'pro',
        [process.env.STRIPE_PRICE_TEAM!]: 'team',
      };
      const planItem = sub.items.data.find((i) => planMap[i.price.id]) ?? sub.items.data[0];

      // Basil-line: period end is on the item, not the subscription.
      const periodEnd = planItem.current_period_end;

      // Ordering: events can arrive out of order. event.created is the authoritative clock —
      // ignore an update older than what we last applied so a late 'created' can't clobber
      // a newer 'updated'. (Store lastEventAt alongside the subscription row.)
      await db.user.updateMany({
        where: {
          stripeCustomerId: sub.customer as string,
          OR: [{ lastEventAt: null }, { lastEventAt: { lt: new Date(event.created * 1000) } }],
        },
        data: {
          stripeSubscriptionId: sub.id,
          subscriptionStatus: sub.status,                 // raw Stripe status; entitlement derived separately (§10)
          planId: planMap[planItem.price.id] ?? 'unknown',
          currentPeriodEnd: new Date(periodEnd * 1000),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          lastEventAt: new Date(event.created * 1000),
        },
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await db.user.update({
        where: { stripeCustomerId: sub.customer as string },
        data: { subscriptionStatus: 'canceled', stripeSubscriptionId: null, planId: null },
      });
      break;
    }

    case 'invoice.payment_succeeded': {
      const inv = event.data.object as Stripe.Invoice;
      await db.invoice.upsert({
        where: { stripeInvoiceId: inv.id },
        create: {
          stripeInvoiceId: inv.id,
          stripeCustomerId: inv.customer as string,
          amount: inv.amount_paid,
          currency: inv.currency,
          status: 'paid',
          pdfUrl: inv.invoice_pdf,
          paidAt: new Date(inv.status_transitions.paid_at! * 1000),
        },
        update: { status: 'paid' },
      });
      break;
    }

    case 'invoice.payment_failed': {
      const inv = event.data.object as Stripe.Invoice;
      // Dunning emails based on attempt count
      if (inv.attempt_count === 1) {
        await sendEmail(inv.customer_email!, 'payment-failed-soft', { url: inv.hosted_invoice_url });
      } else if (inv.attempt_count >= 3) {
        await sendEmail(inv.customer_email!, 'payment-failed-final', { url: inv.hosted_invoice_url });
      }
      await db.user.update({
        where: { stripeCustomerId: inv.customer as string },
        data: { subscriptionStatus: 'past_due' },
      });
      break;
    }

    case 'customer.subscription.trial_will_end': {
      const sub = event.data.object as Stripe.Subscription;
      const cust = await stripe.customers.retrieve(sub.customer as string) as Stripe.Customer;
      await sendEmail(cust.email!, 'trial-ending', {
        trialEnd: new Date(sub.trial_end! * 1000).toLocaleDateString(),
      });
      break;
    }
  }
}

async function sendEmail(to: string, template: string, data: Record<string, any>) {
  console.log(`[email] ${template} → ${to}`, data);
}
```

---

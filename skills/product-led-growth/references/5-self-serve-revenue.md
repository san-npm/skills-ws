## Contents

- 5. Self-Serve Revenue
- In-App Upgrade Prompts
- Pricing Page Optimization for Self-Serve
- Payment Integration Patterns (Stripe Billing)
- Expansion Revenue

## 5. Self-Serve Revenue

### In-App Upgrade Prompts

**Contextual > Random.** Trigger upgrades when the user HITS a limit, not at arbitrary times.

| Trigger | Prompt | Example |
|---------|--------|---------|
| Hit usage limit | "You've used 3/3 free projects. Upgrade for unlimited." | Notion |
| Tried gated feature | "Advanced analytics is available on Pro. Try free for 14 days." | Mixpanel |
| Team growth | "Your team has 6 members. Free supports 5. Upgrade to keep collaborating." | Figma |
| Export/download | "Export to PDF is a Pro feature. Upgrade to download." | Canva |
| Time-based | "Your trial ends in 3 days. Here's what you'll lose..." | Most SaaS |

**Anti-patterns (don't do these):**
- ❌ Full-screen modal on login (hostile)
- ❌ Upgrade prompt on every page (annoying)
- ❌ Hiding the close button (dark pattern)
- ❌ Nagging after user dismissed (once is enough per session)

### Pricing Page Optimization for Self-Serve

- **3 tiers maximum** (Free, Pro, Enterprise) — more = decision paralysis
- **Highlight the recommended plan** (visual emphasis, "Most Popular" badge)
- **Annual vs monthly toggle** — show annual savings prominently ("Save 20%")
- **Feature comparison table** — full matrix with checkmarks, below the fold
- **FAQ section** — address objections: "Can I cancel anytime?", "What happens to my data?"
- **Social proof near CTA** — "Join 10,000+ teams" or customer logos
- **Money-back guarantee** — reduces purchase anxiety

### Payment Integration Patterns (Stripe Billing)

Stripe is the default for self-serve SaaS. APIs evolve — pin a Stripe API version in your account and confirm exact parameters at https://docs.stripe.com/billing before shipping. (If your app is Next.js/serverless, also see the sibling `stripe-billing` skill for framework wiring.)

**The four moving parts:**

| Piece | What it does | Stripe object |
|-------|--------------|---------------|
| Checkout Session | Hosted, PCI-compliant page that collects payment and starts a subscription | `checkout.session` (`mode: 'subscription'`) |
| Customer Portal | Stripe-hosted page where users upgrade/downgrade/cancel/update card — you build none of this | Billing Customer Portal |
| Subscription | The recurring relationship; carries one or more items (tiers, seats, metered usage) | `subscription`, `subscription_item` |
| Webhooks | The source of truth that tells *your* DB what actually happened | `event` (verify signature) |

**Golden rule: never grant entitlements from the browser redirect.** The `success_url` only means the user came back — it does not mean payment cleared. Grant access from **webhooks** only.

**1. Start a subscription (server-side):**
```js
// mode 'subscription' = recurring; use 'payment' for one-time, 'setup' to save a card for later.
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  customer: stripeCustomerId,                 // reuse an existing Customer; don't create dupes
  line_items: [{ price: 'price_pro_monthly', quantity: seatCount }],
  client_reference_id: internalAccountId,     // map the session back to YOUR account
  subscription_data: { trial_period_days: 14 },
  allow_promotion_codes: true,
  success_url: 'https://app.example.com/billing?session_id={CHECKOUT_SESSION_ID}',
  cancel_url:  'https://app.example.com/pricing',
});
// redirect the user to session.url
```

**2. Let users self-manage (no custom billing UI needed):**
```js
const portal = await stripe.billingPortal.sessions.create({
  customer: stripeCustomerId,
  return_url: 'https://app.example.com/settings',
});
// redirect to portal.url — Stripe handles upgrades, proration, cancellation, card updates, invoices
```

**3. Webhook handler = your entitlement engine.** Verify the signature, then act on these events:

| Event | Do this |
|-------|---------|
| `checkout.session.completed` | First grant: read `client_reference_id`, mark account paid, store `customer`/`subscription` IDs |
| `customer.subscription.created` / `customer.subscription.updated` | Re-sync entitlements from the subscription's items, price, `status`, and `quantity` (this is the canonical "what plan are they on now" event — fires on upgrade, downgrade, seat change, trial→active) |
| `customer.subscription.deleted` | Revoke entitlements / drop to free tier |
| `invoice.paid` | Confirm continued access for the new period |
| `invoice.payment_failed` | Enter dunning / grace state (Stripe also retries automatically per your retry settings) |

```js
// Express example — note express.raw: signature verification needs the UNPARSED body.
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook signature failed: ${err.message}`);
  }

  // Idempotency: Stripe can deliver the same event more than once.
  // Record event.id and no-op if you've already processed it.
  if (alreadyProcessed(event.id)) return res.json({ received: true });

  switch (event.type) {
    case 'checkout.session.completed':
      grantAccess(event.data.object.client_reference_id, event.data.object.subscription);
      break;
    case 'customer.subscription.updated':
    case 'customer.subscription.created':
      syncEntitlements(event.data.object);   // map price/items/status → your feature flags
      break;
    case 'customer.subscription.deleted':
      downgradeToFree(event.data.object.customer);
      break;
    case 'invoice.payment_failed':
      enterDunning(event.data.object.customer);
      break;
  }
  markProcessed(event.id);
  res.json({ received: true });
});
```

**4. Usage-based billing — use Stripe Billing *Meters* (the modern API; the old "Metering API" / `usage_records` flow is legacy).**
```js
// Define a Meter once (e.g., event_name 'api_request'), attach a metered Price to it,
// then report usage as meter events — Stripe aggregates and bills at period end.
await stripe.billing.meterEvents.create({
  event_name: 'api_request',
  payload: { stripe_customer_id: stripeCustomerId, value: '1' },
  identifier: dedupeKey,   // unique per usage unit → safe to retry without double-billing
});
```
Pattern: `track usage events → report as meter events (idempotent) → Stripe Billing Meters aggregate → metered Price invoices at period end`. For hybrid plans, put a flat-fee item and a metered item on the same subscription.

**Entitlement sync — the part teams get wrong:**
- Treat the Stripe subscription as the source of truth and your DB as a *cache*. On every subscription event, recompute the account's plan + limits from the subscription's `items`, `status`, and `quantity` rather than incrementing local counters.
- Map plan → feature flags in one place (a `priceId → entitlements` table) so Free/Pro/Enterprise gating stays consistent across the app.
- Handle the in-between `status` values (`trialing`, `past_due`, `unpaid`, `canceled`) explicitly — `past_due` should usually keep access during the grace/dunning window, `canceled`/`unpaid` should revoke.

**Other implementation details:**
- Always handle webhooks idempotently (key on `event.id`); same event may fire twice.
- Let Stripe handle dunning via its automatic retry + Smart Retries settings rather than hand-rolling a retry schedule.
- Prorate upgrades mid-cycle (Stripe does this by default on subscription item changes); schedule downgrades for period end so users keep what they paid for.

**Verify before you ship (test mode):**
- Use **test-mode** keys and Stripe's test cards (e.g., `4242 4242 4242 4242` succeeds; `4000 0000 0000 0341` triggers a failed payment for dunning tests).
- Run the **Stripe CLI** to forward events locally and replay them: `stripe listen --forward-to localhost:3000/webhooks/stripe`, then `stripe trigger checkout.session.completed`. Confirm your DB ends in the right entitlement state for each event before going live.

### Expansion Revenue

Expansion revenue = revenue growth from existing customers (upsells + cross-sells).

**Expansion levers:**

| Lever | Mechanism | Example |
|-------|----------|---------|
| Seat-based | More users = more revenue | Slack, Linear (per-seat paid plans) |
| Usage-based | More usage = more revenue | AWS, Twilio, OpenAI |
| Feature upsell | Upgrade to higher tier | Zoom: Pro → Business |
| Cross-sell | Buy additional products | Atlassian: Jira + Confluence |
| Platform fees | % of transaction | Stripe, Shopify (per-transaction take rate — verify current rate on the vendor's pricing page) |

**Target: > 120% Net Revenue Retention (NRR).** This means expansion revenue exceeds churn.

```
NRR = (Starting MRR + Expansion - Contraction - Churn) / Starting MRR × 100

Example:
Starting MRR: $100k
Expansion: +$15k
Contraction: -$3k
Churn: -$5k
NRR = ($100k + $15k - $3k - $5k) / $100k = 107%
```

**NRR benchmarks:**
- < 100%: Shrinking (churn > expansion) — urgent problem
- 100-110%: Healthy
- 110-130%: Strong
- 130%+: Exceptional

The often-cited figures for Snowflake, Datadog, Twilio, Slack, etc. are point-in-time numbers from specific past quarters and have generally compressed since the 2021 peak — most have trended down toward (or below) ~120% as they matured. Don't quote a specific company's NRR from memory; pull the current figure from its latest quarterly earnings / 10-Q (public SaaS companies report NRR or "net dollar retention" there).

---
name: product-led-growth
description: "Product-led growth playbooks — activation loops, viral mechanics, freemium gating, PQL scoring, self-serve revenue, and product-led sales. Use when designing PLG onboarding, defining aha/activation metrics, building freemium gates or reverse trials, scoring PQLs, wiring self-serve Stripe billing, or layering sales onto self-serve."
---

# Product-Led Growth (PLG)

## 1. PLG Fundamentals

### PLG vs Sales-Led vs Marketing-Led

| Dimension | Product-Led | Sales-Led | Marketing-Led |
|-----------|------------|-----------|---------------|
| Primary acquisition | Self-serve signup | Outbound sales | Inbound content/ads |
| First touch | Free trial / freemium | Demo call / RFP | Lead magnet / webinar |
| Time to value | Minutes to hours | Weeks to months | Days to weeks |
| CAC | Low ($0-50) | High ($5k-50k+) | Medium ($200-2k) |
| Deal size sweet spot | $0-25k ARR | $50k-500k+ ARR | $5k-100k ARR |
| Conversion driver | Product experience | Sales rep relationship | Content + nurture |
| Expansion motion | Self-serve upgrade + usage | Account executive upsell | Marketing-assisted |
| Examples | Slack, Figma, Notion, Canva | Salesforce, Workday, Palantir | HubSpot, Drift, Intercom |

### When PLG Works (and When It Doesn't)

**PLG works when:**
- End users CAN adopt without IT/procurement approval
- Value is demonstrable within minutes, not months
- Product has natural collaboration or sharing hooks
- Low switching cost from alternatives (or no alternative)
- Large addressable user base (not 50 companies in the world)

**PLG doesn't work when:**
- Product requires complex integration before any value (e.g., data warehouse migration)
- Buyer ≠ user and buyer won't let user self-serve
- Regulatory/compliance blocks self-serve adoption
- Total addressable market is < 1,000 companies
- Average deal size must be > $100k to make unit economics work

### The PLG Flywheel

```
┌─────────┐     ┌───────────┐     ┌─────────┐     ┌─────────┐     ┌───────────┐
│ ACQUIRE │ ──→ │ ACTIVATE  │ ──→ │ RETAIN  │ ──→ │ EXPAND  │ ──→ │ ADVOCATE  │
│ Sign up │     │ Aha moment│     │ Habit    │     │ Upgrade │     │ Refer     │
└─────────┘     └───────────┘     └─────────┘     └─────────┘     └───────────┘
      ↑                                                                  │
      └──────────────────────────────────────────────────────────────────┘
```

Each stage feeds the next. Advocacy drives acquisition. The flywheel compounds.

**Key principle:** Fix stages in order. No point driving acquisition if activation is broken. No point optimizing retention if users never activate.

## 2. Activation Framework

### Defining Your Aha Moment

The aha moment is the action (or set of actions) that correlates most strongly with long-term retention. It's when the user first experiences your product's core value.

**Famous examples (historical / anecdotal — treat as illustrations of the *pattern*, not as current benchmarks):**

These figures come from growth talks and case studies circa 2013–2020; the exact thresholds were never independently audited and the products have changed since. Use them to understand the *shape* of an aha moment, then derive your own from your data (method below). Do not quote these numbers as if they were current facts.

| Company | Aha Moment (as reported) | Reported signal | Era |
|---------|--------------------------|-----------------|-----|
| Slack | Team sends ~2,000 messages | High retention past this threshold | ~2014–2015 |
| Dropbox | Saves ≥1 file to a synced folder | Markedly higher retention vs non-savers | ~2010s |
| Facebook | 7 friends in 10 days | Retention cliff below this | ~2008–2012 |
| Zoom | Hosts first meeting | High return rate | ~2017–2019 |
| Figma | Invites a collaborator to a file | Higher retention vs solo users | ~2018–2020 |
| Notion | Creates several content-filled pages | Habit-formation threshold | ~2019–2020 |
| Calendly | Shares a link and gets first booking | Value realized | ~2018–2020 |

**The takeaway is the *type* of action, not the literal number:** the durable aha moments are collaborative (invite/share), data-creating (save/create), or outcome-producing (first booking/meeting). Always recompute the threshold for your own product.

**How to find YOUR aha moment:**
1. List all user actions in first 7 days
2. For each action, calculate Day 30 retention rate for users who did it vs didn't — **and the sample size in each group** (a 90% delta on 11 users is noise)
3. Rank candidates by retention delta, but discard any where either arm has < ~100 users or where the difference isn't statistically significant
4. **Beware confounders:** the action may just be a marker of an already-engaged user (selection bias), not the cause of retention. Control for an engagement proxy (e.g., sessions in days 0–2) before crediting the action
5. **Prove causation, don't assume it:** run a holdout experiment — randomly nudge half of new users toward the action and leave the other half alone, then compare Day-30 retention. If retention rises in the nudged arm, the action is causal and worth designing onboarding around. Correlation alone (steps 2–3) only generates the hypothesis

```sql
-- Find aha-moment candidates: for each candidate action,
-- compare day-30 retention of users who did it vs users who didn't.
WITH user_actions AS (
  SELECT
    e.user_id,
    MAX(CASE WHEN e.event = 'invited_teammate'     THEN 1 ELSE 0 END) AS invited,
    MAX(CASE WHEN e.event = 'created_project'      THEN 1 ELSE 0 END) AS created_project,
    MAX(CASE WHEN e.event = 'connected_integration' THEN 1 ELSE 0 END) AS connected
  FROM events e
  JOIN users  u ON u.id = e.user_id
  WHERE e.created_at BETWEEN u.signup_date AND u.signup_date + INTERVAL '7 days'
  GROUP BY e.user_id
),
retention AS (
  SELECT DISTINCT e.user_id, 1 AS retained_d30
  FROM events e
  JOIN users  u ON u.id = e.user_id
  WHERE e.created_at BETWEEN u.signup_date + INTERVAL '28 days'
                         AND u.signup_date + INTERVAL '35 days'
),
candidate AS (
  SELECT 'invited_teammate'       AS action, invited         AS did_it, user_id FROM user_actions
  UNION ALL
  SELECT 'created_project',       created_project, user_id FROM user_actions
  UNION ALL
  SELECT 'connected_integration', connected,       user_id FROM user_actions
),
stats AS (
  SELECT
    c.action,
    COUNT(*) FILTER (WHERE c.did_it = 1)                                  AS n_yes,
    COUNT(*) FILTER (WHERE c.did_it = 0)                                  AS n_no,
    AVG(COALESCE(r.retained_d30, 0)) FILTER (WHERE c.did_it = 1)::numeric AS p_yes,
    AVG(COALESCE(r.retained_d30, 0)) FILTER (WHERE c.did_it = 0)::numeric AS p_no
  FROM candidate c
  LEFT JOIN retention r ON r.user_id = c.user_id
  GROUP BY c.action
)
SELECT
  action,
  n_yes, n_no,
  ROUND(p_yes, 3)                       AS retention_if_yes,
  ROUND(p_no,  3)                       AS retention_if_no,
  ROUND(p_yes - p_no, 3)                AS abs_delta,
  ROUND(p_yes / NULLIF(p_no, 0), 2)     AS lift_ratio,   -- relative risk; >1 means the action correlates with retention
  -- two-proportion z-score: |z| > 1.96 ≈ p < 0.05 (treat smaller |z| as "not yet significant")
  ROUND(
    (p_yes - p_no) / NULLIF(
      sqrt( ((p_yes * n_yes + p_no * n_no) / NULLIF(n_yes + n_no, 0))
          * (1 - (p_yes * n_yes + p_no * n_no) / NULLIF(n_yes + n_no, 0))
          * (1.0 / NULLIF(n_yes, 0) + 1.0 / NULLIF(n_no, 0)) ), 0)
  , 2)                                  AS z_score
FROM stats
WHERE n_yes >= 100 AND n_no >= 100      -- drop under-powered candidates
ORDER BY abs_delta DESC;
-- Pick the action with the largest abs_delta AND |z_score| > 1.96.
-- Correlation only — confirm causality with a randomized nudge holdout before re-architecting onboarding.
```

### Time-to-Value (TTV) Optimization

**TTV = time from signup to aha moment.** Shorter TTV = higher activation rate.

| TTV Benchmark | Rating | Action |
|--------------|--------|--------|
| < 5 minutes | Excellent | Maintain, optimize edges |
| 5-30 minutes | Good | Remove friction steps |
| 30 min - 2 hours | Needs work | Redesign onboarding |
| > 2 hours | Critical | Product/UX overhaul needed |

**TTV reduction tactics:**
- Pre-fill data (templates, sample projects, demo content)
- Defer account setup (let them DO something before asking for profile info)
- Reduce required integrations before first value
- Use magic links instead of password creation
- Progressive profiling (ask questions across sessions, not all upfront)

### Onboarding Patterns

**1. Checklist pattern (Notion, Asana)**
- 4-6 tasks that guide to aha moment
- Progress indicator (completion %)
- Each task teaches a core feature
- Celebrate completion (confetti, badge, etc.)
- Dismiss option (don't trap power users)

**2. Progressive disclosure (Figma, Linear)**
- Start with simplest interface
- Reveal advanced features as user demonstrates readiness
- Contextual tooltips triggered by user behavior
- Never show everything at once

**3. Empty state design (Basecamp, Trello)**
- Empty states are NOT blank screens
- Show what it will look like with data
- One-click sample/template to populate
- Clear CTA: "Create your first [thing]"

### Activation Metrics and Benchmarks

| Metric | Formula | Benchmark by segment |
|--------|---------|---------------------|
| Activation rate | Users who hit aha moment / Total signups | B2B SaaS: 20-40%, Consumer: 10-25% |
| Time to activate | Median time from signup to aha moment | Target: < 1 day |
| Setup completion | Users who complete onboarding / Total signups | 40-60% is healthy |
| Day 1 retention | Users active day after signup / Total signups | 40-60% |
| Day 7 retention | Users active 7 days after signup / Total signups | 20-35% |

## 3. Viral Loops & Network Effects

### Types of Viral Loops

**1. Inherent virality (strongest)**
Product REQUIRES others to get value. Can't use it alone effectively.
- Slack: messaging needs recipients
- Zoom: meetings need participants
- Figma: design review needs collaborators
- Google Docs: sharing IS the product

**2. Artificial virality (referral programs)**
Incentivized sharing. User gets reward for inviting others. (Reward amounts below are illustrative — programs and payouts change; verify current terms before quoting.)
- Dropbox: bonus storage per referral, double-sided (the canonical example)
- Uber: ride credit for both referrer and referee
- Notion: account credit per successful referral
- Robinhood: free stock for both parties (subject to eligibility)

Double-sided rewards (both parties benefit) consistently outperform one-sided ones — they give the sender a non-awkward reason to invite.

**3. Content virality (organic distribution)**
User-created content gets shared outside the product.
- Canva: designs shared on social with "Made with Canva" watermark
- Spotify Wrapped: annual recap goes viral on social
- Loom: video links shared in emails/Slack expose brand
- Calendly: scheduling links expose product to every invitee

### Viral Coefficient (K-Factor)

```
K = i × c

Where:
i = average invitations sent per user
c = conversion rate of invitations (% who sign up)

K > 1.0 = exponential growth (each user brings > 1 new user)
K = 0.5-1.0 = amplified growth (good — each user brings half a new user)
K < 0.5 = weak virality (supplement with paid/organic acquisition)
```

**Example:**
- Average user invites 5 people → i = 5
- 15% of invitees sign up → c = 0.15
- K = 5 × 0.15 = 0.75
- Each user brings 0.75 new users → growth amplified but not exponential

**Viral cycle time matters too:**
```
Effective growth = K / cycle_time
```
K=0.5 with 1-day cycle > K=0.8 with 30-day cycle.

### Designing Invite Flows That Don't Feel Spammy

**Principles:**
- Invite should provide value to the RECIPIENT, not just the sender
- Trigger invites at moments of delight (just completed something, got results)
- Never auto-send without explicit user action
- Let user customize the invite message
- Show who's already on the platform from their contacts (social proof)

**Invite flow best practices:**
1. Contextual trigger: "Share this project with your team" (not random popup)
2. Easy mechanics: email, link, or direct integration (Slack, Teams)
3. Recipient experience: personalized landing page, skip straight to value
4. Double-sided incentive: both parties benefit
5. Follow-up: one reminder max, then stop

### Collaboration-Driven Virality

The most sustainable viral loop — product gets better with more users:
- **Slack**: more teammates = more useful channels
- **Miro**: more collaborators = richer boards
- **GitHub**: more contributors = better code
- **Figma**: designer invites developers for handoff → developers invite PMs for review

**Design for collaboration:**
- Make sharing a core workflow (not a bolt-on)
- Show value of collaboration ("3 teammates are viewing this")
- Enable different roles (viewer, editor, admin) to lower invite friction
- Cross-functional sharing (designer → developer → PM chain)

## 4. Freemium Strategy

### What to Gate vs What to Give Free

**The freemium golden rule:** Give away enough that users experience core value and NEED more.

Exact plan limits below are *illustrative shapes*, not current quotes — vendors retune them constantly. Confirm any number against the vendor's live pricing page before you cite it.

| Gate Type | Give Free | Gate (Paid) | Example pattern |
|-----------|----------|------------|----------|
| Usage limits | A few projects/items | Unlimited | Notion, Trello (item/board caps on free) |
| Feature gates | Core features | Advanced features (analytics, automations) | Slack (advanced features paid) |
| Seat limits | Small team cap | Larger / unlimited seats | Figma, Linear (per-seat paid tiers) |
| Storage limits | A few GB | Tens–hundreds of GB | Dropbox, Google Drive |
| Support tier | Community/docs | Priority/dedicated | Most SaaS |
| History/retention | Recent history only | Full history | Slack (free tier limits how far back you can search/see messages — verify the current window at slack.com/pricing) |

**Rules for gating:**
- Free must include the aha moment (never gate the first value experience)
- Gate the "more" not the "first" — free users should be happy, paid users need scale
- Natural expansion triggers: team growth, usage growth, sophistication growth
- Don't cripple the free product (frustrated free users don't convert, they churn)

### Usage-Based vs Feature-Based Limits

| Approach | Pros | Cons | Best for |
|----------|------|------|----------|
| Usage-based | Natural upgrade path, aligns with value | Revenue unpredictable, hard to forecast | API products, infra, storage |
| Feature-based | Predictable tiers, easy to understand | May feel arbitrary, feature bloat | Collaboration tools, analytics |
| Seat-based | Scales with team adoption | Discourages sharing, invites workarounds | Team productivity tools |
| Hybrid | Best of both worlds | Complex pricing page | Most mature PLG companies |

### Free-to-Paid Conversion Benchmarks

Bands are industry rules of thumb; the per-company percentages are rough, widely-circulated estimates (not audited disclosures) — treat them as illustrative of the tier, not as quotable facts.

| Conversion Rate | Rating | Typical of |
|----------------|--------|----------|
| 1-2% | Below average | Broad consumer products |
| 2-5% | Average / healthy | Most B2B SaaS (broad-funnel freemium) |
| 5-10% | Strong | High-intent products (clear paid use case) |
| 10%+ | Exceptional | Niche/high-value products (premium positioning) |

**To improve conversion:**
- Reduce time-to-value (faster activation = higher conversion)
- Contextual upgrade prompts (at point of need, not random)
- Show what they're missing ("Upgrade to unlock X" vs invisible features)
- Reverse trial (see below)

### Reverse Trial Pattern

Instead of freemium → upgrade, give FULL access → downgrade after trial.

```
Day 0: Sign up → Full product access (all features, no limits)
Day 14: Trial expires → Downgrade to free tier
Result: Users experience premium value, feel the loss, convert at higher rates
```

**Reverse trial benchmarks (directional, not guaranteed — depends heavily on product and ICP):**
- Traditional freemium: ~2-5% conversion
- Reverse trial: often 2-3x that (commonly cited in the ~7-15% range)
- The pattern is widely used by collaboration and productivity SaaS (e.g., Slack and many Notion-style tools default new workspaces into a time-boxed full-feature experience before downgrading). Confirm any specific company's current flow yourself — onboarding designs change frequently.

**Implementation tips:**
- Clear countdown ("7 days left of Pro features")
- Highlight premium features being used ("You've used Advanced Analytics 12 times")
- Graceful downgrade (don't delete their data, just restrict access)
- Easy upgrade path at the moment of downgrade

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

## 6. PLG Metrics Dashboard

### Core Metrics

| Metric | Formula | Target |
|--------|---------|--------|
| **Activation rate** | Users hitting aha moment / Total signups | 25-40% |
| **Time to activate** | Median time signup → aha moment | < 1 day |
| **Free-to-paid conversion** | Paid users / Total free users | 2-5% (freemium), 15-25% (free trial) |
| **PQL rate** | PQLs / Total signups | 10-20% |
| **Expansion revenue %** | Expansion MRR / Total new MRR | > 30% |
| **Net Revenue Retention** | (Start + Expansion - Contraction - Churn) / Start | > 110% |
| **DAU/MAU ratio** | Daily active users / Monthly active users | > 40% = sticky |
| **Natural Rate of Growth (NRG)** | See formula below | > 50% |
| **Viral coefficient (K)** | Invites per user × invite conversion rate | > 0.5 |
| **Time to expand** | Median time signup → first upgrade | Track trend |

### PQL (Product Qualified Lead) Definition

A PQL is a user/account that has demonstrated buying intent through product usage — NOT through form fills or content downloads.

**PQL scoring model:**

| Signal | Points | Rationale |
|--------|--------|-----------|
| Hit activation milestone | +30 | Core value experienced |
| Invited 3+ teammates | +20 | Team adoption signal |
| Used product 5+ days in 14 days | +15 | Engagement consistency |
| Hit usage limit | +25 | Natural upgrade moment |
| Viewed pricing page | +10 | Intent signal |
| Company size > 50 (enrichment) | +10 | Expansion potential |
| Connected 2+ integrations | +10 | Stickiness indicator |
| Admin role | +5 | Decision-maker signal |

**Threshold:** Score ≥ 50 = PQL → route to sales (or trigger automated upgrade flow).

### Natural Rate of Growth (NRG)

OpenView's formula for measuring organic, product-driven growth:

```
NRG = 100 × Annual Growth Rate × % Organic Signups × % ARR from Self-Serve

Example:
Annual growth: 100% (doubling)
Organic signups: 80%
Self-serve ARR: 70%
NRG = 100 × 1.0 × 0.8 × 0.7 = 56
```

| NRG Score | Rating |
|-----------|--------|
| > 80 | Elite PLG (Zoom, Slack pre-enterprise) |
| 50-80 | Strong PLG |
| 20-50 | Emerging PLG |
| < 20 | Not truly product-led |

### DAU/MAU Ratio (Stickiness)

```
DAU/MAU = Daily Active Users / Monthly Active Users
```

| Ratio | Interpretation | Examples |
|-------|---------------|----------|
| > 50% | Exceptional — daily habit | Slack (~60%), WhatsApp |
| 30-50% | Strong — regular use | Figma, Notion |
| 15-30% | Average — weekly use | Most B2B SaaS |
| < 15% | Low — monthly or less | Niche/seasonal tools |

## 7. PLG + Sales Hybrid (Product-Led Sales)

### When to Add Sales on Top of PLG

**Add sales when:**
- Self-serve ARPU plateaus (users max out at a tier but company could pay much more)
- Enterprise accounts self-serve but procurement requires a contract
- Free/Pro users request features that need custom pricing
- Usage data shows accounts with > $50k ARR potential sitting on free/low tiers
- Competitor sales teams are winning enterprise deals you could've had

**Rule of thumb:** Add sales when you see accounts where potential ARR is > 10x their current plan.

### PQL Scoring for Sales

**Two-axis scoring: Product engagement + Firmographic fit**

```
PQL Sales Score = (Product Score × 0.6) + (Firmographic Score × 0.4)
```

**Product engagement signals:**

| Signal | Score | Weight |
|--------|-------|--------|
| 10+ active users on account | +30 | Team adoption |
| Hit 80%+ of plan limit | +25 | Upgrade pressure |
| Used 3+ premium features (trial/reverse trial) | +20 | Feature appetite |
| Invited users from 3+ departments | +15 | Cross-functional spread |
| Admin viewed pricing 3+ times | +10 | Purchase intent |

**Firmographic signals (via enrichment — HubSpot Breeze Intelligence (formerly Clearbit), Apollo, Clay):**

| Signal | Score | Weight |
|--------|-------|--------|
| Company size > 200 employees | +20 | Enterprise potential |
| Industry in target vertical | +15 | ICP match |
| Raised Series B+ funding | +10 | Budget available |
| Uses complementary tools | +10 | Integration value |
| HQ in target geography | +5 | Serviceable market |

### Sales-Assist Triggers

Don't have sales reach out randomly. Trigger based on signals:

| Trigger | Action | Channel |
|---------|--------|---------|
| Account hits 10+ users | SDR outreach: offer team onboarding | Email |
| Admin hits usage limit 3x | AE outreach: custom plan discussion | In-app + email |
| Enterprise domain signs up | Notify AE, begin account research | Slack alert |
| Account views Enterprise pricing page | Live chat offer or meeting CTA | In-app |
| Usage spike (3x normal in a week) | CS check-in: "Noticed you're growing fast" | Email |
| Expansion potential > $50k (model) | AE assigned, account plan created | CRM task |

### The Product-Led Sales Funnel

```
All Users → Activated Users → PQLs → Sales-Accepted → Opportunity → Enterprise Deal
  100%         30%              8%        5%              3%            1.5%
```

**Key metrics for PLS:**
- PQL-to-Opportunity rate: 30-50% (much higher than MQL-to-Opp)
- PQL-to-Close rate: 15-25% (2-3x traditional sales)
- Average deal size from PQL: 3-5x self-serve ARPU
- Sales cycle from PQL: 50% shorter than cold outbound

**Why PQLs convert better than MQLs:**
- They've already experienced the product (not just downloaded a whitepaper)
- They've demonstrated real usage patterns
- They have internal champions already using the product
- Objections are fewer — they already know it works
- Sales conversation is about scaling, not convincing

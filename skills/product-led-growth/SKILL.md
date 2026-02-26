---
name: product-led-growth
description: "Product-led growth playbooks — activation loops, viral mechanics, freemium optimization, and self-serve revenue."
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

**Famous examples:**

| Company | Aha Moment | Metric |
|---------|-----------|--------|
| Slack | Team sends 2,000 messages | 93% retention after this threshold |
| Dropbox | User saves 1 file to Dropbox folder | Retention 2x vs non-savers |
| Facebook | 7 friends in 10 days | Retention cliff without this |
| Zoom | Host first meeting | 80%+ return rate |
| Figma | Invite a collaborator to a file | 3x retention vs solo users |
| Notion | Create 5+ pages with content | Habit formation threshold |
| Calendly | Share scheduling link, get first booking | Value realized |

**How to find YOUR aha moment:**
1. List all user actions in first 7 days
2. For each action, calculate Day 30 retention rate for users who did it vs didn't
3. The action with the highest retention delta is your aha moment candidate
4. Validate with correlation analysis (not just causation assumption)
5. Test by driving more users to that action — does retention improve?

```sql
-- Find aha moment candidates
WITH user_actions AS (
  SELECT
    user_id,
    MAX(CASE WHEN event = 'invited_teammate' THEN 1 ELSE 0 END) AS invited,
    MAX(CASE WHEN event = 'created_project' THEN 1 ELSE 0 END) AS created_project,
    MAX(CASE WHEN event = 'connected_integration' THEN 1 ELSE 0 END) AS connected
  FROM events
  WHERE created_at BETWEEN signup_date AND signup_date + INTERVAL '7 days'
  GROUP BY user_id
),
retention AS (
  SELECT user_id, 1 AS retained_d30
  FROM events
  WHERE created_at BETWEEN signup_date + INTERVAL '28 days' AND signup_date + INTERVAL '35 days'
  GROUP BY user_id
)
SELECT
  'invited_teammate' AS action,
  AVG(CASE WHEN a.invited = 1 THEN r.retained_d30 ELSE 0 END) AS retention_if_yes,
  AVG(CASE WHEN a.invited = 0 THEN COALESCE(r.retained_d30, 0) ELSE NULL END) AS retention_if_no
FROM user_actions a LEFT JOIN retention r ON a.user_id = r.user_id
-- Repeat UNION ALL for each action
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
Incentivized sharing. User gets reward for inviting others.
- Dropbox: 500MB free storage per referral (both sides)
- Uber: $10 credit for referrer and referee
- Notion: $5 credit per referral
- Robinhood: free stock for both parties

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

| Gate Type | Give Free | Gate (Paid) | Example |
|-----------|----------|------------|----------|
| Usage limits | 3 projects | Unlimited projects | Notion, Trello |
| Feature gates | Core features | Advanced features | Slack (threads free, analytics paid) |
| Seat limits | 1-5 users | 6+ users | Figma (3 projects free) |
| Storage limits | 5GB | 50GB+ | Dropbox, Google Drive |
| Support tier | Community/docs | Priority/dedicated | Most SaaS |
| History/retention | 7-day history | Unlimited history | Slack (90-day message limit on free) |

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

| Conversion Rate | Rating | Examples |
|----------------|--------|----------|
| 1-2% | Below average | Broad consumer products |
| 2-5% | Average / healthy | Most B2B SaaS (Slack ~3%, Dropbox ~4%) |
| 5-10% | Strong | High-intent products (Zoom ~6%, Calendly ~8%) |
| 10%+ | Exceptional | Niche/high-value products (Superhuman, Linear) |

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

**Reverse trial benchmarks:**
- Traditional freemium: 2-5% conversion
- Reverse trial: 7-15% conversion (2-3x improvement)
- Companies using it: Airtable, Grammarly, Loom

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

### Payment Integration Patterns

**Stripe is the default. Here's the architecture:**

```
User clicks "Upgrade" → Stripe Checkout (hosted) → Webhook confirms → Update DB → Unlock features
```

**Usage-based billing:**
```
Track usage events → Aggregate hourly/daily → Report to Stripe Metering API → Invoice at period end
```

**Key implementation details:**
- Use Stripe Checkout (not custom forms) for PCI compliance
- Always handle webhooks idempotently (same event may fire twice)
- Implement dunning (failed payment retry: day 1, 3, 5, 7 then cancel)
- Prorate upgrades mid-cycle
- Allow downgrade at end of billing period (not immediate)

### Expansion Revenue

Expansion revenue = revenue growth from existing customers (upsells + cross-sells).

**Expansion levers:**

| Lever | Mechanism | Example |
|-------|----------|---------|
| Seat-based | More users = more revenue | Slack: $8.75/user/mo |
| Usage-based | More usage = more revenue | AWS, Twilio, OpenAI |
| Feature upsell | Upgrade to higher tier | Zoom: Pro → Business |
| Cross-sell | Buy additional products | Atlassian: Jira + Confluence |
| Platform fees | % of transaction | Stripe: 2.9% + 30¢ |

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
- 110-130%: Strong (Slack: ~120%, Datadog: ~130%)
- 130%+: Exceptional (Snowflake: ~158%, Twilio: ~140%)

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

**Firmographic signals (via enrichment — Clearbit, Apollo):**

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

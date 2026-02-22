---
name: pricing-optimization
description: "Price testing, value metric selection, packaging strategy, discount frameworks, price localization, and willingness-to-pay research. Use when setting prices, designing tiers, running Van Westendorp surveys, implementing price changes, or optimizing packaging."
---

# Pricing Optimization

## Workflow

### 1. Value Metric Selection

The value metric is what you charge for. Get this wrong and everything else fails.

**Good value metric criteria:**
- Scales with value delivered to customer
- Easy for customer to understand
- Predictable for customer to budget
- Grows as customer succeeds

| Metric type | Examples | Best for |
|-------------|----------|----------|
| Per seat | $X/user/month | Collaboration tools |
| Per usage | $X/API call, $X/GB | Infrastructure, API products |
| Per feature | Tier-based access | Horizontal SaaS |
| Per outcome | $X/lead, $X/transaction | Performance tools |
| Flat rate | $X/month | Simple products |

**Decision framework:**
- If value scales linearly with users → per seat
- If value scales with consumption → usage-based
- If features differentiate segments clearly → tier-based
- If you can measure outcomes → outcome-based
- When in doubt → start with per seat (simplest)

### 2. Van Westendorp Price Sensitivity

**Survey questions (ask all 4):**
1. At what price would this be **so cheap** you'd question the quality?
2. At what price is this a **bargain** — great buy for the money?
3. At what price is this **getting expensive** — you'd think twice?
4. At what price is this **too expensive** — you'd never consider it?

**Analysis:**
Plot cumulative distributions of all 4 questions. Intersections give:

| Intersection | Meaning |
|-------------|---------|
| "Too cheap" ∩ "Getting expensive" | Point of marginal cheapness |
| "Bargain" ∩ "Too expensive" | Point of marginal expensiveness |
| "Too cheap" ∩ "Too expensive" | Optimal price point |
| "Bargain" ∩ "Getting expensive" | Indifference price point |

**Acceptable price range:** Between marginal cheapness and marginal expensiveness.

**Minimum sample:** 200 responses per segment for reliable results.

### 3. Tier Design

**3-tier standard (recommended starting point):**

| Element | Starter | Professional | Enterprise |
|---------|---------|-------------|------------|
| Price anchor | Low (attract) | Medium (convert) | High (capture) |
| Target | Individual / small team | Growing team | Large organization |
| Value metric limit | Low | Medium | Unlimited or custom |
| Support | Self-serve | Email + chat | Dedicated CSM |
| Features | Core only | Core + advanced | All + custom |

**Pricing rules:**
- Professional should be 2-3x Starter price
- Enterprise should be 3-5x Professional (or custom)
- Professional tier should be the obvious "best value" (anchor effect)
- Include one "decoy" feature in Professional that makes it clearly better than Starter
- Enterprise always includes "talk to sales" — never self-serve

### 4. Discount Strategy

**Guardrails:**

| Discount type | Max | Approval |
|---------------|-----|----------|
| Annual prepay | 20% | Self-serve |
| Multi-year deal | 30% | Manager approval |
| Competitive switch | 15% | Manager approval |
| Volume (10+ seats) | 15% | Auto-calculated |
| Strategic / Logo | 40% | VP approval + documented justification |

**Rules:**
- Never discount more than 40% (devalues product permanently)
- Always trade something: discount for annual commitment, case study, referral
- Track discount rate by rep (flag reps averaging > 20%)
- Sunset discounts: "This rate is locked for 12 months, then standard pricing"
- Document every discount reason in CRM

### 5. Price Localization

**Purchasing Power Parity (PPP) adjustments:**

| Tier | Countries | Adjustment |
|------|-----------|------------|
| Full price | US, UK, Canada, Australia, Germany, France | 100% |
| Tier 2 | Spain, Italy, Portugal, Czech Republic, Poland | 70-80% |
| Tier 3 | Brazil, Mexico, Turkey, South Africa | 50-60% |
| Tier 4 | India, Indonesia, Philippines, Nigeria | 30-40% |

**Implementation:**
- Use IP geolocation for initial pricing display
- Allow currency switching (not just symbol — actual price adjustment)
- Don't show the discount — just show the local price
- Gate enterprise features at full price regardless of region

### 6. Annual vs Monthly

**Best practices:**
- Default to annual on pricing page (show monthly price as comparison)
- Annual discount: 15-20% (2 months free is standard messaging)
- Show monthly price per-month even for annual ("$49/mo billed annually")
- Offer monthly-to-annual upgrade path with prorated credit
- Track annual vs monthly mix (target: 60%+ annual for predictable revenue)

### 7. Price Increase Playbook

**Communication timeline:**

| When | Action |
|------|--------|
| 90 days before | Internal alignment: sales, CS, support briefed |
| 60 days before | Email announcement to all customers (clear, empathetic) |
| 30 days before | Reminder email + lock-in offer (annual at current price) |
| Day of | Price change live + support team ready for questions |
| 30 days after | Review churn impact, adjust if needed |

**Email template:**
```
Subject: Changes to your [Product] plan

Hi [Name],

On [date], we're updating our pricing. Your plan will change
from $X/mo to $Y/mo.

Why: [Honest reason — new features, increased costs, market alignment].

What you can do:
- Lock in current pricing by switching to annual before [date]
- Upgrade to [plan] to get [specific new value] at the new rate
- Questions? Reply to this email — we're here to help.

[Name], [Title]
```

**Expected impact:** Well-communicated 10-20% increase typically sees < 2% incremental churn. Poorly communicated or >30% increase can see 5-10%+ churn.

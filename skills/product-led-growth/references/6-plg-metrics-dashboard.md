## Contents

- 6. PLG Metrics Dashboard
- Core Metrics
- PQL (Product Qualified Lead) Definition
- Natural Rate of Growth (NRG)
- DAU/MAU Ratio (Stickiness)

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

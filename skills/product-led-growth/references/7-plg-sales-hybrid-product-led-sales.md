## Contents

- 7. PLG + Sales Hybrid (Product-Led Sales)
- When to Add Sales on Top of PLG
- PQL Scoring for Sales
- Sales-Assist Triggers
- The Product-Led Sales Funnel

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

**Firmographic signals (via enrichment tools: HubSpot data enrichment (Breeze, formerly Breeze Intelligence/Clearbit), Apollo, Clay):**

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

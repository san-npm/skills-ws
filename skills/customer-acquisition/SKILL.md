---
name: customer-acquisition
description: "CAC optimization, channel mix modeling, attribution analysis, and acquisition strategy for paid and organic channels."
---

# Customer Acquisition

## Workflow

### 1. CAC Calculation

**Blended CAC (company-level):**
```
Blended CAC = (Total Sales + Marketing spend) / New customers acquired
```

**Per-channel CAC (more actionable):**
```
Channel CAC = Channel spend (ads + tools + headcount allocation) / Customers from that channel
```

**Fully-loaded CAC (most accurate):**
```
Fully-loaded CAC = (Ad spend + Sales salaries + Marketing salaries + Tools + Agency fees + Content production) / New customers
```

**What to include:**

| Include | Don't include |
|---------|---------------|
| Ad spend (all platforms) | Product development costs |
| Sales team compensation (base + commission) | Customer success costs |
| Marketing team compensation | Infrastructure/hosting |
| Marketing tools (HubSpot, analytics, etc.) | General overhead (rent, legal) |
| Content production costs | |
| Agency/contractor fees | |
| Event/sponsorship costs | |

### 2. Channel Evaluation

**Scoring matrix — rate each channel:**

| Channel | CAC | Scalability | Time to result | LTV of acquired customers | Total score |
|---------|-----|-------------|---------------|--------------------------|-------------|
| Organic search | $50 | High | 6-12 months | High | |
| Paid search (Google) | $150 | High | Immediate | Medium | |
| Paid social (Meta) | $120 | High | 1-2 weeks | Medium | |
| LinkedIn ads | $250 | Medium | 1-2 weeks | High (B2B) | |
| Content marketing | $80 | High | 3-6 months | High | |
| Referral program | $30 | Medium | 1-3 months | Very high | |
| Cold outreach | $100 | Medium | 2-4 weeks | High (if targeted) | |
| Partnerships | $60 | Low-Medium | 3-6 months | High | |
| Events/conferences | $300 | Low | 1-3 months | High | |
| Product-led (viral) | $10 | Very high | Varies | Varies | |

### 3. Attribution Models

| Model | How it works | Best for | Bias |
|-------|-------------|----------|------|
| First touch | 100% credit to first interaction | Understanding discovery | Over-credits awareness channels |
| Last touch | 100% credit to last interaction | Understanding conversion | Over-credits bottom-funnel |
| Linear | Equal credit to all touchpoints | Simple multi-touch | Treats all touches equally (unrealistic) |
| Time decay | More credit to recent touchpoints | Long sales cycles | Under-credits awareness |
| Position-based (U-shape) | 40% first, 40% last, 20% middle | Balanced view | Arbitrary weights |
| Data-driven | ML-based, dynamic weights | Large datasets (1000+ conversions) | Black box |

**Recommendation:** Run first-touch AND last-touch in parallel. Compare results. If they agree on a channel, you have high confidence. If they disagree, dig deeper into that channel.

### 4. LTV:CAC Analysis

**Benchmarks by stage:**

| Metric | Seed/Early | Series A | Series B+ |
|--------|-----------|----------|-----------|
| LTV:CAC ratio | > 2:1 | > 3:1 | > 4:1 |
| CAC payback | < 18 months | < 12 months | < 8 months |
| CAC as % of first-year ACV | < 100% | < 80% | < 60% |

**By segment:**

| Segment | Typical CAC | Typical LTV | Target LTV:CAC |
|---------|-------------|-------------|----------------|
| Self-serve SMB | $50-200 | $500-2,000 | > 5:1 |
| Inside sales mid-market | $500-2,000 | $5,000-30,000 | > 3:1 |
| Enterprise field sales | $5,000-50,000 | $50,000-500,000 | > 3:1 |

**Payback period:**
```
Payback (months) = CAC / (Monthly ARPU × Gross margin %)
```

### 5. Channel Saturation Signals

**When to diversify (channel is saturating):**
- CAC increased >20% in 3 months with no strategy change
- Impression share hitting ceiling (Google Ads > 90%)
- Frequency > 3x on paid social (audience fatigue)
- Organic traffic plateau despite continued investment
- Diminishing returns on spend increase (2x budget ≠ 2x results)

**Response:**
1. Optimize existing channel before abandoning
2. Test new channel with 10-15% of budget
3. Run for 60-90 days before evaluating
4. Compare new channel CAC and LTV to established channels
5. Scale if CAC is within 1.5x of best-performing channel

### 6. Budget Allocation Framework

**Portfolio approach:**

| Category | % of budget | Purpose |
|----------|------------|---------|
| Proven channels | 60-70% | Channels with known, acceptable CAC |
| Scaling channels | 20-25% | Channels showing promise, increasing spend |
| Experimental | 10-15% | New channels, testing hypotheses |

**Rebalance quarterly:**
- Move budget from declining-ROI channels to improving ones
- Kill experiments that haven't shown promise in 90 days
- Double down on channels where LTV:CAC is improving

### 7. Acquisition Dashboard

| Metric | Cadence | View |
|--------|---------|------|
| Blended CAC | Monthly | Trend line, 6-month rolling |
| Channel CAC | Monthly | Per-channel bar chart |
| LTV:CAC by channel | Quarterly | Stacked comparison |
| Payback period | Monthly | Trend vs target |
| New customer count by source | Weekly | Stacked area chart |
| CAC efficiency (CAC / ARPU) | Monthly | Track improvement |
| Pipeline contribution by channel | Weekly | Marketing → Sales attribution |

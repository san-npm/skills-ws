## Contents

- ROAS Benchmarks by Industry
- Diagnostic Formulas (use these instead of trusting static averages)
- Google Ads (directional priors, Jun 2026)
- Meta Ads (directional priors, Jun 2026)
- LinkedIn Ads (directional priors, Jun 2026 — verify in-platform)

## ROAS Benchmarks by Industry

> **Use as rough priors, not targets (as of Jun 2026, unsourced/directional).** Public CPC/CPL/ROAS averages are stale the moment they're published and vary 5-10x by vertical, geo, season, auction competition, and account maturity. Always compute *your* break-even from margin and validate with the diagnostic formulas below. For live vertical benchmarks, pull from your own historical data or current vendor reports (e.g., WordStream/LocaliQ, Meta/Google interface comparisons) and date them.

### Diagnostic Formulas (use these instead of trusting static averages)

```
Break-even ROAS        = 1 / gross_margin%
   (e.g., 50% margin → break-even ROAS = 2.0; you profit above 2.0)

Break-even CPA         = gross_margin_per_order ($)
   (max you can pay per conversion before losing money)

Contribution-margin ROAS = (revenue − COGS − variable costs) / ad_spend
   (the only ROAS that reflects real profit, not top-line)

Target CPA (from LTV)  = LTV × target_CAC%   (e.g., 30% of LTV)

Payback period (months)= CAC / monthly_gross_profit_per_customer
   (SaaS/subscription: aim < 12 months, ideally < 6)

MER (blended)          = total_revenue / total_ad_spend (all channels)
   (sanity-check platform-reported ROAS against this)

Incrementality lift %  = (test_conversions − control_conversions) / control_conversions
   (geo or PSA holdout — the truest measure of ad-driven value)
```

### Google Ads (directional priors, Jun 2026)

| Industry | Avg ROAS | Good ROAS | Great ROAS |
|----------|----------|-----------|------------|
| Ecommerce (general) | 2:1 | 4:1 | 8:1+ |
| SaaS | 3:1 | 5:1 | 10:1+ |
| B2B Services | 2:1 | 4:1 | 7:1+ |
| Education | 3:1 | 5:1 | 8:1+ |
| Finance/Insurance | 2:1 | 3:1 | 5:1+ |
| Healthcare | 2:1 | 4:1 | 6:1+ |
| Legal | 2:1 | 3:1 | 5:1+ |
| Real Estate | 2:1 | 4:1 | 8:1+ |

### Meta Ads (directional priors, Jun 2026)

| Industry | Avg ROAS | Good ROAS |
|----------|----------|-----------|
| Ecommerce (DTC) | 2:1 | 4:1+ |
| SaaS (trial) | 1.5:1 | 3:1+ |
| B2B Lead Gen | 1:1 | 2:1+ (measure LTV) |
| Info Products | 3:1 | 6:1+ |
| Apps (install) | Measure CPI vs LTV | CPI < 30% of 90-day LTV |

### LinkedIn Ads (directional priors, Jun 2026 — verify in-platform)

| Metric | Average | Good |
|--------|---------|------|
| CPC | $8-$15 | <$7 |
| CPL | $60-$200 | <$60 |
| CTR | 0.4-0.6% | >0.8% |
| CPM | $30-$90 | <$30 |

LinkedIn pricing trends up year over year and skews higher in NA/competitive functions (engineering, finance, exec). Treat these as priors only and confirm against your own auction. LinkedIn is expensive — only worth it if LTV justifies it (B2B enterprise, high ACV).

**Important:** ROAS varies wildly by product price, margin, and sales cycle. For SaaS and B2B, measure blended CAC:LTV ratio (target 1:3+) rather than immediate ROAS.

---

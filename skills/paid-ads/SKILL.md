---
name: paid-ads
description: "Paid advertising campaigns on Google Ads, Meta, LinkedIn, Twitter/X. Strategy, copy, targeting, optimization."
---

# Paid Ads v2

## Campaign Structure

### Google Ads
```
Account
├── Campaign (budget + geo + bidding)
│   ├── Ad Group (keyword theme)
│   │   ├── Keywords (10-20 per group)
│   │   ├── Ads (3-5 responsive search ads)
│   │   └── Extensions (sitelinks, callouts, structured snippets)
│   └── Ad Group 2...
└── Campaign 2...
```

### Meta (Facebook/Instagram)
```
Ad Account
├── Campaign (objective: conversions/traffic/awareness)
│   ├── Ad Set (audience + placement + budget + schedule)
│   │   ├── Ad (creative + copy + CTA)
│   │   └── Ad 2...
│   └── Ad Set 2 (different audience)
└── Campaign 2...
```

## Ad Copy Formulas

### Google Search Ads (30 char headlines, 90 char descriptions)
- H1: {Keyword} — {Benefit}
- H2: {Social Proof} | {Offer}
- H3: {CTA} — {Risk Reversal}
- D1: {Expand on benefit}. {Specific result}. {CTA with urgency}.
- D2: {Address objection}. {Trust signal}. {Secondary CTA}.

### Meta Ads
- **Hook** (first line, before "See more"): Bold claim, question, or stat
- **Body**: Problem → Solution → Proof → CTA
- **CTA button**: Match to funnel stage (Learn More → top, Sign Up → mid, Shop Now → bottom)

Platform specs and character limits: references/platform-specs.md

## Audience Targeting

### Google
- Keywords: exact [keyword], phrase "keyword", broad +keyword
- Negative keywords: exclude irrelevant searches (add weekly)
- In-market audiences: people actively researching your category
- Custom intent: target by URLs and keywords competitors use

### Meta
- Core audiences: demographics + interests + behaviors
- Custom audiences: website visitors, email list, video viewers, engagers
- Lookalike audiences: 1% (best quality) to 10% (more reach) of source
- Exclusions: existing customers, converters, irrelevant audiences

### LinkedIn
- Job title + seniority + company size + industry
- Matched audiences: website retargeting, email list, lookalikes
- Tip: Layer job function + seniority for best results

## Bidding Strategy

| Goal | Google Strategy | Meta Strategy |
|------|----------------|---------------|
| Conversions | Target CPA or Maximize Conversions | Lowest Cost or Cost Cap |
| Revenue | Target ROAS | Minimum ROAS |
| Traffic | Maximize Clicks | Lowest Cost (link clicks) |
| Awareness | Target Impression Share | Reach or ThruPlay |

Start with automated bidding, switch to manual only when you have 30+ conversions/month of data.

## Budget Framework

- Test budget: $50-100/day per campaign minimum (need statistical significance)
- Scale: Increase 20% every 3-5 days (avoid learning phase resets)
- Split: 70% proven campaigns, 20% testing, 10% experimental

## A/B Testing

Test one variable at a time:
1. **Headlines** (highest impact)
2. **Creative/image** (Meta, LinkedIn)
3. **CTA** (button text and offer)
4. **Audience** (different targeting)
5. **Landing page** (post-click experience)

Minimum: 1000 impressions and 100 clicks per variant before declaring winner.

## Retargeting

Funnel-based retargeting:
- **1-3 days**: Cart abandoners → urgency/discount
- **3-7 days**: Product page visitors → social proof/benefits
- **7-14 days**: Blog readers → lead magnet/free trial
- **14-30 days**: Homepage visitors → brand story/value prop
- **30-90 days**: All visitors → seasonal offers/new features

Frequency cap: 3-5 impressions per person per week.

## References

- references/platform-specs.md — Character limits, image sizes, placements per platform
- references/ad-copy-formulas.md — 30+ proven ad copy templates

## Contents

- Campaign Architecture
- Google Ads Structure
- Google Ads Campaign Types
- Meta Ads Structure
- LinkedIn Ads Structure

## Campaign Architecture

### Google Ads Structure

```
Account
├── Campaign (Budget + Settings)
│   ├── Ad Group (Keywords + Targeting)
│   │   ├── Ad 1 (RSA — 15 headlines, 4 descriptions)
│   │   ├── Ad 2
│   │   └── Assets (sitelinks, callouts, structured snippets — formerly "extensions")
│   ├── Ad Group 2
│   └── Ad Group 3
├── Campaign 2
└── Campaign 3
```

**Golden rule:** One theme per ad group. 5-20 tightly related keywords per ad group.

### Google Ads Campaign Types

CPC ranges below are **directional priors (as of Jun 2026)** — actuals vary 5-10x by vertical/geo/competition; verify against your own account.

| Type | Best For | Avg CPC Range (directional) |
|------|----------|---------------|
| Search | High-intent queries, bottom-funnel | $1-$8 (insurance/legal/finance run $20-$80+) |
| Display | Awareness, retargeting | $0.20-$1.50 |
| Performance Max | Full-funnel, ecommerce + lead gen | Varies — Google controls placements |
| Shopping | Ecommerce product listings | $0.30-$2.00 |
| YouTube/Video | Brand awareness, consideration | $0.02-$0.15 per view |
| Demand Gen | Mid-funnel, visual/social discovery | $0.50-$3.00 |

> **Google AI Max (GA since Apr 2026):** "AI Max for Search campaigns" is Google's opt-in setting that layers PMax-style AI onto *Search*: broad keyword-free matching, automatically created/optimized assets, and AI-driven URL/landing-page selection, while keeping search-term reporting and negative keywords. Treat it as a toggle on top of Search (not a separate campaign type): turn it on for an existing well-tracked Search campaign, keep tight negatives and brand exclusions, and watch search terms closely for query drift. AI Max is generally available as of April 15, 2026. Dynamic Search Ads are being sunset: new DSA campaigns can no longer be created, and existing ones auto-upgrade to AI Max beginning February 2027, so plan DSA migrations now.

### Meta Ads Structure

```
Campaign (Objective + Budget)
├── Ad Set (Audience + Placement + Schedule)
│   ├── Ad 1 (Creative + Copy + CTA)
│   ├── Ad 2
│   └── Ad 3
├── Ad Set 2 (Different audience)
└── Ad Set 3 (Retargeting)
```

### LinkedIn Ads Structure

```
Campaign (Budget cap)
├── Ad Set (Objective + Audience + Format)
│   ├── Ad 1 (Single Image / Carousel / Video / Text)
│   ├── Ad 2
│   └── Ad 3
└── Ad Set 2
```

> LinkedIn renamed its hierarchy starting Oct 2025: old Campaign Groups are now Campaigns and old Campaigns are now Ad Sets (the Marketing API keeps the old entity names). URL tracking macros changed accordingly (CAMPAIGN_GROUP_ID is now CAMPAIGN_ID, CREATIVE_ID is now AD_ID).

---

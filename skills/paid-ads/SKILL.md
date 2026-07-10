---
name: paid-ads
description: "Paid advertising on Google (PMax, AI Max), Meta (Advantage+ Shopping/Sales), LinkedIn (Accelerate), TikTok (Symphony), X — campaign strategy, ad copy, audience targeting, ROAS/CPA. Use when user mentions PPC, paid media, ad creative, retargeting, or campaign optimization."
---

# Paid Ads — Expert Playbook

## When to Use This Skill

- Planning or launching paid ad campaigns (Google, Meta, LinkedIn, Twitter/X)
- Writing ad copy or reviewing creative
- Setting up audience targeting or retargeting
- Diagnosing poor ROAS or high CPA
- Budget allocation across channels
- Attribution and measurement setup

---

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

## Budget Allocation Frameworks

### The 70/20/10 Rule

- **70%** → Proven channels and campaigns with positive ROAS
- **20%** → Scaling what's working — new audiences, expanded geo, new ad formats
- **10%** → Experiments — new channels, creative concepts, audience tests

### Channel Budget Split by Funnel Stage

```
AWARENESS (20-30% of budget)
├── YouTube / Meta Video / Display
├── Goal: Impressions, reach, video views
└── KPI: CPM, VTR, brand lift

CONSIDERATION (30-40% of budget)
├── Meta engagement, Google Display remarketing, LinkedIn
├── Goal: Clicks, engagement, lead gen
└── KPI: CPC, CTR, CPL

CONVERSION (30-50% of budget)
├── Google Search, Shopping, Meta conversion campaigns
├── Goal: Purchases, signups, demos
└── KPI: CPA, ROAS, conversion rate
```

### Monthly Budget Minimums (to gather signal)

These are **rules of thumb (as of Jun 2026)**, not platform mandates — the real floor is *enough conversions to exit learning*. Derive it: `min monthly spend ≈ target_CPA × 50 conversions` per ad set/campaign (Meta needs ~50 optimization events/ad set/week; Google smart bidding wants ~30+ conv/30 days). High-CPA verticals need far more than the table.

| Channel | Minimum Monthly | Recommended |
|---------|----------------|-------------|
| Google Search | $1,500 | $3,000-$10,000 |
| Meta Ads | $1,000 | $3,000-$15,000 |
| LinkedIn Ads | $3,000 | $5,000-$15,000 |
| X (Twitter) Ads | $1,000 | $2,000-$5,000 |

Below these thresholds you won't gather enough data for meaningful optimization.

---

## Bidding Strategies

### Google Ads Bidding

| Strategy | When to Use | Prerequisite |
|----------|-------------|--------------|
| Maximize Clicks | New campaigns, data gathering | None |
| Maximize Conversions | Have 15+ conversions/month | Conversion tracking set up |
| Target CPA | Stable CPA, want to scale | 30+ conversions in last 30 days |
| Target ROAS | Ecommerce, revenue optimization | 50+ conversions with value data |
| Manual CPC | Full control, small budgets | Experience + time to manage |
| Maximize Conversion Value | Revenue-focused scaling | Revenue tracking, 50+ conversions |

**Migration path:** Manual CPC → Maximize Clicks → Maximize Conversions → Target CPA/ROAS

### Meta Ads Bidding

| Strategy | When to Use |
|----------|-------------|
| Lowest Cost (default) | Starting out, learning phase |
| Cost Cap | Maintain profitability at scale |
| Bid Cap | Strict CPA ceiling, auction control |
| ROAS Goal | Ecommerce with revenue tracking |

**Learning phase:** Meta needs ~50 optimization events per ad set per week. Don't touch campaigns during learning phase (usually 3-7 days).

---

## Ad Copy Formulas

### Formula 1: PAS (Problem → Agitate → Solve)

```
Headline: Tired of [Problem]?
Description: [Problem] costs you [consequence]. [Product] [solves it] in [timeframe]. [CTA].

Example:
Headline: Tired of Losing Leads to Slow Follow-Up?
Description: Every hour of delay drops conversion rates 7x.
LeadSnap auto-responds in under 60 seconds. Start free trial.
```

### Formula 2: Before → After → Bridge

```
Headline: From [Bad State] to [Good State]
Description: [Before situation]. Now imagine [after situation]. [Product] bridges the gap. [CTA].

Example:
Headline: From Spreadsheet Chaos to Real-Time Dashboards
Description: Stop wasting 10hrs/week on manual reports.
DataFlow auto-generates dashboards from your data. Try free.
```

### Formula 3: Social Proof Lead

```
Headline: [Number] [Users] Trust [Product] for [Outcome]
Description: Join [specific companies/users] who [achieved result]. [Key differentiator]. [CTA].

Example:
Headline: 12,000+ Teams Run Projects on TaskForge
Description: Join Stripe, Notion, and Linear in shipping faster.
AI-powered project management. Free for teams up to 10.
```

### Formula 4: Specific Number

```
Headline: [Action] [X]% [Faster/Cheaper/Better]
Description: [Product] helps [audience] [specific outcome] with [mechanism]. [Proof point]. [CTA].

Example:
Headline: Close Deals 34% Faster
Description: SalesOS gives reps AI-generated follow-ups, meeting prep,
and deal scoring. Avg customer sees ROI in 3 weeks. Book demo.
```

### Formula 5: Question Hook

```
Headline: What If You Could [Desirable Outcome]?
Description: [Product] makes it possible. [How it works in one line]. [Proof]. [CTA].
```

### Formula 6: Urgency/Scarcity

```
Headline: [Offer] — [Time Limit]
Description: [Value prop]. [What they get]. [Deadline/scarcity element]. [CTA].

Example:
Headline: 50% Off Annual Plans — Ends Friday
Description: Get enterprise-grade security for startup prices.
All features included. Only 200 seats at this price. Upgrade now.
```

### RSA Best Practices (Google)

- Write 15 headlines (use all slots) — mix branded, benefit, feature, CTA, proof
- Pin sparingly — only pin H1 if brand compliance requires it
- 4 descriptions — lead with different angles (benefit, proof, urgency, feature)
- Include keywords naturally in at least 5 headlines
- At least 3 headlines should work standalone without the others

### Meta Ad Copy Structure

```
PRIMARY TEXT (125 chars visible before "See more"):
Hook line — stop the scroll. Lead with pain, outcome, or surprise.

BODY (after "See more"):
- Expand on the hook
- 2-3 bullet points of benefits
- Social proof line
- Clear CTA

HEADLINE (below creative): Short, benefit-driven (5-7 words)
DESCRIPTION: Supporting detail or offer terms
```

---

## Audience Targeting

### Meta Ads — Audience Layering Strategy

**Layer 1: Broad (Prospecting)**
- Advantage+ audience (let Meta optimize)
- Interest stacking: 3-5 related interests per ad set
- Lookalike audiences: 1% of purchasers/high-value customers

**Layer 2: Warm (Consideration)**
- Website visitors (30-90 days)
- Video viewers (50%+ watched)
- Social engagers (90 days)
- Email list uploads (non-customers)

**Layer 3: Hot (Retargeting)**
- Add-to-cart but no purchase (7-14 days)
- Pricing page visitors (14 days)
- Trial users who haven't converted
- Past purchasers for upsell (exclude from prospecting!)

**Audience size guidance:**
- Prospecting: 1M-10M+ (let the algorithm work)
- Retargeting: As large as your traffic allows
- Lookalikes: Seed audience of 1,000+ for quality; 1% for precision, 3-5% for scale

### Google Ads Audiences

| Type | Use Case |
|------|----------|
| In-Market | Users actively researching your category |
| Affinity | Broad interest targeting for awareness |
| Custom Segments | Your own keyword/URL/app-based audience (replaced custom intent and custom affinity) |
| Customer Match | Upload email lists for targeting/exclusion |
| RLSA | Layer search with site visitor data |
| Similar Audiences | Deprecated — use optimized targeting instead |

### LinkedIn Targeting

Best-performing combos (layer these):
- **Job Title + Company Size** — most precise
- **Job Function + Seniority + Industry** — broader reach
- **Skills + Seniority** — catches non-obvious titles
- **Member Groups + Seniority** — high-intent communities

**Matched Audiences (current options, as of Jun 2026):**
- **Website retargeting** — segment by URL visited (needs the Insight Tag firing)
- **Contact/email list upload** — match against LinkedIn members for targeting or *exclusion* (suppress current customers/closed-lost)
- **Company list upload** — ABM: upload your target-account list (CSV of up to ~300k companies)
- **Engagement retargeting** — people who engaged with your single-image/video ads, opened/submitted a Lead Gen Form, viewed your company page or event
- **Audience Expansion** — opt-in toggle that broadens delivery to members similar to your defined audience (the closest live replacement for the old lookalikes)
- **Predictive Audiences** — LinkedIn builds a model from a seed (matched audience, conversions, or Lead Gen Form data) to find net-new high-propensity members; verify availability for your account/region at https://www.linkedin.com/help/lms

> **Discontinued:** LinkedIn **Lookalike Audiences were retired on 29 Feb 2024.** Do not promise lookalikes — use **Audience Expansion** or **Predictive Audiences** plus strict profile + matched-audience targeting instead.

Minimum audience size: **300 members** to launch; aim for **50,000+** for sponsored content delivery. Below ~50k, delivery and learning stall.

---

## Negative Keyword Strategy (Google)

### Starter Negative Keyword List

Apply at campaign or account level:

```
// Job-seekers
jobs, careers, hiring, salary, interview, resume, glassdoor

// Education/Research
what is, definition, meaning, tutorial, course, certification,
how to become, examples, PDF, wiki

// Free-seekers (if not freemium)
free, cheap, discount, coupon, open source

// Wrong intent
review, comparison, vs, alternative (add these to branded campaigns)

// Irrelevant
DIY, template, sample, internship
```

### Negative Keyword Mining Process

1. **Weekly:** Review Search Terms report
2. **Flag:** Any term with spend > $5 and 0 conversions
3. **Flag:** Any term clearly off-topic regardless of spend
4. **Add as:** Exact match negative for specific terms, phrase match for patterns
5. **Create shared negative keyword lists** by theme (job-seekers, researchers, etc.)

### Negative Keyword Match Types

- **Negative broad match** (default): Blocks if ALL negative words appear (any order)
- **Negative phrase match**: Blocks if negative phrase appears in that order
- **Negative exact match**: Blocks only that exact query

Use phrase and exact for precision. Broad negatives can over-block.

---

## Retargeting Sequences

### Standard Retargeting Funnel

```
DAY 0-3: Visited site, no action
→ Show: Value prop ad + social proof
→ Frequency cap: 3/day

DAY 4-7: Still no conversion
→ Show: Case study / testimonial ad
→ Frequency cap: 2/day

DAY 8-14: Getting cold
→ Show: Offer/incentive ad (discount, extended trial, bonus)
→ Frequency cap: 1/day

DAY 15-30: Last chance
→ Show: FOMO / urgency ad
→ Frequency cap: 1/day

DAY 30+: Exclude from retargeting
→ Move to nurture (email) or broad prospecting
```

### Cart Abandonment Retargeting (Ecommerce)

```
HOUR 1-6: Dynamic product ad — exact items left in cart
HOUR 6-24: Same + "Still thinking about it?" copy
DAY 2-3: Add social proof — "X people bought this today"
DAY 4-7: Offer incentive — free shipping or small discount
DAY 7+: Broader category ads, not specific products
```

### SaaS Trial Retargeting

```
TRIAL DAY 1-3: "Getting started" content — help them activate
TRIAL DAY 4-7: Feature highlight ads — show what they haven't used
TRIAL DAY 8-12: Case study — show outcomes from similar companies
TRIAL DAY 13-14: Urgency — "Trial ends in X days" + conversion offer
POST-TRIAL DAY 1-7: Win-back — extended trial or discount
POST-TRIAL DAY 7+: Exclude or move to long-term nurture
```

---

## Creative Testing Framework (Meta Ads)

### What to Test (Priority Order)

1. **Creative concept** — The big idea, angle, or hook (highest impact)
2. **Format** — Static vs video vs carousel vs UGC
3. **Hook** — First 3 seconds of video / headline of static
4. **Body copy** — Supporting text after the hook
5. **CTA** — Button text and action
6. **Offer** — Discount vs free trial vs demo vs content

### Testing Structure

```
Campaign: [Product] — Creative Testing
├── Ad Set: Broad Audience (1% LAL or Advantage+)
│   ├── Ad A: Concept 1 — Static + Benefit hook
│   ├── Ad B: Concept 2 — UGC video + Problem hook
│   ├── Ad C: Concept 3 — Carousel + Feature walkthrough
│   └── Ad D: Concept 4 — Testimonial video
```

**Rules:**
- Test 3-6 ads per ad set
- Same audience for fair comparison
- Let each ad spend at least 2x your target CPA before judging
- Winner = lowest CPA with sufficient volume (not just highest CTR)
- Graduate winners to scaling campaigns

### Creative Fatigue Signals

- CTR drops >20% from peak
- Frequency >3 for prospecting, >8 for retargeting
- CPA increases >30% week-over-week
- Relevance/quality score drops

Refresh creative every 2-4 weeks for prospecting, 4-6 weeks for retargeting.

---

## Landing Page Alignment

### Message Match Checklist

- [ ] Headline on landing page matches or mirrors ad headline
- [ ] Same offer mentioned in ad appears above the fold
- [ ] Visual continuity — similar imagery/colors as ad creative
- [ ] CTA on page matches the promised action (don't bait-and-switch)
- [ ] No navigation menu (for campaign-specific landing pages)
- [ ] Mobile-optimized (60%+ of paid traffic is mobile)
- [ ] Page loads in <3 seconds (every extra second = ~7% drop in conversions)

### Landing Page Types by Campaign Goal

| Goal | Page Type | Key Elements |
|------|-----------|-------------|
| Lead Gen | Squeeze page | Headline, 3 bullets, form, trust badges |
| Demo Request | Demo page | Value prop, social proof, short form, calendar embed |
| Purchase | Product page | Features, pricing, reviews, FAQ, CTA |
| Free Trial | Signup page | Benefit headline, feature list, single CTA, no CC messaging |
| Content/Lead Magnet | Download page | Preview of content, short form, instant delivery |

---

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

## Measurement & Attribution

### Attribution Models

**Reality check (as of Jun 2026):** Google deprecated first-click, linear, time-decay, and position-based attribution across Google Ads and GA4 in 2023. The only models you can actually *select* for conversions today are **data-driven (default)** and **last click**. The legacy models survive only as analytical lenses in third-party tools (e.g., a CRM, an MMP, or warehouse-native attribution) — never assume you can switch to them inside Google Ads.

| Model | How It Works | Status (Jun 2026) | Best For |
|-------|-------------|-------------------|----------|
| Data-Driven (DDA) | ML assigns fractional credit by measured contribution | **Active — Google/GA4 default** | Default for everyone; needs enough conversion volume to model, otherwise silently falls back to last click |
| Last Click | 100% credit to final ad-clicked touchpoint | **Active in Google Ads/GA4** | Short cycles, direct response, low-volume accounts where DDA can't model |
| First Click | 100% credit to discovery touchpoint | **Removed from Google** — third-party analytics only | Top-of-funnel analysis outside Google |
| Linear | Equal credit to all touchpoints | **Removed from Google** — third-party only | Full-journey lens in MMP/warehouse |
| Time Decay | More credit to recent touchpoints | **Removed from Google** — third-party only | Long-cycle lens in MMP/warehouse |
| Position-Based (U-shaped) | 40% first, 40% last, 20% middle | **Removed from Google** — third-party only | Balanced lens in MMP/warehouse |

Meta uses its own attribution settings (default **7-day click / 1-day view**) configured per ad set, independent of Google's models. For cross-channel truth, reconcile platform-reported conversions against a single source (GA4, CRM, or an MMP) plus periodic incrementality tests — platforms each over-claim credit for the same conversion.

### What to Track

**Conversion actions (set up BEFORE launching ads):**

```
PRIMARY (optimize toward these):
- Purchase / Signup / Demo booked / Lead form submitted

SECONDARY (observe, don't optimize):
- Add to cart / Pricing page view / Key page engagement
- Phone calls / Chat initiated

MICRO (for funnel analysis):
- Video views / Content downloads / Email signups
```

### UTM Parameter Standard

```
utm_source=google|meta|linkedin|twitter
utm_medium=cpc|paid-social|display|video
utm_campaign={campaign_name}
utm_content={ad_name_or_variant}
utm_term={keyword} (Google only)
```

Naming convention: `platform_objective_audience_creative`
Example: `meta_conversions_lal1pct_ugc-testimonial-v2`

### Post-Click Tracking Setup

1. **Google Ads:** Install Google tag + enhanced conversions
2. **Meta:** Pixel + Conversions API (server-side) — CAPI is essential post-iOS 14.5
3. **LinkedIn:** Insight Tag + offline conversion uploads for long sales cycles
4. **GA4:** Link to Google Ads, import conversions, set up audiences
5. **CRM integration:** Pass GCLID/FBCLID to CRM for closed-loop attribution

### Privacy & Signal Loss (post-iOS, cookie deprecation, consent)

The 2021 iOS App Tracking Transparency era was just the start; by 2026 the binding constraints are server-side data quality, consent enforcement, and platform modeling — not the pixel alone.

**Meta:**
- **Conversions API (CAPI) is mandatory, not optional** — run it alongside the pixel (or via the **Conversions API Gateway**, Meta's self-hosted server-side relay) so server events backstop browser signal loss. Deduplicate with a shared `event_id` on both pixel and CAPI events, or you'll double-count.
- **Event Match Quality (EMQ)** is the number that matters now — pass hashed email, phone, name, IP, `fbc`/`fbp`, and external ID. Aim for an EMQ of **6.0+/10** per event; low EMQ is the #1 cause of "CAPI didn't help."
- **Aggregated Event Measurement (AEM):** the old 8-events-per-domain cap and manual priority ranking are gone; Meta now processes all eligible events automatically. The lever today is event schema consistency (same `event_id`, value, currency across Pixel and CAPI) rather than event ranking.
- **Value optimization & VBO** need clean revenue values on the Purchase event; without them you can't bid to ROAS.
- **Advantage+** placements/audiences and **Advantage+ sales campaigns** (formerly Advantage+ Shopping, renamed Feb 2025; setup is now a streamlined flow with an Advantage+ "on" state) lean on modeled + broad signals, so feed them strong server-side conversions and a good product catalog rather than over-narrowing the audience.

**Google:**
- **Enhanced Conversions** (hashed first-party data) + **Consent Mode v2** (required in the EEA/UK to keep modeling and personalization) recover signal as third-party cookies erode. Without Consent Mode v2, EEA conversion data and remarketing degrade sharply.
- Server-side tagging (sGTM) improves durability and data control.

**All platforms:**
- **First-party data** (email/CRM lists, server-side events, logged-in IDs) is now your most valuable targeting and matching asset.
- **Modeled reporting:** Platform-reported conversions include modeled/estimated conversions — they are *estimates*, not deterministic counts. Expect **20-40% underreporting** of true incremental impact on Meta when only browser-side. Validate with **geo holdout / conversion-lift / incrementality tests**, not last-click dashboards.

---

## Platform-Specific Playbooks

### Google Search Ads — Quick Launch

1. Research keywords (Google Keyword Planner, SEMrush, Ahrefs)
2. Group into tight themes (5-15 keywords per ad group)
3. Write 1 RSA per ad group (15 headlines, 4 descriptions)
4. Add all relevant **assets** (Google renamed "extensions" → "assets" in 2022). Current asset types: sitelink, callout, structured snippet, image, business name, business logo, promotion, price, lead form, call, location, app. Set up sitelinks + callouts + structured snippets at minimum.
5. Start with Maximize Clicks, set a max CPC bid limit
6. Add negative keywords from starter list
7. Set up conversion tracking before spending a dollar
8. After 30+ conversions: switch to Maximize Conversions or Target CPA
9. Review search terms weekly, add negatives
10. Test new ad copy monthly

### Meta Ads — Quick Launch

1. Install Pixel + set up Conversions API
2. Define conversion event (purchase, lead, trial signup)
3. Create Campaign: Conversions objective, **Advantage+ Campaign Budget** (Meta's 2023 rename of "CBO" — budget set at campaign level, distributed across ad sets)
4. Ad Set 1: Broad/Advantage+ targeting (let Meta find the audience)
5. Ad Set 2: 1% Lookalike of best customers
6. Ad Set 3: Retargeting (website visitors 30 days)
7. 3-4 ads per ad set — different creative concepts
8. Let learning phase complete (50 events per ad set per week)
9. Kill underperformers after 2x CPA spend, scale winners
10. Refresh creative every 2-4 weeks

### LinkedIn Ads — Quick Launch

1. Install Insight Tag on website
2. Campaign objective: Lead Gen or Website Visits
3. Target: Job titles OR job function + seniority + industry
4. Audience size: 50,000-500,000
5. Format: Single image for testing, then expand to video/carousel
6. Bid: Maximum delivery (start), then manual CPC once you have data
7. Use Lead Gen Forms (higher conversion than landing pages on LinkedIn)
8. Budget: Minimum $50/day per ad set (called "campaign" before LinkedIn's Oct 2025 rename)
9. Run for 2+ weeks before judging performance
10. Upload offline conversions from CRM for true ROI measurement

---

## Performance Max (Google) Playbook

### Asset Groups

```
Asset Group = theme-based collection of:
├── Images: 15+ (landscape, square, portrait)
├── Logos: 5+
├── Videos: 5+ (or Google auto-generates — they're bad, provide your own)
├── Headlines: 5 (30 char) + 5 long headlines (90 char)
├── Descriptions: 4 (60 char) + 1 (90 char)
├── Final URL
├── Display path
├── CTA
└── Audience signals (suggestions, not restrictions)
```

### Audience Signals (Critical)

Audience signals don't restrict targeting — they guide the algorithm. Provide strong signals:

- **Custom segments:** Your best keywords + competitor URLs + apps
- **Your data:** Customer lists, converters, high-value segments
- **Interests/demographics:** In-market segments relevant to your product

### PMax Gotchas

- **PMax cannibalizes brand search.** Stop it from eating cheap branded clicks (and over-reporting credit) using, in order of preference (as of Jun 2026):
  - **Brand exclusion lists** — apply a brand list at the *campaign* level to keep PMax off your own + others' brand terms. This is the modern, self-serve replacement for begging a Google rep, available in the campaign settings UI and Google Ads API.
  - **Account-level negative keywords** — supported self-serve in the UI/API; use to block brand or junk queries account-wide.
  - **Campaign-level negative keywords for PMax** — Google has been rolling these out; if available in your account, use them for finer control than account-level.
  - Legacy path: request negatives via a Google rep only if the above aren't yet enabled for you.
- **Limited placement/audience reporting** — you can't fully see which placements/audiences convert; use the asset-group and (limited) insights reports plus search-term insights.
- **Run PMax alongside standard Search** — keep a dedicated branded Search campaign and exact-match high-value terms in standard Search; don't let PMax replace Search entirely.
- Asset performance ratings (Low/Good/Best) guide optimization — replace "Low" assets.
- Give it 4-6 weeks and 50+ conversions before major changes.

---

## Audit Checklist

### Monthly Paid Ads Audit

- [ ] Review ROAS/CPA trends vs targets
- [ ] Check search terms report (Google) — add negatives
- [ ] Review audience overlap between campaigns
- [ ] Check frequency (Meta) — replace fatigued creative
- [ ] Verify conversion tracking is firing correctly
- [ ] Review landing page performance (bounce rate, load time)
- [ ] Check budget pacing — is spend on track?
- [ ] Review quality scores (Google) — improve below 5/10
- [ ] Test new ad copy or creative
- [ ] Update negative keyword lists
- [ ] Check bid strategy performance — time to graduate?
- [ ] Review device performance — adjust bids if needed
- [ ] Competitive analysis — any new entrants or messaging changes?
- [ ] Update ROAS benchmarks and targets

### Pre-Launch Checklist

- [ ] Conversion tracking verified (test conversion)
- [ ] UTM parameters on all destination URLs
- [ ] Landing page live, mobile-optimized, fast
- [ ] Negative keyword lists applied
- [ ] Audience exclusions set (existing customers if needed)
- [ ] Budget and schedule confirmed
- [ ] Ad copy reviewed for policy compliance (see Ad Policy & Restricted Categories — check Special Ad Category + personalized-attribute rules)
- [ ] Assets complete (sitelinks, callouts, structured snippets, image, logo, business name — "extensions" in old UI)
- [ ] Billing method active
- [ ] Notification settings configured

---

## Ad Policy & Restricted Categories

Disapprovals and account suspensions usually come from *policy*, not strategy. Check your category before writing copy — restricted verticals have extra rules, limited targeting, and sometimes mandatory certification. **This is not legal advice; the platforms are the source of truth and rules change — verify at Google Ads Policies and Meta Advertising Standards before launch.**

### Categories that trigger extra rules / certification (verify current requirements)

| Category | Typical constraints (as of Jun 2026 — confirm in-platform) |
|----------|-----------------------------------------------------------|
| **Credit, housing, employment** | Meta **Special Ad Categories**: forced broad targeting, no age/gender/ZIP/many detailed targeting options, no lookalike-style narrowing. Google has parallel restrictions for these "sensitive" verticals. |
| **Financial products / financial services** | Disclosures required; many regions need advertiser identity verification/licensing; crypto and CFDs often need explicit certification or are blocked by geo. |
| **Health, drugs, supplements** | No personalized health claims ("treat your diabetes"), no PII-implying targeting language; pharmacy/telehealth often need certification; before/after imagery restricted. |
| **Political / social issues / elections** | Identity + location verification, paid-for-by disclaimers, public ad library logging, and per-country eligibility. |
| **Gambling / betting** | License + certification per geo; age-gating; many regions blocked entirely. |
| **Crypto / digital assets** | Certification and/or regional bans; "guaranteed returns" language prohibited. |
| **Alcohol** | Age/geo targeting limits; no targeting minors; some countries blocked. |
| **Personalized attributes (copy rule)** | Do **not** assert or imply you know the user's race, religion, sexual orientation, health condition, financial status, or membership in a protected class ("Are *you* depressed?", "As a [group], you…"). This is a frequent disapproval cause across platforms. |

### Pre-launch policy guardrails (do this for every campaign)

- Identify if your offer is in a restricted/Special Ad Category; if so, plan for the *reduced* targeting up front (don't build a precise audience you can't use).
- Strip personalized-attribute language from all copy and creative.
- Avoid prohibited claims: guaranteed income/returns, miracle cures, "100% approval," sensational/shock imagery, fake countdowns/UI.
- Confirm landing-page compliance too — destination must match the ad and the category rules (no cloaking, working privacy policy, functional contact info).
- For regulated verticals, complete any required advertiser verification/certification *before* spending, and keep substantiation for claims on file.

## Common Mistakes

1. **No conversion tracking** — You're flying blind. Set this up first.
2. **Too many keywords per ad group** — Keep it tight. One theme per group.
3. **Broad match without smart bidding** — Broad match + manual CPC = budget drain.
4. **Editing during learning phase** — Let Meta learn. Don't touch for 3-7 days.
5. **Ignoring search terms** — Check weekly. You'll be shocked what you're paying for.
6. **Same creative for 3+ months** — Refresh regularly. Creative fatigue is real.
7. **No retargeting** — Cheapest conversions you'll ever get. Set it up day one.
8. **Optimizing for vanity metrics** — CTR doesn't pay bills. Optimize for revenue.
9. **Not excluding converters** — Stop showing ads to people who already bought.
10. **Giving up too early** — Most campaigns need 2-4 weeks to optimize. Be patient.

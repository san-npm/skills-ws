---
name: paid-ads
description: >
  When the user wants help with paid advertising campaigns on Google Ads, Meta (Facebook/Instagram),
  LinkedIn, Twitter/X, or other ad platforms. Also use when the user mentions 'PPC,' 'paid media,'
  'ad copy,' 'ad creative,' 'ROAS,' 'CPA,' 'ad campaign,' 'retargeting,' or 'audience targeting.'
  This skill covers campaign strategy, ad creation, audience targeting, and optimization.
version: 2.0.0
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
│   │   └── Extensions (sitelinks, callouts, structured snippets)
│   ├── Ad Group 2
│   └── Ad Group 3
├── Campaign 2
└── Campaign 3
```

**Golden rule:** One theme per ad group. 5-20 tightly related keywords per ad group.

### Google Ads Campaign Types

| Type | Best For | Avg CPC Range |
|------|----------|---------------|
| Search | High-intent queries, bottom-funnel | $1-$8 (varies wildly by vertical) |
| Display | Awareness, retargeting | $0.20-$1.50 |
| Performance Max | Full-funnel, ecommerce | Varies — Google controls placements |
| Shopping | Ecommerce product listings | $0.30-$2.00 |
| YouTube/Video | Brand awareness, consideration | $0.02-$0.15 per view |
| Demand Gen | Mid-funnel, visual discovery | $0.50-$3.00 |

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
Campaign Group (Budget cap)
├── Campaign (Objective + Audience + Format)
│   ├── Ad 1 (Single Image / Carousel / Video / Text)
│   ├── Ad 2
│   └── Ad 3
└── Campaign 2
```

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

| Channel | Minimum Monthly | Recommended |
|---------|----------------|-------------|
| Google Search | $1,500 | $3,000-$10,000 |
| Meta Ads | $1,000 | $3,000-$15,000 |
| LinkedIn Ads | $3,000 | $5,000-$15,000 |
| Twitter/X Ads | $1,000 | $2,000-$5,000 |

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
| Custom Intent | Your own keyword-based audience |
| Customer Match | Upload email lists for targeting/exclusion |
| RLSA | Layer search with site visitor data |
| Similar Audiences | Deprecated — use optimized targeting instead |

### LinkedIn Targeting

Best-performing combos (layer these):
- **Job Title + Company Size** — most precise
- **Job Function + Seniority + Industry** — broader reach
- **Skills + Seniority** — catches non-obvious titles
- **Matched Audiences** — website retargeting, email list, lookalikes

Minimum audience size: 50,000 for sponsored content. Below that, delivery stalls.

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

### Google Ads

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

### Meta Ads

| Industry | Avg ROAS | Good ROAS |
|----------|----------|-----------|
| Ecommerce (DTC) | 2:1 | 4:1+ |
| SaaS (trial) | 1.5:1 | 3:1+ |
| B2B Lead Gen | 1:1 | 2:1+ (measure LTV) |
| Info Products | 3:1 | 6:1+ |
| Apps (install) | Measure CPI vs LTV | CPI < 30% of 90-day LTV |

### LinkedIn Ads

| Metric | Average | Good |
|--------|---------|------|
| CPC | $5-$12 | <$5 |
| CPL | $50-$150 | <$50 |
| CTR | 0.4-0.6% | >0.8% |
| CPM | $30-$80 | <$30 |

LinkedIn is expensive — only worth it if LTV justifies it (B2B enterprise, high ACV).

**Important:** ROAS varies wildly by product price, margin, and sales cycle. For SaaS and B2B, measure blended CAC:LTV ratio (target 1:3+) rather than immediate ROAS.

---

## Measurement & Attribution

### Attribution Models

| Model | How It Works | Best For |
|-------|-------------|----------|
| Last Click | 100% credit to final touchpoint | Short sales cycles, direct response |
| First Click | 100% credit to discovery touchpoint | Understanding top-of-funnel |
| Linear | Equal credit to all touchpoints | Seeing full journey |
| Time Decay | More credit to recent touchpoints | Long sales cycles |
| Data-Driven | ML assigns credit by contribution | 300+ conversions/month, Google's default |
| Position-Based | 40% first, 40% last, 20% middle | Balanced view |

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

### iOS 14.5+ / Privacy Considerations

- **Meta:** Use Conversions API (CAPI) alongside pixel — recovers 15-30% of lost signal
- **Meta:** Aggregated Event Measurement limits to 8 conversion events per domain — prioritize them
- **Google:** Enhanced conversions + consent mode recover signal
- **All platforms:** First-party data (email lists, CRM) is now your most valuable targeting asset
- **Model:** Expect 20-40% underreporting on Meta. Use incrementality tests to validate.

---

## Platform-Specific Playbooks

### Google Search Ads — Quick Launch

1. Research keywords (Google Keyword Planner, SEMrush, Ahrefs)
2. Group into tight themes (5-15 keywords per ad group)
3. Write 1 RSA per ad group (15 headlines, 4 descriptions)
4. Set up all relevant extensions (sitelinks, callouts, structured snippets, call)
5. Start with Maximize Clicks, set a max CPC bid limit
6. Add negative keywords from starter list
7. Set up conversion tracking before spending a dollar
8. After 30+ conversions: switch to Maximize Conversions or Target CPA
9. Review search terms weekly, add negatives
10. Test new ad copy monthly

### Meta Ads — Quick Launch

1. Install Pixel + set up Conversions API
2. Define conversion event (purchase, lead, trial signup)
3. Create Campaign: Conversions objective, CBO (Campaign Budget Optimization)
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
8. Budget: Minimum $50/day per campaign
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

- PMax cannibalizes brand search — add brand terms as negative keywords (via Google rep or account-level negatives)
- You can't see which placements/audiences are working (limited reporting)
- Run PMax alongside standard search campaigns — don't replace search entirely
- Asset performance ratings (Low/Good/Best) guide optimization
- Give it 4-6 weeks and 50+ conversions before major changes

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
- [ ] Ad copy reviewed for policy compliance
- [ ] Extensions/assets complete
- [ ] Billing method active
- [ ] Notification settings configured

---

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

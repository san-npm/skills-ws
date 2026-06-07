---
name: customer-acquisition
description: "CAC optimization, channel-mix modeling, multi-touch + incrementality attribution, and acquisition strategy across paid, organic, and product-led channels. Use when calculating CAC/LTV:CAC/payback, allocating channel budget, measuring under iOS ATT/SKAN + consent-mode + cookie loss, running incrementality tests, or building channel playbooks."
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

> **There is no universal channel CAC.** A "$150 Google CAC" is meaningless without industry, ACV, country, the funnel stage you count as a "customer" (lead vs trial vs paid vs net-of-refund), gross margin, and the measurement window. Benchmark against *your own* history and unit economics, not a generic table. Derive each channel's CAC from the formulas in §1, then score relative scalability/time/quality.

**Scoring matrix — fill `CAC` from YOUR data (§1), score the rest 1–5:**

| Channel | Your CAC (compute) | Scalability | Time to first result | Acquired-cohort LTV/quality | Score |
|---------|--------------------|-------------|---------------------|-----------------------------|-------|
| Organic search / SEO | $___ | High | 6–12 mo | Often high intent | |
| Paid search (Google) | $___ | High | Immediate | High intent, capped by query volume | |
| Paid social (Meta Advantage+) | $___ | High | 1–2 wk | Varies by creative/offer | |
| LinkedIn ads | $___ | Medium | 1–2 wk | High for B2B/high-ACV | |
| Content / thought leadership | $___ | High | 3–6 mo | Compounding, high quality | |
| Referral program | $___ | Medium | 1–3 mo | Usually highest LTV, lowest CAC | |
| Outbound (SDR/cold) | $___ | Medium | 2–4 wk | High if ICP-targeted | |
| Partnerships / co-marketing | $___ | Low–Med | 3–6 mo | High, trust-transferred | |
| Events / field | $___ | Low | 1–3 mo | High-touch enterprise | |
| Product-led (PLG/viral) | $___ | Very high | Varies | Varies; watch self-serve→paid rate | |

**Order-of-magnitude CAC *ranges* by motion (illustrative / synthetic — calibrate to your market, not gospel):**

| Sales motion | Typical CAC range* | First-year ACV it must support | Notes |
|--------------|--------------------|--------------------------------|-------|
| B2C consumer app/subscription | $5–80 | $30–300 | Margin-thin; payback must be fast |
| B2C high-AOV ecommerce | $20–200 | $100–1,000+ | Watch first-order vs repeat LTV |
| PLG / self-serve SaaS (SMB) | $50–600 | $300–3,000 | Mostly automated; CAC = ads + a little ops |
| Inside-sales / mid-market SaaS | $1,000–8,000 | $8k–60k | Sales comp dominates CAC |
| Enterprise field sales | $15k–100k+ | $60k–500k+ | Long cycle; allocate by close date |

\*Ranges are **synthetic illustrations**, vary 5–10× by geography (US/UK CPMs ≫ LATAM/SEA), niche competitiveness, and what you count as a conversion. Never quote them externally as benchmarks.

### 3. Attribution Models

| Model | How it works | Best for | Bias |
|-------|-------------|----------|------|
| First touch | 100% credit to first interaction | Understanding discovery | Over-credits awareness channels |
| Last touch | 100% credit to last interaction | Understanding conversion | Over-credits bottom-funnel |
| Linear | Equal credit to all touchpoints | Simple multi-touch | Treats all touches equally (unrealistic) |
| Time decay | More credit to recent touchpoints | Long sales cycles | Under-credits awareness |
| Position-based (U-shape) | 40% first, 40% last, 20% middle | Balanced view | Arbitrary weights |
| Data-driven (DDA) | ML/Shapley-style weights from observed paths | High-volume, well-instrumented funnels | Black box; **trained on modeled + consented data only** — biased by consent loss and platform self-attribution |

> The old "DDA needs 1,000+ conversions" rule is obsolete. Platform DDA (GA4, Google Ads) now runs on far less but **fills gaps with modeled/estimated conversions** and only sees consented users. Ad platforms also **self-attribute** (each claims the same conversion), so summed platform-reported conversions routinely exceed real total sales by 20–60%.

**Correlational attribution (first/last/DDA) tells you *paths*, not *causation*. Use it for directional reads and budget pacing, but settle real channel value with incrementality (§3a).**

**How to actually use attribution:**
1. Pick one **last-non-direct multi-touch** model (or platform DDA) as your day-to-day pacing view — consistency beats theoretical purity.
2. Run **first-touch in parallel** to credit awareness/demand-gen channels the conversion model starves. Disagreement = a candidate for an incrementality test, not a verdict.
3. **Reconcile every model against the CRM/finance source of truth** (closed-won, net of refunds). De-dupe platform-reported conversions; never sum them.
4. For anything you spend real money to scale, **validate with §3a incrementality** before reallocating budget.
5. Capture **self-reported attribution** ("How did you hear about us?") at signup — it's the single best counterweight to dark-social and view-through blind spots that no pixel sees.

### 3a. Incrementality (the truth layer above attribution)

Attribution answers "which touchpoints were on the path?" Incrementality answers "what would have happened *anyway*?" — the only number that justifies scaling spend. A channel can win in last-touch reporting yet be ~0% incremental (e.g., brand search, retargeting already-converting users).

| Method | How it works | Best for | Gotchas |
|--------|--------------|----------|---------|
| **Geo split / matched-market test** | Hold out spend in matched regions; compare conversions vs control geos | Mid/large budgets, any channel | Needs enough geos + spend contrast; use a matched-market or synthetic-control design |
| **Conversion lift (platform)** | Platform randomizes exposed vs holdout, reports lift | Meta/Google/LinkedIn at sufficient spend | You trust the platform's own holdout; spend minimums apply |
| **PSA / ghost ads** | Control group sees a placebo (PSA) or "would-have-served" ghost ad | Display/video where supported | Limited availability; ghost-ad support varies by platform |
| **Holdout cohort** | Withhold a channel/audience % entirely for a period | Email, push, retargeting, lifecycle | Discipline to keep holdout untouched; measure on net revenue |
| **MMM (media mix modeling)** | Regression/Bayesian model of spend→outcome across all channels | Privacy-durable, top-down, cross-channel | Needs 1.5–2+ yr of data; can't see individuals — pairs with geo tests for calibration |
| **Scaled-spend (CAC-curve) test** | Step spend up/down, watch marginal CAC | Pacing a single proven channel | Confounded by seasonality/auctions; change one thing at a time |

**Workflow to reconcile with reporting:**
1. Run an experiment (geo split or platform lift) on the channel in question.
2. Compute **incremental CAC** = test spend ÷ *incremental* conversions (not platform-reported).
3. Derive an **attribution multiplier** = incremental / last-touch-reported conversions. Apply it to deflate that channel's reported numbers between tests.
4. **MMM for the top-down allocation; experiments to calibrate the MMM; attribution for daily pacing** — this triangulation is the 2026 best-practice stack. Re-test quarterly or when CAC drifts >20%.

### 3b. 2026 Measurement Stack (privacy-era reality)

Browser/device privacy has broken naive pixel tracking. Plan acquisition measurement around these constraints — they directly inflate reported CAC and shrink observable conversions:

- **iOS ATT + SKAN (SKAdNetwork/AdAttributionKit):** Most iOS users are opted out of IDFA. App-install/in-app conversions arrive **aggregated, delayed, and with coarse conversion values** via SKAN postbacks — no user-level join. Optimize on SKAN conversion-value schemas, expect a 24–72h+ reporting lag, and never compare iOS SKAN CAC apples-to-apples with web CAC.
- **Consent Mode / cookie loss:** With third-party cookies degraded and consent banners required (EU/EEA/UK + expanding US state laws), a large share of conversions are unobserved. Google **Consent Mode v2** (required for EEA personalized ads/measurement) lets platforms **model** the conversions consent-denied users would have generated.
- **Modeled / estimated conversions:** GA4 and the ad platforms now report a blend of observed + modeled conversions. Treat platform conversion counts as **estimates with error bars**, not ground truth — reconcile to CRM/finance (§3, §5).
- **Server-side tagging + first-party data:** Move tagging server-side (Google Tag Manager Server-Side, or a CDP) to improve match rates, control PII, and reduce reliance on browser cookies. Send first-party events server-to-server.
- **Conversions APIs (server-to-server):** Send offline/closed-won and web conversions back to platforms via **Meta Conversions API (CAPI)**, **Google Enhanced Conversions / offline conversion import**, and **LinkedIn Conversions API** — with hashed first-party identifiers (email/phone) for matching. This is now table-stakes for B2B (upload closed-won, not just form fills) and for recovering signal post-cookie.
- **Data clean rooms:** For deduplicated cross-platform reach/conversion analysis without sharing raw user data (e.g., Google Ads Data Hub, Amazon Marketing Cloud, Meta Advanced Analytics). Use when you need cross-channel overlap/dedup at scale.
- **Deduplication:** A single sale is claimed by multiple platforms. Use a deterministic event ID across pixel + CAPI to dedup, and always net platform totals back to one CRM source of truth.

> Practical default for a new program: GA4 + server-side GTM + CAPI/Enhanced Conversions on every paid channel + Consent Mode v2 + self-reported attribution at signup + CRM closed-won as the arbiter. Exact setup steps and quotas change frequently — verify against the official docs (Google Ads/GA4, Meta Business, LinkedIn Marketing) as of Jun 2026.

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

**Payback period (always gross-margin-adjusted):**
```
Payback (months) = CAC / (Monthly ARPU × Gross margin %)
```
Using revenue instead of gross-margin-adjusted contribution overstates payback speed — a 70%-margin SaaS and a 25%-margin marketplace with identical ARPU have very different real paybacks.

**CAC cohorting — never trust blended/period CAC alone:**
- **Cohort by acquisition month**, not reporting month. Spend in March acquires customers who pay back over later months; matching this-month spend to this-month revenue distorts both ratios (lethal when spend is growing fast).
- **LTV by channel × segment**, not company-wide. Referral and SEO cohorts usually retain far better than paid-social cohorts at the same headline CAC — blended LTV hides this.
- **Adjust LTV for refunds, chargebacks, and early churn.** Use net revenue retention and survival curves; a 14-day-refund-heavy cohort has lower realized LTV than gross bookings imply.
- **Split sales-assisted vs self-serve** even within one channel. Fully-loaded CAC must carry the SDR/AE/CS-onboarding cost onto the assisted cohort, or you'll over-credit self-serve.
- **Pick and document an attribution lookback window** (e.g., 30/60/90-day click; view-through separately) and hold it constant — changing windows silently re-prices every channel's CAC.

### 5. Channel Saturation Signals

**When to diversify (channel is saturating):**
- **Rising marginal CAC**: incremental CAC (§3a) climbs as you add spend — 2x budget ≠ 2x conversions. This is the real saturation signal; the rest are proxies.
- CAC up >20% over 3 months with no strategy/auction-mix change
- Search impression share ceiling (Google Ads "lost IS (budget)" → 0 while "lost IS (rank)" high = you've maxed quality, not budget)
- **Creative/audience fatigue on paid social** — there is no universal frequency threshold. Read it from *the data*: rising frequency *and* falling CTR/CVR *and* rising CPA together. Tolerable frequency depends on audience size, creative-refresh cadence, buying cycle, and objective (prospecting vs retargeting); a 7-day frequency of 1.5 can fatigue a tiny retargeting pool while 4+ is fine for a broad prospecting audience with fresh creative.
- Organic/SEO plateau despite continued investment — and check whether **AI Overviews / AI search answers** are absorbing clicks (see §8).

**Response (derive the test budget; don't hardcode it):**
1. Optimize the existing channel before abandoning (offer, creative, landing page, bid strategy).
2. **Size the new-channel test from learning requirements, not a flat %.** You need enough budget to detect a CAC at-or-below your bar within an acceptable time:
   ```
   Min conversions to learn ≈ derived from your MDE (minimum detectable effect) & baseline CVR
   Min test spend ≈ Min conversions × expected CAC × safety factor (1.5–2×)
   Min test duration ≥ sales cycle + conversion lag (don't read a 60-day-cycle channel at week 2)
   ```
   For most paid channels the platform also needs a **minimum events/week to exit the learning phase** (~50 optimization events/week is the common rule of thumb) — fund at least that or the algorithm never optimizes. 10–15% of budget is a *starting sanity check*, not the rule.
3. Run for **at least one full sales cycle + conversion lag** (often 60–90 days; longer for enterprise) before judging.
4. Compare the new channel on **incremental** CAC and cohort LTV (§3a, §4), not platform-reported CAC.
5. Scale when incremental CAC is competitive with your best channel *and* the marginal-CAC curve still has headroom.

### 6. Budget Allocation Framework

**Portfolio approach:**

| Category | % of budget | Purpose |
|----------|------------|---------|
| Proven channels | 60-70% | Channels with known, acceptable incremental CAC |
| Scaling channels | 20-25% | Channels showing promise, increasing spend |
| Experimental | 10-15% | New channels, testing hypotheses |

> Treat these splits as a **default heuristic, not a constraint**. The experimental slice must still clear each test's **minimum learning spend** (§5) — if 15% can't fund one channel past its learning phase, run *one* test properly rather than three underfunded ones. Mature, capital-efficient programs often run leaner experimentation (~5–10%); early-stage discovery may justify 20%+.

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
| Incremental CAC (last test) | Per test / quarterly | Channel vs last-touch multiplier (§3a) |
| Self-reported source mix | Monthly | "How did you hear about us?" vs pixel attribution |
| SKAN vs web CAC (if mobile) | Monthly | Tracked separately — never blended |

### 8. Channel Playbooks (2026)

Each playbook lists **required inputs → launch checks → failure modes**. Platform UIs/quotas shift constantly — verify specifics against official docs (Google Ads/GA4, Meta Business, LinkedIn Marketing) as of Jun 2026.

**Google Ads — Performance Max (PMax) & Search**
- *Inputs:* conversion tracking with values (not just count), Enhanced Conversions on, a clean audience-signal/asset set, accurate product feed (if retail), brand-exclusion list.
- *Launch checks:* import **offline/closed-won conversions** for lead-gen so PMax optimizes to revenue, not form fills; set value-based bidding; **carve brand search out of PMax** (or use brand exclusions) so PMax doesn't take credit for demand you already own; confirm conversions aren't double-counted across PMax + Search.
- *Failure modes:* PMax cannibalizing brand/Shopping and reporting it as new; thin/unverified value signals → it optimizes to cheap junk conversions; opaque placement/search-term reporting hiding low-quality traffic.

**Meta — Advantage+ (Shopping & broad targeting)**
- *Inputs:* **Conversions API (CAPI) + pixel with a shared event ID for dedup**, a value-optimized purchase/lead event, broad targeting, a deep, frequently refreshed creative library.
- *Launch checks:* feed enough events to exit the learning phase (~50 optimization events/week per ad set); set up dedup (pixel + CAPI same event ID); plan **iOS measurement via SKAN/AAK** and expect aggregated, delayed reporting.
- *Failure modes:* creative fatigue (rising frequency + falling CTR/CVR together — §5); over-trusting in-platform ROAS vs CRM; under-instrumented CAPI starving signal post-cookie.

**LinkedIn Ads (B2B)**
- *Inputs:* **Conversions API / offline conversion upload** to feed closed pipeline back, tight ICP (seniority/firmo), Lead Gen Forms or fast LPs, realistic CPMs (LinkedIn is premium).
- *Launch checks:* upload CRM **closed-won, not MQLs**, so optimization targets revenue; separate prospecting from retargeting; expect long lag between click and closed deal — measure on cohort, not weekly CAC.
- *Failure modes:* optimizing to cheap leads that never close; judging high-ACV/long-cycle spend on a short window; conflating brand lift with direct response.

**SEO / Content (incl. AI search — see §9)**
- *Inputs:* topic-cluster strategy mapped to buyer intent, technical crawlability, internal linking, author/E-E-A-T signals, analytics that survives cookie loss.
- *Launch checks:* attribute via **self-reported + assisted-conversion** views (SEO rarely wins last-touch); track branded vs non-branded; monitor AI Overviews/answer-engine presence, not just blue-link rank.
- *Failure modes:* chasing volume keywords with no commercial intent; ignoring zero-click erosion from AI answers; thin AI-generated content that never ranks.

**Outbound (SDR / cold email & calls)**
- *Inputs:* clean, consented (CAN-SPAM/GDPR-aware) ICP list, warmed sending domains, multi-touch sequences, SDR comp loaded into fully-loaded CAC (§1).
- *Launch checks:* deliverability/domain reputation set up before volume; track reply→meeting→opportunity→won, not just sends; respect opt-out and regional consent law.
- *Failure modes:* domain burn from over-sending; vanity "meetings booked" that don't convert; CAC that looks low until you load SDR/AE cost.

**Referrals & Partnerships / PLG**
- *Inputs (referral):* incentive that survives unit economics, low-friction share flow, fraud controls.
- *Inputs (partnerships):* aligned ICP, co-marketing/integration motion, attribution links/coupons.
- *Inputs (PLG):* instrumented activation + self-serve→paid funnel, in-product invite/virality loops.
- *Launch checks:* referral usually highest-LTV/lowest-CAC — protect it from fraud and keep CAC = incentive + a little ops; for PLG, watch **activation→paid conversion** and **viral coefficient (k)**, not just signups.
- *Failure modes:* incentive arbitrage/fraud; partnership CAC hidden in rev-share; PLG "signups" with no activation masking a broken funnel.

### 9. AI Search & Organic Acquisition (2026)

AI Overviews / answer engines (Google AI Overviews, ChatGPT, Perplexity, etc.) increasingly answer queries **without a click**, eroding top-funnel organic traffic *while* your brand may still be influencing the buyer invisibly.

- **Measurement:** rising impressions with falling CTR in Search Console is the zero-click fingerprint. Don't read it purely as a ranking loss — pair organic data with **self-reported attribution** (§3) to catch demand that AI answers shaped but no referrer captured.
- **Strategy:** optimize to *be the cited source* in AI answers (clear, structured, factual, well-attributed content with strong E-E-A-T) — not just to rank a blue link. Prioritize commercial-intent and bottom-funnel queries that still drive clicks, and brand/comparison content that AI engines surface.
- **Don't over-attribute or under-attribute organic** in your CAC math: SEO/content rarely wins last-touch yet often originates the journey — credit it via assisted-conversion and self-reported views, and validate net contribution with an incrementality read (§3a) when it's a major investment.

---

**Related skill:** for the downstream funnel — lead scoring/routing, pipeline stages, marketing↔sales SLAs, and revenue reporting/RevOps tooling — see the sibling **`revenue-operations`** skill. This skill stops at acquisition cost and channel allocation; `revenue-operations` owns what happens to those leads after they're acquired.

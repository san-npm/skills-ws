---
name: sales-funnel
description: "Design, instrument, and optimize sales/marketing funnels: TOFU/MOFU/BOFU + retention, blueprints by motion (PLG, sales-led B2B, ecommerce, creator, marketplace), GA4/CDP events, CRM lifecycle, objection handling, and privacy-safe measurement. Use when building/auditing a funnel, planning lead magnets, instrumenting events, or diagnosing drop-off."
---

# Sales Funnel

Design conversion paths, instrument them, find the leak, and ship experiments. This skill assumes you have (or will gather) five inputs: **product/offer**, **ICP**, **ACV / price point**, **sales motion** (PLG self-serve, sales-led, hybrid, transactional ecommerce), and **current funnel analytics**. Sales motion drives nearly every decision below — a $30/mo PLG tool and a $120k/yr enterprise contract share almost no funnel mechanics.

Related skills: use `lead-scoring` for the qualification/routing logic that sits between MOFU and BOFU; use `social-media-kit` for the TOFU content production this funnel consumes.

---

## 0. Diagnostic workflow (run this first)

Do not propose tactics before you've measured. Work the funnel in this order.

1. **Gather inputs.** Product, ICP (firmographic + role + pain), ACV, sales motion, sales cycle length, and current analytics (stage-by-stage volumes + conversion rates for the last 1–3 months).
2. **Map the literal stages** the buyer actually moves through (not the textbook ones). For PLG: Visitor → Signup → Activated → Paid → Expanded. For sales-led: Visitor → MQL → SQL → Opportunity → Closed-Won. Name each stage by an observable event, not a feeling.
3. **Compute step conversion rates** and absolute drop-off counts at every transition. Rank leaks by *recovered revenue* = (stage entrants) × (lift you believe is achievable) × (downstream conversion to revenue) × (ACV). The biggest %-drop is rarely the biggest $ opportunity.
4. **Diagnose the top leak.** Is it traffic *quality* (wrong ICP in), *messaging* (right people bounce), *friction* (they try and fail), *trust* (they stall at decision), or *follow-up* (no nurture)? Each has different fixes.
5. **Form a hypothesis** in the form: "For [segment] at [stage], [change] will lift [step metric] from X% to Y% because [mechanism]." Tie to a guardrail metric so you don't win the step but lose revenue.
6. **Design the experiment** (see §8). Pick A/B vs. before-after vs. holdout based on traffic. Pre-register the primary metric and minimum detectable effect.
7. **Define the events** you must fire to even measure this (see §6). If you can't measure the step, instrument before you optimize.
8. **Set guardrails** (see §9) — disclosure, consent, claims substantiation — *before* shipping, especially for scarcity/urgency, pricing, and email.
9. **Produce implementation tasks**: copy/design changes, event tracking, CRM stage definitions, lifecycle automations, and the analysis query.

**Benchmark handling.** Treat published "average conversion rates" as priors, not targets. They vary 5–10× by channel, ACV, and motion. Anchor on *your own* trailing 90-day baseline; only use external benchmarks to sanity-check order of magnitude. Never optimize a metric to a benchmark you can't tie to revenue.

---

## 1. Funnel stages (generic skeleton)

Adapt these to your motion using §5 blueprints. Stages must map to fired events (§6), CRM lifecycle stages (§7), and a clear owner.

### TOFU — Awareness
- **Goal**: reach the right strangers; build a measurable audience you own (email/list), not just rented reach.
- **Content**: SEO articles answering buyer search intent, comparison/"vs." pages, short-form video, podcast, original-data reports, free tools. (Produce via `social-media-kit`.)
- **Metrics**: qualified sessions (ICP-fit, not raw traffic), new-visitor → known-contact rate, content-assisted pipeline. Watch *bounce by source* to catch bad traffic quality.
- **CTA (segment, don't generalize)**: see §2 for CTAs by ACV/role. Avoid generic "subscribe/follow" as the only ask.

### MOFU — Consideration
- **Goal**: convert anonymous traffic into known, consented contacts and educate them toward fit.
- **Content**: gated assets matched to commitment level (§3), nurture sequences, case studies *by segment*, ROI/comparison content, product-led "aha" demos.
- **Metrics**: visitor→lead rate, lead→MQL rate, sequence open/click *only as diagnostics*, content→opportunity influence. Hand off to `lead-scoring` here.

### BOFU — Decision
- **Goal**: remove the last friction and close. Surface proof, pricing clarity, and a low-risk first step.
- **Content**: trial/sandbox, tailored demo, proposal, security/compliance pack, references, ROI calculator, pricing page.
- **Metrics**: SQL→opportunity, opportunity→won, win rate by segment, sales-cycle length, **and the specific objection** that stalls deals (track lost-reasons).

### Retention & Expansion (post-purchase)
- **Goal**: drive activation → habit → expansion → advocacy. For recurring-revenue businesses this is where most LTV lives.
- **Content**: onboarding/activation milestones, in-product nudges, QBRs (sales-led), usage-based upsell prompts, referral program.
- **Metrics**: activation rate, time-to-value, **Net Revenue Retention (NRR)**, gross churn, expansion rate, referral rate.
- **On NPS**: NPS is a *relationship* signal, not a funnel conversion metric. Survey at a stable lifecycle point (e.g., 30–60 days post-activation and periodically thereafter), **not** immediately post-purchase (you measure buying euphoria, not value). Require a usable sample (rough rule: ≥100 responses before reading the score; below that, read verbatims, not the number). Don't trigger experiments off small-sample NPS swings — segment and look at trend, and pair with a behavioral retention metric (NRR/active usage) before acting.

---

## 2. CTAs by sales motion, ACV, and buyer role

Generic CTAs ("buy now", "download guide") convert poorly because the *next reasonable step* depends on deal size and who's reading. Match the ask to the commitment a buyer can plausibly make at that ACV and role.

| Motion / ACV | TOFU CTA | MOFU CTA | BOFU CTA |
|---|---|---|---|
| **PLG self-serve** (< $1k/yr) | "Try it free — no card" | "See your [metric] in 2 min" | "Upgrade to Pro", "Add a teammate" |
| **Self-serve + sales-assist** ($1k–15k/yr) | "Start free trial" | "Book a 15-min setup call", "Get the ROI calculator" | "Talk to sales to unlock [X]", "Start paid plan" |
| **Sales-led mid-market** ($15k–75k/yr) | "Get the [segment] benchmark report" | "See a tailored demo", "Compare us vs. [incumbent]" | "Get a custom proposal", "Start a pilot" |
| **Enterprise** (> $75k/yr) | "Read the [vertical] case study" | "Request a technical deep-dive", "Get the security pack" | "Scope a POC", "Book exec briefing" |
| **Ecommerce / transactional** | "Take the fit quiz", "See bestsellers" | "Save 10% on first order" (consented email) | "Add to cart", "Checkout", "Buy with [Apple/Google Pay]" |

**By role** (overlay on the above):
- **Economic buyer / exec**: lead with outcome + ROI + risk reduction → "See the business case", "Book exec briefing".
- **Champion / practitioner**: lead with capability + hands-on → "Try the sandbox", "See the API docs".
- **Technical evaluator**: → "Read the security/architecture doc", "Run the POC checklist".
- **Procurement/legal**: → "Get DPA & SOC 2", "Download MSA template".

Rule: one **primary** CTA per page that matches the visitor's stage and likely role; secondary CTA offers the lower-commitment fallback (e.g., primary "Book demo", secondary "Get the report").

---

## 3. Lead magnets by funnel stage

Match the magnet to commitment level *and* to the data you're allowed to ask for (see §10 — every field beyond email needs justification and consent).

| Stage | Lead magnet | Commitment | Ask for | Best for |
|---|---|---|---|---|
| TOFU | Checklist, cheat sheet, template, Notion doc | Low | Email only | All motions; list-building |
| TOFU | Quiz, calculator, free micro-tool | Low–med | Email + 1–2 self-segmentation fields | Ecommerce, PLG (also great for routing in `lead-scoring`) |
| MOFU | Original-data report, benchmark, deep guide | Medium | Email + company + role | B2B mid-market/enterprise |
| MOFU | Live webinar / cohort / video course | Med–high | Email + company + role + use case | Sales-led, creator/education |
| BOFU | Free trial / sandbox (product-led) | High | Account creation (progressive) | PLG, self-serve |
| BOFU | Custom audit, ROI workshop, assessment | High | Full qualification (BANT/role/timeline) | Sales-led, agency/services |

**Progressive profiling**: don't gate a TOFU checklist behind a 9-field form. Ask for email first; enrich role/company/use-case on subsequent conversions. Each new field should map to a routing or personalization decision — if it doesn't change what you do next, don't ask.

---

## 4. Channel → stage fit (where traffic enters)

| Channel | Primary stage | Notes |
|---|---|---|
| SEO / content | TOFU→MOFU | Highest-intent at comparison/"vs."/"best X for Y" terms; track by query intent, not just volume |
| Paid search | MOFU→BOFU | Capture existing demand; protect brand terms; measure to revenue, not clicks |
| Paid social | TOFU | Demand creation; expect long, multi-touch paths — don't last-click attribute |
| Organic social / community | TOFU | Produce via `social-media-kit`; assists more than it last-clicks |
| Outbound (SDR/email) | MOFU→BOFU | Sales-led only; consent and suppression rules apply (§10) |
| Referral / word-of-mouth | All | Highest win rate; instrument a referral CTA in retention stage |
| Marketplace / app store | BOFU | High intent, low control over UX; optimize listing + reviews |

---

## 5. Funnel blueprints by business type

Each blueprint lists the **stages (as events)**, the **key step metric to watch**, the **top leak to expect**, and the **highest-leverage fix**. Use the §6 event schema to instrument them.

### 5.1 SaaS PLG (product-led, self-serve)
**Stages**: Visitor → `sign_up` → `activated` (hit the aha action) → `paid` → `expanded` (seats/usage up).
**Key metric**: **activation rate** (signup→activated). This is the master lever in PLG; nothing downstream improves if users never reach value.
**Common leak**: signup→activation. People create accounts but never complete the core action.
**Fix**: define the *single* activation event from data (the action most correlated with retention), then engineer the onboarding to drive it: progressive setup, empty-state guidance, milestone checklist, "first value in <X minutes" goal. Reverse-trial (full features for 14 days, then downgrade) often beats a feature-limited free tier for activation.
**Monetization triggers**: gate on value (seats, usage, advanced features), not time alone. Fire sales-assist for accounts above a usage/firmographic threshold (route via `lead-scoring`).

### 5.2 Sales-led B2B
**Stages**: Visitor → `lead_captured` → MQL (`mql_qualified`) → SQL (`sql_accepted` by sales) → `opportunity_created` → `closed_won`.
**Key metric**: MQL→SQL acceptance rate (marketing/sales alignment) and opportunity win rate by segment.
**Common leak**: MQL→SQL — marketing passes leads sales won't work, or leads rot in handoff.
**Fix**: (1) a written **SLA**: lead definition, who follows up, in what time window (speed-to-lead matters — minutes, not days), and the bounce-back rule for rejected leads. (2) Score and route with `lead-scoring` so reps work the best-fit leads first. (3) Track and review **lost-reasons** monthly; the top reason tells you which BOFU asset/objection to fix (§11).
**Notes**: long cycles → use multi-touch/influenced attribution (§8), never last-click. Build a security/compliance pack early; it unblocks enterprise BOFU.

### 5.3 Ecommerce / DTC (transactional)
**Stages**: Visitor → `view_item` → `add_to_cart` → `begin_checkout` → `purchase` → repeat (`purchase` #2).
**Key metric**: add-to-cart→purchase (checkout completion) and **repeat-purchase rate** (the real margin driver).
**Common leak**: cart→checkout→purchase abandonment (industry-wide, a large majority of carts are abandoned).
**Fix**: reduce checkout friction (guest checkout, wallets/Apple-Pay/Google-Pay, shipping cost shown early, fewer fields); consented cart-abandonment email/SMS flow; trust signals at checkout (reviews, returns policy, security badges). Build repeat purchase via post-purchase email flows and a consented loyalty program — **not** dark-pattern subscription traps (§9).
**Measurement**: GA4 ecommerce events below map 1:1 to these stages.

### 5.4 Agency / professional services
**Stages**: Visitor → `lead_captured` → `discovery_booked` → `proposal_sent` → `closed_won` → retainer/expansion.
**Key metric**: discovery→proposal→won; and proposal close rate.
**Common leak**: lead→discovery-call booked (high-friction, high-consideration purchase) and proposal→won (scope/price/trust).
**Fix**: replace "contact us" with a qualifying application + instant calendar booking; use case studies *by vertical* as the trust mechanism; send tiered/options proposals (good-better-best) with clear scope to combat price objections. Productize a paid "audit/assessment" as a low-risk BOFU entry that converts to retainer.

### 5.5 Course / creator / education
**Stages**: Audience → `email_subscribed` → `webinar_registered`/`free_lesson_viewed` → `enrolled` → completion → advocacy.
**Key metric**: subscriber→customer rate; and for high-ticket, webinar/launch attendance→purchase.
**Common leak**: subscriber→buyer (audience that consumes free content but never buys).
**Fix**: segment the list by intent (interest survey on subscribe); run launch sequences with genuine, *substantiated* deadlines (a real cohort start date) rather than fake countdown timers (§9); offer a low-ticket tripwire to convert subscribers to buyers, then ascend. Show completion/outcome proof, not just testimonials.

### 5.6 Marketplace (two-sided)
**Stages (per side)**: Visitor → `signup` (supply *and* demand) → first listing / first search → `first_transaction` → repeat / liquidity.
**Key metric**: **liquidity** (match/fill rate) and time-to-first-transaction on each side; balance of supply vs. demand acquisition.
**Common leak**: the under-supplied side (a marketplace dies from the cold-start/chicken-and-egg problem). For each new buyer cohort, the leak is search→`first_transaction` if inventory is thin.
**Fix**: seed/concentrate supply in a narrow niche or geo before scaling demand; subsidize the constrained side; measure per-side funnels separately. Demand acquisition is wasted spend if supply liquidity isn't there to fill it.

---

## 6. Conversion-event schemas (instrument before you optimize)

If you can't measure a step, you can't optimize it. Define events once, fire them consistently across web/product, and map them to CRM lifecycle stages (§7). **All of the below is subject to consent (§10).**

### 6.1 GA4 (recommended events)
GA4 is the standard since Universal Analytics was sunset (UA stopped processing data on 1 Jul 2023; standard properties' historical data was removed thereafter). Use GA4's recommended event names for ecommerce so reports work out of the box.

```js
// Fire these only after Consent Mode/CMP grants analytics_storage (see §10.1);
// before consent, Consent Mode sends cookieless pings rather than full events.

// SaaS PLG (custom events)
gtag('event', 'sign_up',   { method: 'email', plan: 'free' });
gtag('event', 'activated', { milestone: 'first_project_created' }); // your aha action
gtag('event', 'purchase',  { value: 30, currency: 'USD', items: [{ item_id: 'pro_monthly' }] });

// Ecommerce (GA4 recommended events — names matter, GA4 builds funnels from them)
gtag('event', 'view_item',     { currency: 'USD', value: 49.0, items: [/* ... */] });
gtag('event', 'add_to_cart',   { currency: 'USD', value: 49.0, items: [/* ... */] });
gtag('event', 'begin_checkout',{ currency: 'USD', value: 49.0, items: [/* ... */] });
gtag('event', 'purchase',      { transaction_id: 'T123', currency: 'USD', value: 49.0,
                                 tax: 4.0, shipping: 5.0, items: [/* ... */] });

// Lead gen
gtag('event', 'generate_lead', { lead_source: 'gated_report', value: 0 });
```

**Server-side caveat**: GA4's recommended path for resilient measurement is the **Measurement Protocol via server-side tagging** (a server-side GTM container, e.g. on Cloud Run). It survives ad-blockers and ITP/Safari cookie capping better than client-side gtag — **but it is not a consent bypass**. Server-side hits still require a lawful basis/consent for the user, and you must still honor Consent Mode signals server-side. Send a stable `client_id`/`user_id` and never PII in event params. As of Jun 2026, verify event names and Consent Mode behavior at https://developers.google.com/analytics and https://support.google.com/analytics.

### 6.2 Segment / RudderStack (warehouse-first CDP)
Use the standard spec so every downstream tool agrees. Gate `track`/`identify` on consent category = analytics/marketing.

```js
// Identify a known person (after they consent + convert)
analytics.identify('user_123', {
  email: 'placeholder@example.com', // hash or omit if consent not given for marketing
  company: 'Acme', role: 'engineering_manager', plan: 'trial'
});

// Track funnel events (consistent names across web + product + server)
analytics.track('Signed Up',      { plan: 'free', source: 'organic' });
analytics.track('Activated',      { milestone: 'first_project_created' });
analytics.track('Lead Captured',  { magnet: 'benchmark_report', icp_fit: true });
analytics.track('Trial Started',  { plan: 'pro' });
analytics.track('Subscription Started', { mrr: 30, plan: 'pro_monthly' });
```

Naming convention: **Object + past-tense Verb**, Title Case ("Order Completed", "Lead Captured"). Pick one tense and casing and enforce it in a tracking plan; inconsistent event names are the #1 cause of unusable funnel data.

### 6.3 UTM conventions (lock these down)
Inconsistent UTMs destroy attribution. Standardize and validate:

| Param | Convention | Example |
|---|---|---|
| `utm_source` | lowercase platform | `google`, `linkedin`, `newsletter` |
| `utm_medium` | lowercase channel type | `cpc`, `paid_social`, `email`, `organic_social`, `referral` |
| `utm_campaign` | `yyyy-qN_theme` | `2026-q2_benchmark_report` |
| `utm_content` | creative/variant | `hero_a`, `carousel_v2` |
| `utm_term` | keyword (paid search) | `best_crm_for_startups` |

Rules: never UTM-tag internal links (it overwrites the real source); use lowercase everywhere (UTMs are case-sensitive); enforce a builder/spreadsheet so reps can't free-type. Capture first-touch *and* last-touch UTMs into the CRM (§7) on the lead record.

---

## 7. CRM lifecycle stages + handoff rules

Funnel events feed a lifecycle model in the CRM. Define stages as states a contact/deal *is in*, with explicit entry/exit criteria and an owner at each step.

### 7.1 Lifecycle stages (HubSpot-style; Salesforce equivalents noted)
| Lifecycle stage | Enters when | Owner | Salesforce analog |
|---|---|---|---|
| Subscriber | Opted into email only | Marketing | Lead (raw) |
| Lead | Submitted a form / known contact | Marketing | Lead |
| MQL | Hits marketing score/behavior threshold (`lead-scoring`) | Marketing | Lead (MQL flag) |
| SQL | Sales **accepts** the lead as worth working | Sales (SDR) | Lead → accepted |
| Opportunity | A deal/revenue chance is created | Sales (AE) | Opportunity |
| Customer | Closed-won | Sales/CS | Closed-Won Opp |
| Evangelist | Refers / advocates | CS/Marketing | — |

### 7.2 Handoff rules (write these as an SLA)
- **MQL→SQL**: define MQL numerically (score + required firmographics). On MQL, route to a rep via `lead-scoring` rules. **Speed-to-lead**: first touch within minutes for inbound demo requests; conversion drops sharply with delay.
- **Rejection/bounce-back**: sales can reject an MQL with a reason code (not-ICP, no-budget, wrong-timing). Rejected→back to nurture, *not* deleted. Review reason codes to fix scoring.
- **Recycling**: closed-lost and gone-cold opportunities re-enter nurture with a timestamp and reason; don't re-pitch identically.
- **Source of truth**: pick one system as the funnel system-of-record (usually the CRM) so marketing and sales report the same numbers. Sync product/CDP events in; don't maintain two conflicting funnels.

---

## 8. Attribution & experiment design

### 8.1 Attribution — pick the model to the motion
| Model | Use when | Caveat |
|---|---|---|
| **Last-touch** | Quick reporting, short ecommerce paths | Over-credits BOFU/branded search; ignores demand creation |
| **First-touch** | Demand-gen / brand awareness analysis | Ignores closing touches |
| **Linear / position-based (U/W-shaped)** | Multi-touch B2B with several touches | Heuristic weights are arbitrary |
| **Data-driven (algorithmic)** | Enough conversion volume; available in GA4/ads | Black-box; needs volume to be stable |
| **Incrementality / geo-holdout / MMM** | Validating whether spend *causes* revenue | The honest answer for paid; needs scale + discipline |

Default stance: for sales-led B2B use **multi-touch / influenced** pipeline plus periodic **incrementality tests** for paid; for short ecommerce use last-/data-driven but verify big spend with holdouts. With cookie loss (§10), single-cookie click attribution is increasingly unreliable — lean on first-party events, logged-in `user_id`, and incrementality.

### 8.2 Experiment design
1. **One primary metric**, defined as a step conversion rate (not a vanity metric), plus a **guardrail** (e.g., revenue/visitor, refund rate, unsubscribe rate).
2. **Estimate sample size** before launch from baseline rate + minimum detectable effect (MDE) + power (0.8) + significance (0.05). If you can't reach the sample in a reasonable window, you don't have the traffic for an A/B test — use a before/after with a holdout or sequence test instead, and say so.
3. **Method by traffic**:
   - High traffic → randomized A/B (or multi-armed bandit if you must optimize live).
   - Low traffic / long cycle → holdout group, pre/post with control market (geo-holdout), or qualitative + funnel-step analysis.
4. **Don't peek**: fix the horizon (or use a sequential test designed for peeking). Calling significance the moment p<0.05 inflates false positives.
5. **Decision rule pre-registered**: ship if primary lifts ≥ MDE *and* no guardrail regresses; otherwise iterate or revert.
6. **Log the result** (win/loss/inconclusive + effect size) in an experiment log so you build institutional knowledge, not folklore.

---

## 9. Persuasion vs. dark patterns — guardrails

Funnels move money and exploit psychology; that puts them squarely in scope of consumer-protection law. Persuasion is fine; deception is illegal and brand-damaging. As of mid-2026, regulators (US FTC, EU under the Digital Services Act / Unfair Commercial Practices Directive, and others) actively pursue dark patterns. Verify current rules with counsel for your jurisdictions.

**Allowed (honest persuasion)**:
- Real social proof (true counts, real reviews — and you must be able to substantiate them).
- **Genuine** scarcity/urgency (actual stock level, a real cohort start date, a real promo end date).
- Anchoring with real reference prices; good-better-best tiering; risk-reversal (real money-back guarantee you honor).
- Clear, prominent CTAs and benefit-led copy.

**Prohibited (dark patterns — do not implement)**:
- **Fake scarcity/urgency**: countdown timers that reset, "only 2 left" when untrue, fabricated "12 people viewing".
- **Forced continuity / subscription traps**: hard-to-cancel subs, hidden auto-renewal, pre-checked upsells. (US "click-to-cancel"-style rules and EU law require cancellation be as easy as signup and auto-renewal be clearly disclosed with consent.)
- **Confirmshaming** ("No, I don't want to save money"), **disguised ads**, **bait-and-switch** pricing, **drip pricing** (hiding mandatory fees until checkout — increasingly explicitly illegal).
- **Sneaking** items into carts; **roach-motel** flows; **trick questions** in opt-ins.

**Claims substantiation**: any performance/ROI/health/earnings claim ("2× your conversions", "lose 10 lbs", "$10k/mo") must be truthful and substantiated *before* you publish it; testimonials must reflect typical results or carry a clear disclosure. For regulated offers (financial, health, supplements, credit, crypto, gambling), add the legally required disclosures and get professional/legal review — this skill is not legal advice.

---

## 10. Privacy-safe measurement & email compliance (mid-2026)

The cookie-and-form playbook from 2019 is non-compliant today. Bake consent and data minimization into the funnel from the start.

### 10.1 Consent & tracking
- **Consent Mode / CMP first**: load a consent management platform; do **not** fire analytics/marketing tags before consent where consent is required (EU/EEA/UK under GDPR + ePrivacy; and increasingly US states). Google requires **Consent Mode v2** to use Google audiences/measurement for EEA traffic; configure `ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization` signals. Verify current requirements at https://support.google.com/analytics and https://support.google.com/google-ads.
- **Third-party cookies are unreliable**, regardless of any single browser's roadmap: Safari ITP and Firefox block them by default, ad-blocker usage is high, and Chrome continues to give users blocking controls. Design for a **post-cookie** world now: prioritize **first-party events**, **logged-in `user_id`** identity, **server-side tagging** (with consent), and **consented email** as your durable identity graph. Do not architect attribution around a 3p cookie surviving.
- **Data minimization**: collect only fields tied to a decision (§3). Hashing emails, IP anonymization/truncation, and short retention windows reduce risk. Map where lead data flows (CDP, CRM, ad platforms) and ensure a lawful basis for each.
- **US state laws** (CPRA/California, plus Colorado, Virginia, Texas, and a growing list) require honoring opt-outs of "sale/sharing" — including treating cookie-based ad targeting as "sharing." Support **Global Privacy Control (GPC)** signals; offer a "Do Not Sell or Share My Personal Information" path.

### 10.2 Email & messaging consent
| Regime | Region | Consent model | Must include |
|---|---|---|---|
| **CAN-SPAM** | US | Opt-out allowed (can email then let them unsubscribe) | Honest subject/headers, physical postal address, working unsubscribe honored promptly (within ~10 business days) |
| **GDPR + ePrivacy** | EU/EEA/UK | **Opt-in** (consent), narrow "soft opt-in" for existing similar-product customers | Freely-given consent, easy withdrawal, identity, lawful basis recorded |
| **CASL** | Canada | **Express opt-in** (limited implied consent windows) | Identity, contact info, working unsubscribe; high penalties for breach |
| **PECR/ePrivacy** | UK/EU marketing comms | Consent for electronic marketing | Same as GDPR + unsubscribe |

Operational rules: maintain a **suppression list** and never email opted-out/bounced contacts; double-opt-in is best practice for EU/Canada lists; segment by consent scope; keep proof of consent (timestamp + source). SMS marketing has its own consent rules (US: prior express written consent; carrier rules apply) — treat it like email-plus.

### 10.3 Payments
For checkout/billing funnels, handle payment data via a PCI-compliant processor (e.g., Stripe) — never collect raw card numbers yourself. For subscription/billing funnel mechanics and dunning, see the `stripe-billing` skill if present in the catalog.

---

## 11. Objection handling (BOFU)

Surface objections early, then arm sales/copy with proof-led responses. Always track **lost-reasons** so you fix the objection that actually loses deals. Below are field-tested responses grouped by objection type — adapt specifics to your product; never make an unsubstantiated claim (§9).

### Price / budget ("Too expensive", "No budget")
- **Reframe to ROI/cost-of-inaction**: "What's the cost of [status quo] over the next year?" Quantify with their numbers, not yours.
- **Tiering**: offer good-better-best so "too expensive" becomes "which tier."
- **Payment terms / pilot**: annual vs. monthly, a paid pilot, or phased rollout to fit a smaller initial budget.
- **Don't lead with a discount** — it trains buyers to wait and signals your price is fake. If you discount, exchange it for something (annual commit, case study, multi-seat).

### Trust / proof ("How do I know it works?", "Never heard of you")
- **Segment-matched proof**: case study from a similar company/role; reference call; a quantified outcome.
- **Risk reversal**: money-back guarantee, opt-out pilot, SLA — and honor it.
- **Reduce perceived risk of the first step**: free sandbox, no-card trial, short pilot.

### Timing ("Not now", "Next quarter", "We're too busy")
- **Diagnose real vs. stall**: "If budget/time weren't a factor, would this be a fit?" If yes, it's a timing problem; if no, it's a fit/value problem — solve the right one.
- **Cost of delay**: quantify what waiting a quarter costs.
- **Lower the activation effort**: "We do the setup; you need ~2 hours total." Recycle to nurture with a dated follow-up if genuinely later.

### Authority ("I need to check with my boss/team")
- **Multithread**: ask to include the economic buyer; offer an exec-briefing asset tailored to them.
- **Arm the champion**: give a one-page internal business case they can forward (don't make them rebuild your pitch).
- **Map the buying committee** early so this objection never surprises you.

### Integration / switching cost ("Will it work with our stack?", "Migration is painful")
- **Show the integration** (docs, native connector, API) and a migration path/tooling.
- **Concierge migration / onboarding** for higher ACVs; quantify time-to-value.
- **De-risk with a parallel pilot** so they don't rip-and-replace blind.

### Security / compliance ("Is our data safe?", "We need SOC 2 / DPA")
- **Have the pack ready**: SOC 2 / ISO report, DPA, sub-processor list, pen-test summary, data residency options.
- **Route to technical/security evaluator** with the architecture doc; don't make sales improvise security answers.
- This objection blocks enterprise BOFU — build the materials *before* you go upmarket (§5.2).

### Competitor / status quo ("We already use X", "We'll build it ourselves")
- **Differentiate on the dimension they care about**, not a feature checklist; use a fair "vs." comparison.
- **Build-vs-buy math**: total cost of building + maintaining vs. your price + time-to-value.
- **Switching support**: migration help + a side-by-side pilot to prove the delta.

**Process**: tag every closed-lost deal with a reason code, review monthly, and feed the top reasons back into (a) BOFU content/assets, (b) the relevant blueprint fix in §5, and (c) `lead-scoring` (if you keep losing on fit, you're scoring fit wrong).

---

## 12. Implementation checklist (output of this skill)

When you finish a funnel design/audit, produce these artifacts:
- [ ] Stage map (events) with current step conversion rates + ranked leaks by recovered-$.
- [ ] Top 1–3 hypotheses with primary metric, MDE, guardrail, and method (§8).
- [ ] Tracking plan: event names + properties for GA4/CDP (§6), consent-gated, with a server-side note where relevant.
- [ ] UTM convention doc + builder (§6.3).
- [ ] CRM lifecycle definitions + MQL→SQL SLA + lost-reason codes (§7).
- [ ] Lead-magnet/CTA matrix tuned to motion+ACV+role (§2, §3).
- [ ] Compliance checklist: CMP/Consent Mode v2, GPC/opt-out path, email consent model per region, suppression list, claims substantiation (§9, §10).
- [ ] Experiment log started; first test scheduled.

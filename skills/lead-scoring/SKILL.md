---
name: lead-scoring
description: "Design, calibrate, and implement CRM/warehouse lead & account scoring — fit + engagement models, MQL/SQL thresholds, SDR routing, decay rules, BANT/MEDDIC mapping. Use when building or tuning lead scoring in HubSpot/Salesforce/Marketo, setting MQL thresholds, validating scores against won/lost data, or adding privacy guardrails."
---

# Lead Scoring

Quantify how likely a lead/account is to buy (fit) and how actively they show intent (engagement), then route the highest-probability records to sales. This skill covers the scoring math, qualification frameworks, CRM + warehouse implementation, calibration against real outcomes, and privacy/compliance.

For the broader lifecycle (stages, conversion-rate analysis, pipeline math) see the sibling `sales-funnel` skill. Use this skill for the *scoring/qualification* layer that feeds those stages.

> Scoring **prioritizes** outreach; it does not replace human qualification. A high score means "call sooner," not "close the deal." Discovery (BANT/MEDDIC) confirms what the score predicted.

## Scoring Model Design

### Two-Axis Model
Score on two independent axes so a great-fit-but-cold account isn't confused with a poor-fit tire-kicker who clicks everything:
1. **Fit Score** (0–100): how well they match your ICP (firmographic/demographic). Mostly static; changes on enrichment or job change.
2. **Engagement Score** (0–100): how actively they show buying intent (behavioral). Time-sensitive; decays.

**Both axes are hard-capped at 100.** Compute raw points, then clamp:

```
fit        = min(100, sum(fit_points))
engagement = min(100, sum(engagement_points_after_decay_and_dedup))
total      = round(0.4 * fit + 0.6 * engagement)   # 0–100
```

The 40/60 weighting favors intent over fit — flip toward fit (e.g., 60/40) in long, committee-driven enterprise sales where firmographics predict more than clicks. **Calibrate the weights against won/lost data (see Calibration); do not ship the default blindly.**

> **Use a grade × score matrix, not a single number, for routing.** Collapsing fit and engagement into one total hides the most important quadrant. Route on the 2x2 below and keep `total` only as a tiebreaker/sort key.

|              | Low engagement (<40)        | High engagement (≥60)            |
|--------------|-----------------------------|----------------------------------|
| **High fit (≥60)** | Nurture, account-based ads (A2 / "right fit, not ready") | **Hot — alert AE, SLA timer (A1)** |
| **Low fit (<40)**  | Disqualify / low-touch (D)  | Reroute or self-serve; investigate why low-fit is so active (could be a competitor, student, or job seeker) |

### Fit Score (Firmographic / Demographic)

| Signal | Points | Example / note |
|--------|-------:|----------------|
| Company size matches ICP | +20 | 50–500 employees |
| Industry match | +15 | SaaS, fintech |
| Job title / seniority | +20 | VP+, Director, C-level |
| Buying role | +15 | Economic buyer or champion (not "student", "consultant", "intern") |
| Geography in serviceable market | +10 | Supported region/currency/language |
| Tech stack match | +10 | Uses a complementary/integrated tool |
| Revenue range match | +10 | $5M–$50M ARR |

**Negative fit (subtract, can push fit to 0):**

| Signal | Points |
|--------|-------:|
| Personal/free email domain (gmail, outlook) on a B2B product | −10 |
| Out-of-market geography (unsupported / sanctioned) | −20 |
| Competitor domain | −100 (effectively disqualify) |
| Title = student / job seeker / "looking for work" | −20 |
| Company size far below/above ICP | −15 |

> Replaced the old "Budget range confirmed → +15 (>$50K ARR potential)". That conflated two different things: **confirmed budget** is a *discovery/BANT* fact, while **ARR potential** is a *seller-side fit* estimate. Keep ARR-potential in the fit table via *company size / revenue range* (above). Track *confirmed budget* as a discovery field that triggers a **lifecycle override** (jump to SQL), not as scattered fit points — a number a rep heard on a call is far stronger evidence than any model output.

### Engagement Score (Behavior)

**Prioritize first-party, hard-to-fake signals.** Order of signal reliability (strongest first): **product usage > form fill / reply > meaningful click > high-intent page view > content download > email open**.

| Signal | Points | Decay | Notes |
|--------|-------:|-------|-------|
| Demo / "talk to sales" request | +30 | see lifecycle below | Highest-intent self-serve action |
| Free-trial signup | +25 | −5/wk if inactive | Pair with product-usage signals |
| Activated in product (key action) | +25 | −5/wk inactive | e.g., created a project, invited a teammate, hit an API |
| Pricing page visit | +20 | −5/wk | Strong intent; cap repeats (see dedup) |
| Webinar attended (live) | +15 | −3/wk | "Registered but no-show" = +3 only |
| Returned after 30d+ absence | +15 | one-time, expires 2wk | Reactivation spike |
| Replied to a sequence (human reply) | +12 | −2/wk | Real two-way intent |
| Multiple sessions (3+ in 7d) | +10 | −2/wk | Account-level if known |
| Case study / ROI content download | +10 | −3/wk | Bottom-funnel content |
| Meaningful email click (pricing/demo CTA) | +5 | −2/wk | Click on real CTA, not unsubscribe/footer |
| Blog post read | +2 | −1/wk | Top-funnel; cap repeats |

> **Email *opens* are intentionally NOT scored.** Since Apple **Mail Privacy Protection** (default on iOS/macOS Mail, which is a large share of opens) Apple pre-fetches images and fires the open pixel whether or not the human read the email; Gmail and corporate security scanners do the same. Opens are inflated, undercounted on privacy-respecting clients, and trivially spoofed — they are noise for scoring. Score **clicks on meaningful CTAs, replies, and resulting site/product events** instead. If you must use opens, treat them only as a weak tiebreaker, never as a threshold mover.

### Caps, dedup & frequency limits (prevents runaway scores)

Without limits, a single enthusiastic user (or a bot, or an email security scanner clicking every link) can pile a behavioral table past 100. Enforce **all** of these before clamping:

- **Per-signal cap** — count a signal at most N times per window. Defaults: `pricing_page` 3×/week, `blog_read` 5×/week, `email_click` 5×/week, `session` counted as the "3+ sessions" bonus only (don't add per session).
- **Dedup window** — collapse identical events within a short window into one (e.g., 5 page views of `/pricing` in 10 min = one visit). De-bot first: drop events from known crawler UAs/IPs, datacenter ASNs, and link-prefetch/security-scanner signatures (clicks <2s after send, all-links-clicked).
- **Diminishing returns** — for repeatable low-value signals use `floor(log2(count+1)) * base` instead of `count * base` so a scraper can't farm points.
- **Global engagement clamp** — `engagement = min(100, …)` is the final backstop.
- **Account-level rollup** (B2B) — score the **account**, not just the contact. Account engagement = capped sum across known contacts (e.g., `min(100, Σ contact_engagement)`), so a buying committee of five looks hotter than one lone clicker, but ten low-value contacts can't run it to infinity. Score the *contact* for routing-to-a-person; score the *account* for "is this deal real."

### Score Decay & Lifecycle Overrides

Apply decay **weekly** (or continuously) to the *behavioral* axis so old intent cools off — a lead who hit pricing 3 months ago isn't hot. **Fit does not decay** (it changes only on data updates). Implement decay as a per-event half-life (subtract the per-signal rate each week, floor at 0) rather than a flat global subtraction, so recent strong signals outlive old weak ones.

**Lifecycle state overrides the number.** A score is meaningless once a human has dispositioned the lead — wire these in so a record can't sit "Hot" forever:

| Event | Override |
|-------|----------|
| Confirmed budget/authority on a call (BANT facts) | Force ≥ SQL; create opportunity |
| Demo booked | Lock score; start SLA timer (e.g., AE first-touch within 4 business hrs); stop nurture |
| Demo **no-show** | −20 engagement; recycle to nurture after 1 follow-up |
| Marked **Sales-Accepted / Opportunity** | Stop marketing scoring; ownership = sales |
| Closed-Won | Remove from acquisition scoring; move to expansion/health scoring |
| Closed-Lost / Disqualified | Reset engagement to 0; suppress from MQL for a cool-off (e.g., 90d), then allow re-entry |
| Unsubscribed / opted out | Cap engagement at 0; never auto-route (compliance) |
| Recycled "no decision" | Re-enter at lower threshold; require a *new* high-intent signal to re-MQL |

> The old model's `Demo request | +30 | None` (never decays) is fixed here: a demo request **starts a stage transition with an SLA timer**, not an immortal +30. If the demo isn't booked/held, engagement decays and the lead recycles.

### Thresholds (MQL / SQL routing)

Bands below are a **starting point** — set the MQL cutoff where your *backtest* shows the best precision/recall trade-off on real won deals (see Calibration), not at a round number. Route on the **grade × score matrix** above; use these bands to label and to size nurture vs. sales effort.

| Total | Label | Action |
|------:|-------|--------|
| 0–30 | Cold | Automated nurture; no SDR touch |
| 31–50 | Warm | Targeted content; monitor for intent spike |
| 51–70 | **MQL** | Marketing-qualified → notify SDR queue |
| 71–85 | **SQL** | Sales-qualified → direct outreach, SLA timer |
| 86–100 | Hot | Immediate AE attention, top of queue |

## Qualification Frameworks (BANT / CHAMP / MEDDIC)

Frameworks live **in discovery**, not in the automated score — a rep confirms them on calls, and confirmed facts become **lifecycle overrides** (above). Map each framework dimension to a CRM field; the *presence* of a confirmed value is what moves the lead, not a model guess. Pick the framework by deal complexity.

### BANT (simple, transactional, single decision-maker)
Origin: IBM. Fastest to apply; weakest for committee/enterprise deals (treats budget as a gate too early).

| Dimension | Confirm on call | Scoring action when confirmed |
|-----------|-----------------|-------------------------------|
| **B**udget | Funds exist & sized to your price | Override → SQL |
| **A**uthority | Talking to (or routed to) the decision-maker | +fit (buying role); else find the buyer |
| **N**eed | A real pain your product solves | Required for any qualification |
| **T**imeline | When they intend to buy/implement | <90 days → bump priority; "someday" → nurture |

### CHAMP (need-first reorder of BANT, good for inbound)
Leads with the pain instead of the budget gate — better when you don't want to disqualify a great-fit lead just because budget isn't approved yet.

| Dimension | Meaning |
|-----------|---------|
| **CH**allenges | Lead with the problem; is it one you solve? |
| **A**uthority | Who decides / who's on the committee? |
| **M**oney | Budget reality (after need is established) |
| **P**rioritization | Where this ranks vs. their other initiatives |

### MEDDIC / MEDDICC / MEDDPICC (complex, high-ACV, multi-stakeholder)
The enterprise standard. MEDDICC adds **Competition**; MEDDPICC adds **Paper Process** (legal/procurement). Each filled field is strong evidence; a blank **Champion** or **Decision Criteria** is a deal risk flag, not a score.

| Letter | Dimension | What "good" looks like |
|--------|-----------|------------------------|
| **M** | Metrics | Quantified business impact the buyer will measure (e.g., "cut onboarding from 6w→2w") |
| **E** | Economic buyer | Named person who controls the budget; you've met them |
| **D** | Decision criteria | The written/explicit criteria the buyer will judge vendors on |
| **D** | Decision process | The actual steps/dates from eval → signature |
| **I** | Identify pain | Compelling, owned pain (not a nice-to-have) |
| **C** | Champion | An internal advocate with influence who sells when you're not in the room |
| **(C)** | Competition | Who/what you're up against (incl. "do nothing") |
| **(P)** | Paper process | Procurement, legal, security review, MSA steps |

**When to use which:** transactional / PLG self-serve → **BANT/CHAMP** (and lean on product-usage scoring); mid-market → **CHAMP + light MEDDIC**; enterprise / committee / >$50k ACV → **MEDDIC(C)**. The automated score gets a lead *to* a rep; the framework qualifies it *with* a rep.

## CRM & Warehouse Implementation

### HubSpot
- Build score in **Settings → Properties → score property** ("HubSpot Score") or a custom **Score** property; or compute externally and write back via API to a custom number property.
- Add positive/negative criteria sets in the score editor (filters on properties + behavioral events). Use **separate** custom score properties for `fit_score` and `engagement_score`, then a **Calculated property** (or workflow) for `total = round(0.4*fit + 0.6*engagement)`.
- **MQL handoff:** workflow trigger `total ≥ 51 AND lifecyclestage != customer` → set `lifecyclestage = marketingqualifiedlead`, enroll in SDR notify, start an SLA task.
- Decay isn't native — run a scheduled workflow / external job that decrements the engagement property; or recompute nightly from the event stream (preferred).

### Salesforce
- Native point-based scoring is limited; most teams use **Marketing Cloud Account Engagement (Pardot)** scoring + grading, **Einstein Lead Scoring** (ML, scores by similarity to past converted leads), or write a custom `Lead_Score__c` / `Engagement_Score__c` from an external job.
- Pardot gives you a **numeric Score (engagement)** and a **letter Grade (fit, A–F)** out of the box — that's the grade × score matrix natively; route on `Grade A/B AND Score ≥ X`.
- **Assignment:** Process Builder / Flow on score threshold → assign to queue, post to Slack, create a task with due-date SLA. For account scoring use **Account-level fields** rolled up via Flow or a nightly Apex/batch job.

### Marketo / Adobe (and Pardot)
- Marketo uses **behavioral + demographic scoring** via Smart Campaigns ("Change Score" flow steps) and **score decay** programs (negative "Change Score" on inactivity).
- Standard pattern: `Lead Score = Demographic Score + Behavioral Score`, with a separate **Acquisition/Decay** program that subtracts points after N days of inactivity. MQL when score crosses threshold AND demographic grade ≥ target.

### Warehouse-native (recommended at scale: dbt + reverse-ETL)
Compute scores from raw event/firmographic data in your warehouse and sync to the CRM (Hightouch/Census/Fivetran reverse-ETL). This makes the model versioned, testable, and consistent across tools.

```sql
-- engagement_scores.sql (Postgres/Snowflake/BigQuery dialect-ish)
-- 1) dedup + de-bot raw events, 2) cap per signal/week, 3) decay, 4) clamp.

with clean as (
  select
    account_id,
    contact_id,
    event_name,
    -- collapse bursts: one event per (contact,name) per 10-min bucket
    date_trunc('hour', occurred_at)
      + floor(extract(minute from occurred_at) / 10) * interval '10 minute' as bucket,
    min(occurred_at) as occurred_at
  from raw_events
  where is_bot = false                              -- drop crawlers/scanners
    and event_name not in ('email_open')            -- privacy: opens are noise
  group by 1,2,3,4
),
scored as (
  select
    account_id, contact_id, occurred_at,
    case event_name
      when 'demo_request'   then 30
      when 'trial_signup'   then 25
      when 'product_activate' then 25
      when 'pricing_view'   then 20
      when 'webinar_attend' then 15
      when 'sequence_reply' then 12
      when 'content_download' then 10
      when 'cta_click'      then 5
      when 'blog_read'      then 2
      else 0
    end as base_points,
    -- per-signal weekly cap via row_number; null out points past the cap
    row_number() over (
      partition by contact_id, event_name, date_trunc('week', occurred_at)
      order by occurred_at
    ) as occurrence_in_week
  from clean
),
capped as (
  select *,
    case
      when event_name = 'pricing_view' and occurrence_in_week > 3 then 0
      when event_name = 'blog_read'    and occurrence_in_week > 5 then 0
      when event_name = 'cta_click'    and occurrence_in_week > 5 then 0
      else base_points
    end as points
  from scored
),
decayed as (   -- exponential weekly decay; weight recent intent heavier
  select contact_id, account_id,
    sum(points * power(0.85, date_diff('week', occurred_at, current_date))) as raw_engagement
  from capped
  where points > 0                                  -- drop zeroed/capped-out rows
  group by 1,2
),
per_contact as (   -- clamp EACH contact to 100 before rolling up to the account
  select contact_id, account_id,
    least(100, round(raw_engagement)) as engagement_score
  from decayed
)
select
  contact_id,
  account_id,
  engagement_score,
  -- account rollup = capped sum of already-capped contact scores (matches prose: min(100, Σ contact_engagement))
  least(100, sum(engagement_score) over (partition by account_id)) as account_engagement
from per_contact;
```

Add a `fit_scores.sql` model over firmographic/enrichment tables (same `case` pattern, including the negative-fit rows), then a `lead_scores` model joining them: `round(0.4*fit + 0.6*engagement)`. Materialize nightly; reverse-ETL `total`, `fit`, `engagement`, and the grade quadrant into CRM fields. **dbt tests** keep it honest: `not_null`/`accepted_range(0,100)` on each score, `unique` on `contact_id`, and a freshness test on `raw_events`.

### Event schema (instrument first — you can't score what you don't capture)
Minimum per behavioral event: `event_name`, `contact_id` (and resolved `account_id`), `occurred_at` (UTC), `source`, `is_bot`, plus context (e.g., `page_path`, `cta_id`). Resolve anonymous→known on form-fill/login so pre-conversion intent isn't lost. Define `is_bot` from UA/ASN/prefetch heuristics at ingestion.

## Calibration (don't trust an uncalibrated model)

A scoring model is a **classifier predicting "will become a Closed-Won opportunity."** Validate it against real outcomes, not gut feel.

1. **Build a labeled set.** Pull historical leads with their score at MQL time and their outcome (`won` / `lost-after-opp` / `never-opp`). You need *score-at-the-time*, not today's score — snapshot scores or reconstruct from the event log.
2. **Backtest the threshold.** For candidate MQL cutoffs, compute against `won`:
   - **Precision** = won / (predicted-MQL) — "of the leads we called, how many converted?" (protects sales' time)
   - **Recall** = predicted-MQL-won / (all won) — "of deals that closed, how many did we flag?" (protects pipeline)
   - **F1** to balance, or pick the cutoff at your team's acceptable precision floor. Plot a precision/recall curve over thresholds and choose deliberately; raising the MQL bar trades recall for precision.
3. **Per-signal weight calibration.** For each signal, compare conversion rate of leads-with vs leads-without it (lift), or fit a logistic regression / use the CRM's native ML (Einstein, HubSpot predictive) and compare its learned weights to your hand-set points. Demote signals that don't separate won from lost (often: email opens, generic blog reads); promote those that do (often: pricing views, product activation, demo requests). **Remove negative-lift signals.**
4. **Watch for leakage & feedback loops.** Don't score on anything that only happens *after* sales engages (e.g., "contract sent") — that inflates apparent accuracy. And remember reps work high scores first, so high scores convert partly *because* they got attention; segment a hold-out or compare within-band to detect this.
5. **Re-calibrate quarterly + monitor drift.** ICP, channels, and behavior shift. Track: MQL→SQL and MQL→Won rates by score band over time, score distribution drift, and SDR feedback ("score said hot, lead was junk"). If a band's conversion rate moves materially, re-fit. Version every weight change (config in git / dbt) with the date and the conversion delta that justified it.

## Privacy & Compliance (required before going live)

Lead scoring is **profiling of identifiable people** and is regulated. Loop in legal/DPO; this is engineering guidance, not legal advice.

- **Lawful basis & consent (GDPR/ePrivacy).** Behavioral tracking that uses cookies/identifiers generally needs **consent** (or, for some first-party processing, documented **legitimate interest** with a balancing test). Score only on data you're permitted to process for this purpose. Honor consent state — don't score events collected without a valid basis.
- **CCPA/CPRA (California) & US state laws.** Respect **opt-out of "sharing"/sale** and **Global Privacy Control** signals; profiling that produces legal/significant effects grants access/opt-out rights. Maintain a do-not-sell/share suppression that also suppresses scoring/enrichment.
- **EU AI Act.** Pure marketing prioritization is generally **low/limited-risk**, but document a brief risk assessment, keep a human in the loop for consequential routing decisions, and avoid anything resembling prohibited profiling. If scoring ever gates credit/employment-like outcomes, treat it as higher-risk. *(As of Jun 2026 obligations are phasing in — verify current applicability at https://artificialintelligenceact.eu/ and with counsel.)*
- **Data enrichment vendors.** Vet every enrichment/data-broker source for lawful sourcing and a data-processing agreement; mismatched or scraped data creates both accuracy and legal risk. Record provenance per field. Be aware some brokers are restricted under GDPR/CPRA.
- **Right to access / erasure / object.** A scored profile is personal data: support DSARs (export the score and the signals behind it), deletion (purge events + derived scores), and the **right to object to profiling**. Suppress objected/erased records from scoring pipelines, not just the UI.
- **Data retention & minimization.** Set TTLs on raw behavioral events (e.g., expire after N months) and don't collect signals you won't score. Decay already favors recency — let old events age out.
- **Explainability & human review.** Store the **reason codes** (which signals contributed) alongside each score so a rep/auditor can see *why* a lead is hot, and so you can honor the right to an explanation. Keep a human decision step before any automated rejection/deprioritization that materially affects a person.
- **Opt-out = hard stop.** Unsubscribed/objected/erased records: engagement capped at 0, excluded from MQL routing and from enrichment refresh.

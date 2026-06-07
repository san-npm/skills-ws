---
name: revenue-operations
description: "RevOps for B2B SaaS — segmented funnel benchmarks, forecasting rigor, capacity-based quota/territory planning, GTM alignment, dashboard SQL, and a 2026 tooling stack. Use when defining funnel stages, building a forecast or quota model, auditing the GTM tech stack, or instrumenting pipeline/retention dashboards."
---

# Revenue Operations

## Workflow

### 1. Revenue Funnel Definitions

Align ALL teams on the same definitions:

| Stage | Definition | Owner | SLA |
|-------|-----------|-------|-----|
| Visitor | Hit website or content | Marketing | — |
| Lead | Known contact (form fill, signup) | Marketing | Enrich within 24h |
| MQL | Meets scoring threshold (fit + engagement) | Marketing | Route within 5 min |
| SAL | Sales accepted, meeting booked | SDR/BDR | Contact within 1 hour |
| SQL | Qualified by sales (BANT/MEDDIC confirmed) | AE | Discovery within 3 days |
| Opportunity | In pipeline with defined next steps | AE | Advance or close within 90 days |
| Closed Won | Contract signed, revenue booked | AE → CS | Handoff within 48h |

**Conversion benchmarks — segment before you compare.** Public "B2B SaaS averages" are nearly useless because conversion is dominated by motion (PLG vs sales-led), ACV, channel (inbound vs outbound), ICP fit, and market maturity. Treat the table below as *order-of-magnitude priors*, not targets — then compute your own baselines (next).

| Stage transition | PLG / self-serve (low ACV <$5k) | Inbound sales-led (mid ACV $5k–50k) | Outbound / enterprise (ACV >$50k) |
|-----------------|-------------------------------|------------------------------------|-----------------------------------|
| Visitor → Lead (signup) | 2–8% | 1–3% | <1% (ABM, not volume) |
| Lead → MQL | n/a (PQL instead) | 15–35% | 25–45% (tight ICP) |
| MQL/PQL → SAL (accepted) | 5–15% PQL→sales | 50–70% | 60–85% |
| SAL → SQL | 50–70% | 40–60% | 35–55% (longer qual) |
| SQL → Opportunity | 60–80% | 50–70% | 45–65% |
| Opportunity → Closed Won | 25–40% | 18–30% | 15–25% (more stakeholders) |
| Blended visitor→won | varies widely | 0.3–1.5% | <0.3% |

Outbound-sourced opps usually convert at a *higher* win rate but *lower* top-of-funnel volume than inbound; PLG replaces MQL with **PQL** (product-qualified lead — hit an activation/usage threshold) and SAL with a sales-assist trigger.

**Calculate your own baseline (do this before setting any target):**
```sql
-- 90-day trailing stage-to-stage conversion, segmented by motion + source
-- (assumes an opportunities table with stage-entry timestamps and a deals/leads source)
WITH cohort AS (
  SELECT
    o.opportunity_id,
    o.acv_band,                         -- '<5k' | '5-50k' | '>50k'
    o.source_channel,                   -- 'plg' | 'inbound' | 'outbound'
    MAX(CASE WHEN h.stage = 'SQL'          THEN 1 ELSE 0 END) AS reached_sql,
    MAX(CASE WHEN h.stage = 'Opportunity'  THEN 1 ELSE 0 END) AS reached_opp,
    MAX(CASE WHEN h.stage = 'Closed Won'   THEN 1 ELSE 0 END) AS reached_won
  FROM opportunities o
  JOIN stage_history h USING (opportunity_id)
  WHERE o.created_at >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY 1, 2, 3
)
SELECT
  acv_band, source_channel,
  COUNT(*)                                                AS opps,
  ROUND(100.0 * SUM(reached_opp) / NULLIF(SUM(reached_sql), 0), 1) AS sql_to_opp_pct,
  ROUND(100.0 * SUM(reached_won) / NULLIF(SUM(reached_opp), 0), 1) AS opp_to_won_pct
FROM cohort
GROUP BY 1, 2
ORDER BY 1, 2;
```
Recompute quarterly, watch the *trend* (your own series) over the absolute number, and segment any rate you report by ACV band + source. A single blended funnel rate hides the segments that actually need fixing.

### 2. Forecasting Models

**Weighted pipeline (standard):**
```
Deal forecast = Deal value × Stage probability
Total forecast = Σ all deal forecasts
```

**Historical conversion (more accurate):**
```
Expected revenue = Current stage count × Historical stage-to-close rate × Average deal size
```

**Bottoms-up / category roll-up (most accurate, most work):**
```
Rep forecast = Commit + (Best case × historical best-case close rate) + (Pipeline × historical pipeline-create-to-close rate)
Team forecast = Σ rep forecasts × per-rep calibration multiplier (see below)
```
Use *your own* historical close rates per category, not 0.5 / 0.15 magic numbers — derive them from the last 2–4 quarters by rep and segment.

**Define forecast categories explicitly** (the #1 cause of bad forecasts is undefined categories, not bad reps):

| Category | Definition — every condition must hold | Typical close rate |
|----------|----------------------------------------|--------------------|
| Commit | Verbal/written yes, paper in motion, close date this period, owner would bet their number on it | 85–95% |
| Best case | Real upside; could close this period if 1–2 specific risks clear; named next step on calendar | 30–60% |
| Pipeline | Qualified, active, but not expected to close this period | = stage/historical rate |
| Omitted | Stalled, no next step, or close date already pushed twice | exclude from forecast |

**Forecast hygiene signals to inspect weekly (per deal):**
- **Close-date push rate** — count of times close date moved out. ≥2 pushes ⇒ deal is at risk regardless of category.
- **Stage aging** — days in current stage vs your segment median. Flag deals >1.5× median (going stale).
- **Next-step quality** — is there a *scheduled, mutual* next step (meeting/MAP milestone), not "follow up"? No next step ⇒ not a commit.
- **Coverage gap** — Commit + weighted pipeline vs target; if short, the fix is *new pipeline this period*, not pressure on existing deals.

```sql
-- Deals that should be challenged: pushed twice OR stale OR no next step
SELECT opportunity_id, owner, amount, stage, close_date, push_count,
       date_part('day', now() - stage_entered_at) AS days_in_stage,
       next_step_at
FROM opportunities
WHERE forecast_category IN ('commit','best_case')
  AND ( push_count >= 2
     OR date_part('day', now() - stage_entered_at) >
        1.5 * (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY days_in_stage)
               FROM stage_durations s WHERE s.stage = opportunities.stage)
     OR next_step_at IS NULL )
ORDER BY amount DESC;
```

**Forecast accuracy tracking:**

| Month | Forecast | Actual | Accuracy | Bias |
|-------|----------|--------|----------|------|
| Jan | $250k | $230k | 92% | +8% (over) |
| Feb | $280k | $310k | 90% | −11% (under) |
| Mar | $300k | $275k | 92% | +9% (over) |

Track both **accuracy** (|forecast − actual| / actual) and **bias** (signed, to catch consistent over/under-calling). Target ±10% accuracy *and* near-zero average bias. A persistent miss is a *diagnosis to run*, not a verdict on reps — check, in order:

1. **Stage/category definitions** — are "commit" and "best case" applied consistently across reps?
2. **CRM hygiene** — stale close dates, missing next steps, amounts not updated.
3. **Slippage / push rate** — are deals real but landing a period late? (fix close-date discipline, not the number).
4. **Pipeline creation** — was enough new pipeline created early enough to hit coverage?
5. **Seasonality / deal-desk & legal / procurement delays** — late-stage drag outside the rep's control.
6. **Product or pricing changes, churn/expansion timing** — shifts that move close dates.
7. **Rep calibration** — *only after the above*: some reps are reliably optimistic, others sandbag. Build a per-rep calibration multiplier from their trailing 4-quarter forecast-vs-actual, coach with the data, and apply the multiplier in the roll-up rather than assuming intent.

### 3. GTM Alignment

**Weekly GTM standup (30 min):**
- Marketing: pipeline contribution this week, upcoming campaigns
- Sales: deal updates, blockers, competitive intel
- CS: churn risks, expansion opportunities, product feedback
- RevOps: funnel health, forecast update, process issues

**Monthly revenue review (60 min):**
- Funnel conversion rates vs targets
- Pipeline coverage (3x target = healthy)
- Win rate trends by segment, source, rep
- Churn and expansion ARR
- Forecast vs actual analysis

### 4. Quota & Territory Planning

**Capacity model (build this bottoms-up — `Company target / #AEs × 1.15` is too naive: it ignores ramp state, attainment distribution, attrition, overlays, and the new-logo vs expansion split).** Plan capacity and quota separately, then reconcile.

Order of operations:
1. **Split the number.** Board target → new-logo bookings + expansion bookings (NRR-driven, often owned by CS/AM, not AEs). Only assign the *new-logo* portion (plus any AE-owned expansion) to AE quota.
2. **Quota per ramped AE** is set so that *expected attainment*, not full quota, covers the target. If reps historically attain ~70% on average, gross-up the quota: `quota = (target per head) / expected_attainment`. Carry quota above the number on purpose (typical aggregate over-assignment 15–25%) so that median attainment still hits plan.
3. **Convert headcount to ramped-equivalents** using the ramp curve, not a raw count — a rep in month 3 is ~0.25 of a ramped AE.
4. **Discount for attrition** over the period (ramped capacity lost mid-year is rarely backfilled in time).
5. **Apply seasonality** — distribute quota by historical bookings-by-month, not 1/12 per month.
6. **Check coverage** — pipeline needed = quota / weighted win rate; if marketing+outbound can't create it, the quota is fiction.

```text
# Worked example — capacity in "ramped-AE equivalents"
new_logo_target          = $12.0M                  # AE-owned slice of the board number
expected_attainment      = 0.72                     # trailing median, NOT 100%
attrition_haircut        = 0.90                     # ~10% ramped capacity lost in-year
ramp_curve (% of full quota by tenure month) = {1-2:0, 3:0.25, 4:0.50, 5:0.75, 6+:1.0}

# Sum ramped-equivalents across the roster (each AE weighted by their month in-period):
ramped_equiv = Σ ramp_curve[ae.tenure_month]        # e.g. 9 fully-ramped + 4 ramping = 10.0 equiv
effective_capacity_heads = ramped_equiv × attrition_haircut          # 10.0 × 0.90 = 9.0

# Quota grossed-up for expected attainment, then over-assigned for safety:
quota_per_ramped_AE = (new_logo_target / effective_capacity_heads) / expected_attainment
                    = ($12.0M / 9.0) / 0.72  ≈  $1.85M

aggregate_quota      = quota_per_ramped_AE × ramped_equiv  ≈ $18.5M   # ~1.5× the $12M target
expected_bookings    = aggregate_quota × expected_attainment ≈ $13.3M  # cushion above $12M target
```

| Capacity input | Source | Why it matters |
|----------------|--------|----------------|
| Expected attainment | Trailing 4–6 quarters, by segment | Setting quota = target/heads assumes 100% attainment (never happens) |
| Ramp curve | Time-to-first-deal + time-to-full-productivity cohorts | New hires are fractional capacity for ~2 quarters |
| Attrition / backfill lag | HR + recruiting time-to-fill | Mid-year departures shrink delivered capacity |
| Sales cycle | Avg days SQL→won by segment | Late-period hires can't contribute bookings this period |
| Territory TAM | Accounts × ICP fit × whitespace | Quota must track territory potential, not be flat |
| Manager/overlay credit | Comp plan | Don't double-count overlay or manager-sourced deals in AE quota |
| Expansion vs new-logo | NRR model | Expansion is usually a separate motion/owner; don't load it onto new-logo AEs |

**Territory design principles:**
- **Balance by potential, not count** — score each territory's TAM (target accounts × ICP fit × whitespace/expansion headroom) and aim for similar *expected pipeline*, not equal account counts.
- **Account for existing relationships** — don't reassign active opportunities; carve around in-flight deals.
- **Minimize disruption from churn** — keep at-risk renewals with the owning rep/CSM through the renewal.
- **Geographic/segment clustering** only where it reduces real friction (timezone, language, field travel); for inside sales, cluster by vertical or persona instead.
- **Review quarterly** — territories drift as markets, headcount, and product change; rebalance with the TAM score, not gut feel.

**Ramp schedule:**

| Month | % of full quota | Expectation |
|-------|----------------|-------------|
| 1-2 | 0% | Training, shadowing, certification |
| 3 | 25% | First qualified meetings |
| 4 | 50% | First deals in pipeline |
| 5 | 75% | First closed deals |
| 6+ | 100% | Fully ramped |

### 5. Handoff Processes

**Marketing → SDR (MQL handoff):**
```
Trigger: Lead score ≥ MQL threshold
Data passed: Lead source, content consumed, pages visited, company info, score breakdown
SDR action: Research (5 min) → personalized outreach within 1 hour
Feedback loop: SDR marks SAL accepted/rejected with reason → Marketing adjusts scoring
```

**SDR → AE (SAL handoff):**
```
Trigger: Discovery call completed, BANT confirmed
Data passed: Pain points, budget range, timeline, decision process, competitors
AE action: Review notes → demo prep → schedule demo within 3 days
Handoff format: Warm intro email (SDR introduces AE + summarizes conversation)
```

**AE → CS (Closed Won handoff):**
```
Trigger: Contract signed
Data passed: Contract terms, use case, success criteria, stakeholders, technical requirements
CS action: Onboarding kickoff within 48 hours
Handoff format: Internal doc + joint call (AE + CS + customer)
```

### 6. Tech Stack Audit

**Core RevOps stack (mid-2026 naming — verify current product names/pricing at each vendor's site before standardizing):**

| Layer | Tools (2026) | Purpose / notes |
|-------|------|---------|
| CRM | Salesforce, HubSpot | System of record. Salesforce for complex/enterprise process; HubSpot for speed + bundled marketing/ops. |
| Engagement / sequencing | Salesloft, Outreach, HubSpot Sales | Multi-touch cadences, dialer, task automation. |
| Conversation intelligence | Gong, **ZoomInfo Chorus** (formerly standalone Chorus.ai), Salesloft/Clari Copilot | Call recording, AI call summaries, deal/risk signals, auto-CRM-logging. Use the AI summaries to enforce next-step + MEDDIC field hygiene. |
| Enrichment | **HubSpot Breeze Intelligence** (the former Clearbit — acquired by HubSpot 2023, rebranded 2024; standalone Clearbit API is wound down), ZoomInfo, Apollo, **Clay** (waterfall enrichment across many providers) | Contact/company/firmographic + intent data. Budget for **per-credit cost**: enrichment and intent are usage-priced, so meter credit burn per enriched record and cap auto-enrichment to ICP-fit leads. |
| Account/PLG signals | Common Room, June, Pocus, HubSpot/SFDC product-usage objects | Capture **product-led sales (PLS)** signals — activation, usage thresholds, multiple users on one domain — and surface PQAs (product-qualified accounts) to sales. |
| Routing / scheduling | **LeanData, Chili Piper, Default, RevenueHero** | Lead-to-account matching, round-robin/territory assignment, instant inbound meeting booking. This is what actually delivers your <5-min speed-to-lead SLA. |
| Reverse ETL / warehouse-native | **Hightouch, Census** (sync from Snowflake/BigQuery/Databricks → CRM & tools) | Warehouse-native GTM: model lead scores, PQLs, health, and attribution in the warehouse (dbt) as the source of truth, then sync to operational tools. Increasingly the backbone for scaling RevOps. |
| Attribution | HubSpot, Dreamdata, HockeyStack, warehouse + dbt models | Multi-touch attribution; prefer warehouse-modeled attribution once volume justifies it. |
| BI / dashboards | Looker, Metabase, Omni, Hex | Cross-functional reporting on one governed dataset. |
| Forecasting / RevOps platform | Clari, BoostUp, Gong Forecast | Roll-up forecasting, pipeline inspection, scenario/coverage analysis. |
| Communication | Slack/Teams + CRM integration | Deal alerts, routing notifications, forecast nudges. |

**AI/data hygiene & privacy (2026):**
- **AI-assisted CRM hygiene** — conversation-intelligence and CRM-AI features (Gong, Breeze, Einstein, Clari) auto-fill next steps, contact roles, and competitor mentions from calls/emails. Treat them as *assistive*: spot-check accuracy and keep a human owner for stage/forecast-category changes.
- **Privacy/consent** — enrichment and intent data are subject to GDPR/CCPA and the EU AI Act. Keep a lawful basis + suppression list for enriched contacts, honor opt-outs across all tools, and don't sync sensitive personal data into systems that don't need it.

**Audit checklist:**
- [ ] One clear system of record per object (account, contact, opportunity); no duplicate sources of truth
- [ ] Data flows are integrated/automated (or warehouse-synced via reverse ETL) — minimal manual re-entry between systems
- [ ] Reporting pulls from one governed dataset (not multiple conflicting dashboards)
- [ ] Routing + speed-to-lead automation actually enforces the SLA (measure, don't assume)
- [ ] Enrichment/intent **credit burn** is metered and capped to ICP-fit records
- [ ] Consent/suppression is honored across every tool that stores contact data
- [ ] **Tooling cost is benchmarked against the right denominator, not a flat % of ARR.** A flat "<15% of ARR" rule is misleading: early-stage teams run high (small ARR base), efficient scale-ups land far lower, and enterprise stacks vary widely. Evaluate stack spend against **gross margin, S&M efficiency (CAC payback, magic number), headcount leverage (ARR per GTM head), and measurable pipeline impact** — and kill tools with no attributable usage or pipeline contribution.

### 7. RevOps Metrics Dashboard

| Metric | Cadence | Target |
|--------|---------|--------|
| Pipeline coverage ratio | Weekly | 3-4x quarterly target |
| Win rate | Monthly | 20-30% |
| Average sales cycle | Monthly | Track trend, reduce 10% YoY |
| CAC payback | Monthly | < 12 months |
| Net revenue retention | Monthly | > 110% |
| Forecast accuracy | Monthly | ±10% |
| Speed to lead | Real-time | < 5 minutes |
| Pipeline created per rep | Weekly | Even distribution |

**Metric definitions (be explicit — most disagreements are definitional, not numeric):**

| Metric | Formula | Watch-outs |
|--------|---------|-----------|
| Pipeline coverage | `open weighted-or-raw pipeline closing this period / quota for the period` | State whether it's raw or weighted; 3–4× is a rough target only if win rate ≈ 25–33%. Coverage you can't *create in time* is fiction. |
| Stage conversion | `# reaching stage N+1 / # entering stage N` (cohort-based) | Cohort by *entry period*, not a point-in-time snapshot, or open deals distort it. Segment by ACV/source. |
| Win rate | `closed-won / (closed-won + closed-lost)` | Decide if "no decision/disqualified" counts as a loss — it changes the number a lot. |
| Sales-cycle length | `median(close_date − opportunity_created_at)` for closed-won | Use **median**, not mean (a few mega-deals skew the mean); segment by ACV. |
| Sales velocity | `(# open opps × avg deal value × win rate) / avg sales-cycle days` | The single best "are we speeding up or slowing down?" summary; track the trend per segment. |
| CAC payback | `CAC / (new MRR × gross margin %)` → months | Use *gross-margin-adjusted* new MRR, not raw revenue. Fully-loaded S&M for CAC. |
| Magic number | `(ΔARR over the quarter × 4) / prior-quarter S&M spend` | >0.75 → efficient, fund growth; <0.5 → fix efficiency before scaling spend. |
| GRR | `(starting ARR − churn − contraction) / starting ARR` | Caps at 100%; isolates pure retention from expansion. Healthy: >90% (SMB) to >95% (enterprise). |
| NRR | `(starting ARR − churn − contraction + expansion) / starting ARR` | Same cohort, no new logos. >110% is strong; report GRR alongside so expansion doesn't mask churn. |

**Reference SQL (Postgres/warehouse flavor — adapt table/column names):**
```sql
-- (a) Pipeline coverage for the current quarter (weighted), by owner
SELECT o.owner,
       SUM(o.amount)                                   AS raw_pipeline,
       SUM(o.amount * s.stage_win_prob)                AS weighted_pipeline,
       q.quota,
       ROUND(SUM(o.amount * s.stage_win_prob) / NULLIF(q.quota, 0), 2) AS weighted_coverage_x
FROM opportunities o
JOIN stage_probabilities s ON s.stage = o.stage          -- your own historical win prob per stage
JOIN quotas q ON q.owner = o.owner AND q.period = date_trunc('quarter', CURRENT_DATE)
WHERE o.is_open
  AND o.close_date >= date_trunc('quarter', CURRENT_DATE)
  AND o.close_date <  date_trunc('quarter', CURRENT_DATE) + INTERVAL '3 months'
GROUP BY o.owner, q.quota;

-- (b) Sales velocity + median cycle for last 90 days of closed-won, by segment
SELECT acv_band,
       COUNT(*) FILTER (WHERE stage = 'Closed Won')                         AS won,
       percentile_cont(0.5) WITHIN GROUP (
         ORDER BY (close_date - created_at)) FILTER (WHERE stage = 'Closed Won') AS median_cycle_days,
       AVG(amount) FILTER (WHERE stage = 'Closed Won')                      AS avg_deal,
       ROUND(100.0 * COUNT(*) FILTER (WHERE stage = 'Closed Won')
             / NULLIF(COUNT(*) FILTER (WHERE stage IN ('Closed Won','Closed Lost')), 0), 1) AS win_rate_pct
FROM opportunities
WHERE close_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY acv_band;

-- (c) NRR / GRR for a fixed starting cohort over the trailing 12 months
WITH base AS (
  SELECT account_id, arr AS start_arr
  FROM account_arr_snapshot
  WHERE snapshot_date = CURRENT_DATE - INTERVAL '12 months'
),
now_arr AS (
  SELECT account_id, arr AS end_arr
  FROM account_arr_snapshot
  WHERE snapshot_date = CURRENT_DATE
)
SELECT
  ROUND(100.0 * SUM(LEAST(COALESCE(n.end_arr,0), b.start_arr)) / NULLIF(SUM(b.start_arr),0), 1) AS grr_pct,
  ROUND(100.0 * SUM(COALESCE(n.end_arr,0))                    / NULLIF(SUM(b.start_arr),0), 1) AS nrr_pct
FROM base b
LEFT JOIN now_arr n USING (account_id);   -- accounts that fully churned have no row in now_arr

-- (d) New-pipeline / bookings sourced by channel (attribution), last quarter
SELECT source_channel,
       COUNT(*)                                              AS opps_created,
       SUM(amount) FILTER (WHERE stage = 'Closed Won')       AS won_arr,
       SUM(amount) FILTER (WHERE is_open)                    AS open_pipeline
FROM opportunities
WHERE created_at >= date_trunc('quarter', CURRENT_DATE) - INTERVAL '3 months'
  AND created_at <  date_trunc('quarter', CURRENT_DATE)
GROUP BY source_channel
ORDER BY won_arr DESC NULLS LAST;
```

Govern these in one place (warehouse + dbt, or your BI semantic layer) so every team reads the same number; conflicting dashboards are the most common RevOps failure mode.

---

**Related skills:** for CRM data model, object hygiene, and automation see `crm-operations`; for top-of-funnel demand generation and channel strategy see `customer-acquisition`.

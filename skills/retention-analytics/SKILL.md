---
name: retention-analytics
description: "Churn analysis, cohort retention (classic/rolling/bracket + revenue retention/NRR), health scoring with calibration, churn-risk SQL, and win-back strategies for SaaS. Use when measuring retention/churn, building cohort or NRR reports, calibrating a customer health score, finding at-risk accounts, or designing win-back campaigns."
---

# Retention Analytics

## Workflow

### 1. Cohort Retention Analysis

**Pick a retention definition first — they answer different questions and are NOT comparable:**

| Definition | Counts a user retained in period N if they… | Use for |
|------------|---------------------------------------------|---------|
| **Classic / Nth-day (return)** | were active in *exactly* that period | Apps with an expected cadence (daily/weekly); strict, drops fast |
| **Rolling / unbounded** | were active in period N *or any later* period | Reduces noise; "still alive by now" — best for irregular usage |
| **Bracket / range** | were active *anytime within a window* (e.g. days 7–13) | Smooths out daily volatility; standard for weekly/monthly views |
| **Revenue retention (NRR/GRR)** | $ from the cohort, not user count | Subscription/account health, board reporting (see §6) |

The query below uses **classic** (exact-period) retention. To convert it to **rolling**, change `a.active_week = c.cohort + INTERVAL 'N weeks'` to `a.active_week >= c.cohort + INTERVAL 'N weeks'`. For **bracket** weekly retention the per-week match is already a 1-week bracket; widen it (e.g. `BETWEEN`) for monthly brackets.

**SQL — classic weekly retention cohorts:**
```sql
WITH cohorts AS (
  SELECT user_id, DATE_TRUNC('week', created_at) AS cohort
  FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
),
activity AS (
  SELECT DISTINCT user_id, DATE_TRUNC('week', event_time) AS active_week
  FROM events WHERE event = 'session_start'
)
SELECT
  c.cohort,
  COUNT(DISTINCT c.user_id) AS cohort_size,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN a.active_week = c.cohort + INTERVAL '1 week' THEN c.user_id END) / COUNT(DISTINCT c.user_id), 1) AS w1_pct,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN a.active_week = c.cohort + INTERVAL '2 weeks' THEN c.user_id END) / COUNT(DISTINCT c.user_id), 1) AS w2_pct,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN a.active_week = c.cohort + INTERVAL '4 weeks' THEN c.user_id END) / COUNT(DISTINCT c.user_id), 1) AS w4_pct,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN a.active_week = c.cohort + INTERVAL '8 weeks' THEN c.user_id END) / COUNT(DISTINCT c.user_id), 1) AS w8_pct
FROM cohorts c
LEFT JOIN activity a ON c.user_id = a.user_id
GROUP BY c.cohort ORDER BY c.cohort;
```

Caution: cohorts younger than N weeks show 0% for wN_pct (right-censoring). NULL those cells or filter immature cohorts before reading the table.

**SQL — rolling retention (active in week N OR later), more forgiving:**
```sql
WITH cohorts AS (
  SELECT user_id, DATE_TRUNC('week', created_at) AS cohort
  FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
),
activity AS (
  SELECT DISTINCT user_id, DATE_TRUNC('week', event_time) AS active_week
  FROM events WHERE event = 'session_start'
)
SELECT
  c.cohort,
  COUNT(DISTINCT c.user_id) AS cohort_size,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN a.active_week >= c.cohort + INTERVAL '4 weeks' THEN c.user_id END) / COUNT(DISTINCT c.user_id), 1) AS rolling_w4_pct,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN a.active_week >= c.cohort + INTERVAL '8 weeks' THEN c.user_id END) / COUNT(DISTINCT c.user_id), 1) AS rolling_w8_pct
FROM cohorts c
LEFT JOIN activity a ON c.user_id = a.user_id
GROUP BY c.cohort ORDER BY c.cohort;
```

Caution: cohorts younger than N weeks show 0% for rolling_wN_pct (right-censoring). NULL those cells or filter immature cohorts before reading the table.

**Retention benchmarks — segment before you compare.** There is no single "good" curve; the right target depends on your motion, ACV, and natural usage cadence. The ranges below are directional rules of thumb (as of mid-2026, no single authoritative source — calibrate against your own historical cohorts before setting goals):

| Motion / segment | W1 (return) | M1 | M3 | M12 | Notes |
|------------------|-------------|-----|-----|-----|-------|
| **PLG / self-serve** | 30–45% | 20–30% | 12–20% | 8–15% | Free signups inflate denominators; segment activated vs not |
| **SMB B2B (annual)** | 50–65% | 40–55% | 30–45% | logo ~70–85%/yr | Seat-based; watch contract cycles, not weekly logins |
| **Enterprise B2B** | n/a (low DAU) | n/a | usage-based health | logo >90%/yr | Login frequency is a weak signal; track deployment/value milestones |
| **Usage-based pricing** | track $ consumed | — | — | NRR-driven | A quiet but spending account is healthy; weight usage \$ over logins |
| **Consumer subscription** | 45–60% | 25–40% | 15–25% | 10–20% | High early churn is normal; "smile curve" resurrection matters |
| **Prosumer / vertical SaaS** | varies by cadence | — | — | — | Match the window to expected usage (weekly tool ≠ daily tool) |

**If W1 return retention is below your segment band:** Activation problem: fix onboarding / time-to-first-value (§3).
**If early retention is fine but M3 drops:** Value-delivery problem — users aren't finding ongoing value or the use case was one-off.
**Always read the cohort *curve shape*, not one number:** a flattening tail (the curve asymptotes above zero) signals a sticky core; a curve trending to zero signals no durable value regardless of how high W1 starts.

### 2. Customer Health Score

**Composite score (0-100) — STARTING TEMPLATE, not a law.** Weights vary enormously by product, plan tier, and company maturity (an enterprise account with low login frequency but high deployment can be perfectly healthy; a usage-based account should weight \$ consumed over seats). Treat these as a v0 to calibrate, not ship as-is:

| Signal | Weight | Scoring |
|--------|--------|---------|
| Product usage frequency | 25% | Daily=100, Weekly=60, Monthly=30, None=0 |
| Feature breadth | 20% | % of key features used in last 30d |
| Support tickets | 15% | 0=100, 1-2=70, 3+=30 (inverse) |
| NPS response | 15% | Promoter=100, Passive=50, Detractor=0 |
| License utilization | 15% | % of seats/capacity used |
| Billing health | 10% | Current=100, Late=30, Failed=0 |

**Calibrate the weights against real outcomes — do not trust defaults:**
1. **Backtest.** Take accounts that churned vs renewed over the last 2–4 quarters. Score each on a date *before* the outcome (e.g. 90 days prior) to avoid leakage. A useful score separates the two groups.
2. **Measure, don't eyeball.** Bucket accounts into risk deciles by score and check **precision/recall** of the "at-risk" tiers and **lift** (churn rate in the bottom decile ÷ base churn rate). Aim for the score to concentrate most churn in the bottom 2–3 deciles.
3. **Fit the weights.** Start with the template, then fit a simple **logistic regression** (or gradient-boosted model) of `churned ~ signals` on history and use standardized coefficients to reset weights. Re-fit quarterly — drivers drift.
4. **Segment.** Maintain **separate models/weights per ICP and plan** (PLG self-serve vs enterprise vs usage-based). One global model usually underperforms; cite which segment a score applies to.
5. **Watch leakage & circularity.** Don't feed in signals that are effectively the outcome (e.g. "submitted cancellation"). Exclude renewal-date proximity from the score itself if you also alert on it separately.

**Health tiers (re-tune the cut points to your calibrated precision/recall):**

| Score | Tier | Action |
|-------|------|--------|
| 80-100 | Healthy | Expansion opportunity — upsell |
| 60-79 | Neutral | Monitor — check in monthly |
| 40-59 | At risk | Proactive outreach — CS call within 7 days |
| 0-39 | Critical | Immediate intervention — executive sponsor call |

### 3. Churn Prediction Signals

**Early warning signals (14-30 days before churn):**

| Signal | Detection | Risk level |
|--------|-----------|-----------|
| Login frequency dropped 50%+ | Compare 7d avg vs 30d avg | High |
| Key feature usage stopped | Zero events on core features | High |
| Support ticket with negative sentiment | NLP on ticket text | Medium |
| Admin user inactive > 14 days | Activity tracking | High |
| Failed payment not resolved in 7 days | Billing system | Critical |
| Competitor mentioned in support | Keyword detection | Medium |
| Contract renewal < 60 days + low health | Health score + contract date | High |

**SQL — at-risk detection:**
```sql
SELECT
  u.user_id,
  u.company_name,
  u.plan,
  u.contract_end,
  COALESCE(recent.sessions_7d, 0) AS sessions_last_7d,
  COALESCE(prior.sessions_7d, 0) AS sessions_prior_7d,
  CASE
    WHEN COALESCE(recent.sessions_7d, 0) = 0 THEN 'critical'
    WHEN recent.sessions_7d < prior.sessions_7d * 0.5 THEN 'high_risk'
    WHEN recent.sessions_7d < prior.sessions_7d * 0.75 THEN 'medium_risk'
    ELSE 'healthy'
  END AS risk_level
FROM users u
LEFT JOIN (
  SELECT user_id, COUNT(*) AS sessions_7d
  FROM events WHERE event = 'session_start' AND event_time >= CURRENT_DATE - 7
  GROUP BY user_id
) recent ON u.user_id = recent.user_id
LEFT JOIN (
  SELECT user_id, COUNT(*) AS sessions_7d
  FROM events WHERE event = 'session_start' AND event_time BETWEEN CURRENT_DATE - 14 AND CURRENT_DATE - 7
  GROUP BY user_id
) prior ON u.user_id = prior.user_id
WHERE u.status = 'active'
-- Do NOT sort by the string label: `ORDER BY risk_level DESC` sorts
-- lexicographically (medium_risk > high_risk > critical), burying the worst
-- accounts. Sort by explicit severity rank instead.
-- (PostgreSQL only allows output aliases like risk_level unadorned in ORDER BY,
-- not inside an expression, so repeat the conditions here.)
ORDER BY
  CASE
    WHEN COALESCE(recent.sessions_7d, 0) = 0 THEN 1
    WHEN recent.sessions_7d < prior.sessions_7d * 0.5 THEN 2
    WHEN recent.sessions_7d < prior.sessions_7d * 0.75 THEN 3
    ELSE 4
  END,
  u.contract_end ASC NULLS LAST;
```

**Avoid false positives — most "churn signals" are seasonality, not churn.** Before alerting, normalize for:

| Confounder | Why it false-alarms | Mitigation |
|------------|---------------------|------------|
| Weekends / holidays | B2B usage drops Fri–Sun and over holiday weeks | Compare same-day-of-week / exclude holidays; use week-over-week, not raw day-over-day |
| Seasonality | Retail/edu/finance have predictable lulls (summer, year-end) | Compare YoY or against the account's own baseline, not a flat threshold |
| Seat / license changes | A team offboarding 3 seats looks like decline but may be reorg | Normalize usage per active seat; treat seat churn as its own signal |
| Annual contract cadence | Annual accounts log in rarely between value milestones | For annual/enterprise, track deployment & milestone signals, not weekly logins |
| Reporting gaps | Pipeline/SDK outage = zero events ≠ zero usage | Check event-volume health before trusting a "0 sessions" alert |
| New-account ramp | New accounts haven't onboarded yet, not "declining" | Exclude accounts younger than your activation window from decline alerts |

**Activation metrics (define the "aha" first — retention is downstream of activation).** Examples of a measurable activation event by product type: *collaboration tool* → invited ≥1 teammate AND created ≥1 doc in week 1; *analytics tool* → connected a data source AND viewed a report; *API/dev tool* → first successful authenticated API call in production; *fintech* → completed KYC AND first transaction. Track **% of new accounts reaching activation** and **time-to-activation**; segment all retention curves by activated-vs-not, because un-activated signups dominate and distort PLG retention.

### 4. Win-Back Campaigns

**Timing sequence:**

| Day after churn | Channel | Message |
|----------------|---------|---------|
| 1 | Email | "We're sorry to see you go" + feedback survey |
| 7 | Email | "Here's what you're missing" + new feature highlight |
| 30 | Email | "Come back" + incentive (discount, extended trial, free month) |
| 60 | Email | Final offer + case study of returning customer |
| 90 | Email | "Door's always open" — no offer, just warm close |

**Win-back incentive tiers:**

| Customer value | Incentive |
|---------------|-----------|
| High LTV (top 20%) | Personal call from CS + custom offer |
| Medium LTV | 20-30% discount for 3 months |
| Low LTV | Free month or extended trial |
| Free plan churn | Feature highlight email only (no discount) |

**Win-back benchmarks:** Expect 5-15% of churned customers to return within 90 days with active win-back. 2-5% without any effort.

### 5. NPS & Satisfaction

**NPS survey timing:**
- After onboarding (day 14-30)
- Quarterly for active customers
- After major interaction (support resolution, feature launch)
- Never during billing issues or outages

**NPS action framework:**

| Score | Segment | Action |
|-------|---------|--------|
| 9-10 | Promoter | Request review/referral, case study candidate |
| 7-8 | Passive | Ask what would make it a 10, feature request capture |
| 0-6 | Detractor | CS outreach within 24h, root cause analysis |

### 6. Revenue Retention (NRR / GRR)

Logo/user retention can look healthy while revenue bleeds (or vice versa). For any subscription business, **revenue retention is the headline metric**.

- **GRR (Gross Revenue Retention)** = retained recurring revenue from a starting cohort, **excluding** any expansion. Caps at 100%; measures pure leakage (churn + contraction).
- **NRR (Net Revenue Retention)** = GRR **plus** expansion (upsell/cross-sell/seat growth) from the same cohort. Can exceed 100%; the gold-standard growth-efficiency signal.

Both are **cohort-anchored**: compare period-N MRR to the *same accounts'* starting MRR — never to total MRR (which mixes in new logos).

**SQL — NRR & GRR from a monthly subscription snapshot table** (`mrr_monthly(account_id, month, mrr)`), comparing each cohort month to 12 months later:
```sql
WITH base AS (
  SELECT account_id, month AS start_month, mrr AS start_mrr
  FROM mrr_monthly
  WHERE month = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')
),
later AS (
  SELECT account_id, mrr AS end_mrr
  FROM mrr_monthly
  WHERE month = DATE_TRUNC('month', CURRENT_DATE)
)
SELECT
  SUM(b.start_mrr) AS starting_mrr,
  -- GRR: retained revenue capped per account at its starting MRR (no expansion credit)
  ROUND(100.0 * SUM(LEAST(COALESCE(l.end_mrr, 0), b.start_mrr)) / NULLIF(SUM(b.start_mrr), 0), 1) AS grr_pct,
  -- NRR: full ending revenue from the same cohort (expansion counts, capped denom = start)
  ROUND(100.0 * SUM(COALESCE(l.end_mrr, 0)) / NULLIF(SUM(b.start_mrr), 0), 1) AS nrr_pct
FROM base b
LEFT JOIN later l ON b.account_id = l.account_id;
```

### 7. Retention Metrics Dashboard

Targets are **segment-dependent** (the figures below are common public mid-2026 rules of thumb, not universal — set yours from your own history and benchmark against your category):

| Metric | Cadence | Directional target | Segment caveat |
|--------|---------|--------------------|----------------|
| Logo retention | Monthly | > 95%/mo (SMB) → ~99%/mo (enterprise) | PLG/free tiers run far lower; segment by paid |
| Net revenue retention (NRR) | Monthly/Qtrly | > 100% floor; ~110%+ strong; 120%+ best-in-class | Enterprise/usage-based skew higher; SMB lower |
| Gross revenue retention (GRR) | Monthly/Qtrly | > 90% (caps at 100%) | Enterprise often >90%; SMB/consumer lower |
| Time to first value (activation) | Per cohort | As short as the use case allows | "<24h" only fits self-serve; enterprise = days/weeks |
| DAU/MAU (stickiness) | Weekly | > 40% = sticky, *for daily-use products* | Meaningless for weekly/monthly-cadence or enterprise tools |
| Support ticket CSAT | Weekly | > 90% | — |
| Health score distribution | Weekly | < 20% in at-risk/critical | After §2 calibration, not raw |

### 8. Modern Warehouse & Tooling Patterns (2026)

Don't compute these metrics with ad-hoc, drifting SQL — govern them:

- **Semantic / metric layer (dbt Semantic Layer, Cube, or warehouse-native):** define `nrr`, `grr`, `logo_retention`, and your activation event **once** as governed metrics so BI tools, CS tooling, and notebooks return identical numbers. Kills the "every dashboard says a different NRR" problem. Verify current dbt MetricFlow / Semantic Layer syntax in the dbt docs (it has changed across versions).
- **Event modeling:** transform raw events with **dbt** (or SQLMesh) into clean `fct_sessions` / `fct_subscription_events` marts; build cohort and health models on the marts, not raw logs. Snapshot subscription state monthly (`mrr_monthly` above) so NRR/GRR are reproducible.
- **Reverse ETL → operational tools:** sync health scores and at-risk flags from the warehouse back into your CRM/CS platform (e.g. via Census or Hightouch) so CSMs act on the same numbers analysts see — closing the loop from §2/§3 to §4.
- **Product analytics:** Amplitude / PostHog / Mixpanel for self-serve cohort/retention curves and funnels; reconcile their definitions (often *bracket/rolling*) against your warehouse classic numbers so leadership isn't comparing apples to oranges.
- **Privacy-aware event governance:** maintain a **tracking plan / event schema** (e.g. Avo, RudderStack, Snowplow), honor consent and regional rules (GDPR/CCPA and successors), minimize PII in the event stream (hash/pseudonymize user identifiers, keep PII out of event properties), and document retention/deletion so cohort tables don't become a compliance liability. Confirm current regulatory obligations with counsel for your jurisdictions.

For acquisition-side funnels and web/app traffic cohorts, see the sibling `google-analytics` skill; this skill focuses on post-signup retention, revenue retention, and account health.

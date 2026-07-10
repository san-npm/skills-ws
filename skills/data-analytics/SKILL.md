---
name: data-analytics
description: "BI metric definitions, warehouse SQL (funnels, cohorts, retention, LTV, churn), experimentation, dashboard design, and data storytelling. Use when defining/reviewing KPIs, writing or auditing analytical SQL, modeling a semantic layer, analyzing cohorts/funnels/experiments, or turning data into an executive recommendation."
---

# Data Analytics

## Workflow

### 1. Define the Question

Before writing any query, articulate:
- **What decision** will this analysis inform?
- **What metric** answers the question?
- **What timeframe** is relevant?
- **What segments** matter?

Bad: "How are we doing?" → Good: "What's our 30-day retention rate by acquisition channel for Q1 cohorts?"

### 2. KPI Framework Selection

| Framework | Best for | Core metrics |
|-----------|----------|-------------|
| AARRR (Pirate) | Growth-stage SaaS | Acquisition, Activation, Retention, Revenue, Referral |
| HEART | Product/UX teams | Happiness, Engagement, Adoption, Retention, Task success |
| NSM (North Star) | Company alignment | One metric that captures core value delivery |
| OKR | Goal tracking | Objectives + measurable Key Results |

**Choose NSM first, then AARRR for operational metrics, HEART for product teams.**

### 2b. Define the Metric Before You Query It

Most "the numbers don't match" fights are definition fights, not SQL bugs. Write a one-page **metric spec** and store it in version control (ideally as a semantic-layer definition, below) so every dashboard computes the same thing.

| Field | Example (Weekly Active Account) |
|---|---|
| **Name / owner** | Weekly Active Account — owned by Growth analytics |
| **Grain** | One row per account per ISO week |
| **Numerator** | Distinct accounts with ≥1 `session_start` |
| **Denominator** | (rate metrics only) eligible accounts that week |
| **Filters** | `is_internal = false`, `plan != 'trial_expired'` |
| **Exclusions** | Bots, internal/staff users, test accounts, refunded orders |
| **Timezone** | UTC week boundaries (`WEEK(MONDAY)`) |
| **Refresh cadence** | Daily 06:00 UTC; closed week is final after +2 days (late events) |
| **Source tables** | `fct_sessions`, `dim_accounts` |
| **Known caveats** | Single-sign-on shares one account across users; counts accounts not seats |

**Semantic layer / metrics-as-code (mid-2026).** Define metrics once and let BI tools query them, so "revenue" can't mean three things:
- **dbt Semantic Layer** (powered by MetricFlow): declare `semantic_models` and `metrics` in YAML; consumers query via the JDBC/GraphQL API or the dbt CLI (formerly the dbt Cloud CLI), e.g. `dbt sl query --metrics revenue --group-by metric_time__month`. The legacy `dbt_metrics` package is deprecated; use MetricFlow.
- **Cube, Looker (LookML), Lightdash, MetricFlow, Malloy** are the common alternatives; pick one and treat metric definitions as reviewed code.
- Net effect: the SQL patterns below are how a metric is *implemented once* in the semantic layer or a dbt model — not copy-pasted into every dashboard.

Example dbt/MetricFlow metric (YAML):
```yaml
metrics:
  - name: weekly_active_accounts
    label: Weekly Active Accounts
    type: simple
    type_params:
      measure: distinct_active_accounts   # COUNT(DISTINCT account_id) on fct_sessions
    filter: "{{ Dimension('account__is_internal') }} = false"
```

### 2c. Data Quality Checks (run before you trust any number)

Bad data silently produces confident-looking dashboards. Gate your models with tests (dbt `data_tests:`/`unit_tests:` (the `tests:` key is the pre-1.8 spelling and still accepted as an alias), or `dbt_utils`/`elementary` packages, or Great Expectations / Soda) covering:

| Check | What it catches | Example assertion |
|---|---|---|
| **Uniqueness** | Fan-out joins, double-counting | `account_id` unique in `dim_accounts` |
| **Not-null** | Broken upstream mapping | `event`, `created_at` never null |
| **Referential integrity** | Orphan events | every `events.account_id` exists in `dim_accounts` |
| **Freshness** | Stale pipeline | `max(created_at) >= now() - 24h` |
| **Volume anomaly** | Outage / firehose | daily event count within ±N σ of trailing mean |
| **Duplicate events** | Client retries, double-fire | dedupe on `(event_id)` or `(user_id, event, ts)` |
| **Late-arriving events** | Counts that change after the fact | mark recent windows "preliminary"; reconcile after +2 days |
| **Bot / internal traffic** | Inflated activation/conversion | exclude staff IPs, datacenter UAs, known crawlers, internal accounts |

When using AI-assisted BI ("ask your data" / text-to-SQL in Snowflake Cortex, Databricks Genie, dbt/Looker assistants), point it at the **governed semantic layer**, not raw tables, and **always inspect the generated SQL and row counts** against a known-good number before sharing — these tools confidently produce plausible-but-wrong joins and silently drop filters.

### 3. SQL Patterns

**Funnel analysis (ordered, with conversion window).** A common bug is checking only *whether* each event fired in a window — that lets a purchase that happened *before* signup count as "converted." A correct funnel derives the **first timestamp per stage** and enforces **monotonically increasing timestamps** within a **conversion window** (here 7 days). Segment by acquisition channel so you can compare drop-off.

```sql
WITH stages AS (
  SELECT
    s.user_id,
    s.channel,
    MIN(CASE WHEN e.event = 'signup'               THEN e.created_at END) AS t_signup,
    MIN(CASE WHEN e.event = 'onboarding_complete'  THEN e.created_at END) AS t_onboard,
    MIN(CASE WHEN e.event = 'first_value_action'   THEN e.created_at END) AS t_activate,
    MIN(CASE WHEN e.event = 'purchase'             THEN e.created_at END) AS t_purchase
  FROM events e
  JOIN (                                               -- channel lives on first session
    SELECT DISTINCT ON (user_id) user_id, channel
    FROM sessions
    ORDER BY user_id, started_at
  ) s ON s.user_id = e.user_id  -- Postgres/DuckDB; elsewhere use a ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY started_at) = 1 subquery
  WHERE e.created_at >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY s.user_id, s.channel
),
funnel AS (
  SELECT
    user_id,
    channel,
    t_signup IS NOT NULL                                                   AS signed_up,
    -- each step must occur AFTER the prior step and WITHIN 7 days of signup:
    (t_onboard  >= t_signup   AND t_onboard  <= t_signup + INTERVAL '7 days') AS onboarded,
    (t_activate >= t_onboard  AND t_activate <= t_signup + INTERVAL '7 days') AS activated,
    (t_purchase >= t_activate AND t_purchase <= t_signup + INTERVAL '7 days') AS converted
  FROM stages
  WHERE t_signup IS NOT NULL
)
SELECT
  channel,
  COUNT(*)                                                       AS signups,
  COUNT(*) FILTER (WHERE onboarded)                              AS onboarded,
  COUNT(*) FILTER (WHERE onboarded AND activated)                AS activated,
  COUNT(*) FILTER (WHERE onboarded AND activated AND converted)  AS converted,
  ROUND(100.0 * COUNT(*) FILTER (WHERE onboarded) / COUNT(*), 1)                                  AS signup_to_onboard_pct,
  ROUND(100.0 * COUNT(*) FILTER (WHERE onboarded AND activated)
              / NULLIF(COUNT(*) FILTER (WHERE onboarded), 0), 1)                                  AS onboard_to_activate_pct,
  ROUND(100.0 * COUNT(*) FILTER (WHERE onboarded AND activated AND converted)
              / NULLIF(COUNT(*) FILTER (WHERE onboarded AND activated), 0), 1)                    AS activate_to_convert_pct
FROM funnel
GROUP BY channel
ORDER BY signups DESC;
```

Notes: `FILTER (WHERE …)` is standard SQL (Postgres, BigQuery, Snowflake, DuckDB); on engines without it use `SUM(CASE WHEN … THEN 1 ELSE 0 END)`. The cumulative `onboarded AND activated AND converted` guards enforce that a later stage only counts if all prior stages happened — this is what makes drop-off percentages trustworthy. For multi-path products, replace the fixed event list with a sessionized event sequence and `LAG()` to detect the *first* time the ordered pattern completes.

**Cohort retention (week index + retention %).** The naive version returns raw counts for a few cherry-picked weeks and omits week 0, so you can't read it as a triangle. Compute a **week index** (`activity_week - cohort_week`), include **week 0** (the cohort baseline = 100%), divide by cohort size to get **retention %**, and filter out tiny cohorts that produce noisy percentages. Truncate timestamps in a fixed timezone so users don't drift across week boundaries.

```sql
WITH cohort AS (              -- one row per user: their signup week
  SELECT
    user_id,
    DATE_TRUNC('week', MIN(created_at) AT TIME ZONE 'UTC') AS cohort_week
  FROM events
  WHERE event = 'signup'
  GROUP BY user_id
),
activity AS (                 -- distinct active weeks per user
  SELECT DISTINCT
    user_id,
    DATE_TRUNC('week', created_at AT TIME ZONE 'UTC') AS activity_week
  FROM events
  WHERE event = 'session_start'
),
cohort_sizes AS (
  SELECT cohort_week, COUNT(*) AS cohort_size
  FROM cohort GROUP BY cohort_week
),
retention AS (
  SELECT
    c.cohort_week,
    -- week index: 0 = signup week, 1 = next week, ...
    -- Cast to date first: in Postgres, date - date = integer days, but
    -- timestamp - timestamp = interval (which would break GROUP BY / BETWEEN).
    (a.activity_week::date - c.cohort_week::date) / 7 AS week_index,
    COUNT(DISTINCT c.user_id) AS retained
  FROM cohort c
  JOIN activity a
    ON a.user_id = c.user_id
   AND a.activity_week >= c.cohort_week           -- never count pre-signup activity
  GROUP BY c.cohort_week, week_index
)
SELECT
  r.cohort_week,
  s.cohort_size,
  r.week_index,
  r.retained,
  ROUND(100.0 * r.retained / s.cohort_size, 1) AS retention_pct
FROM retention r
JOIN cohort_sizes s USING (cohort_week)
WHERE s.cohort_size >= 50                          -- suppress noisy small cohorts
  AND r.week_index BETWEEN 0 AND 12
ORDER BY r.cohort_week, r.week_index;
```

**Dialect differences for the week-index math** (`activity_week - cohort_week`):
- **Postgres:** `date - date` returns an **integer number of days**, but `timestamp - timestamp` returns an **`interval`**, so cast the truncated weeks to `::date` (as above) before dividing by 7, or you'll be dividing an interval and break `GROUP BY`/`BETWEEN`. (DuckDB matches Postgres here: `date - date` is an integer day count, while `timestamp - timestamp` is an `INTERVAL`, so the `::date` cast works there too; `DATE_DIFF('day', cohort_week, activity_week) / 7` or `DATE_DIFF('week', cohort_week, activity_week)` are equivalent alternatives.)
- **BigQuery:** use `DATE_DIFF(a.activity_week, c.cohort_week, WEEK)`; truncate with `TIMESTAMP_TRUNC(ts, WEEK(MONDAY), 'UTC')` (the optional third argument sets the truncation timezone; UTC is the default). Note `TIMESTAMP()` only converts string, date, or datetime inputs, not an existing `TIMESTAMP`.
- **Snowflake:** use `DATEDIFF('week', c.cohort_week, a.activity_week)`; truncate with `DATE_TRUNC('week', ts)` and `CONVERT_TIMEZONE('UTC', ts)`.

To render a classic retention triangle, `PIVOT` (Snowflake/DuckDB/BigQuery) or `crosstab` (Postgres `tablefunc`) on `week_index`. If you need to show weeks where a cohort had *zero* activity (true gaps, not missing rows), cross-join cohorts to a generated week spine (`generate_series` / `GENERATE_DATE_ARRAY`) before the left join.

**Realized revenue to date (NOT LTV).** Summing historical payments gives *realized revenue per customer so far*; it is **not** LTV. It ignores future revenue, refunds, gross margin, discounts, and survivorship/censoring (active customers haven't finished spending; churned ones drag the average down). Label it accurately and net out refunds:

```sql
WITH monthly_revenue AS (
  SELECT
    user_id,
    DATE_TRUNC('month', payment_date) AS month,
    COALESCE(SUM(amount) FILTER (WHERE status = 'succeeded'), 0)
      - COALESCE(SUM(amount) FILTER (WHERE status = 'refunded'), 0) AS net_revenue
  FROM payments
  GROUP BY user_id, DATE_TRUNC('month', payment_date)
),
per_user AS (
  SELECT
    user_id,
    SUM(net_revenue)        AS realized_revenue,   -- revenue to date, net of refunds
    COUNT(DISTINCT month)   AS months_paid,
    MIN(month)              AS first_payment,
    MAX(month)              AS last_payment
  FROM monthly_revenue
  GROUP BY user_id
)
SELECT
  ROUND(AVG(realized_revenue), 2)                              AS avg_realized_revenue_to_date,
  ROUND(AVG(months_paid), 1)                                   AS avg_months_paid,
  ROUND(AVG(realized_revenue / NULLIF(months_paid, 0)), 2)     AS avg_arpa_monthly
FROM per_user;
```

**Predictive / subscription LTV.** For a subscription business, model LTV from ARPA, gross margin, and churn — don't extrapolate a historical sum:

| Quantity | Definition |
|---|---|
| **ARPA** | Average recurring revenue per account per period (monthly or annual). |
| **Gross margin %** | (Revenue − COGS: hosting, support, payment fees) ÷ Revenue. LTV should be *margin*, not revenue. |
| **Revenue churn** | Net MRR lost per period ÷ starting MRR (use **net revenue churn**, including expansion, for the truest picture). |
| **Discount rate** | Period cost of capital for DCF-style LTV (e.g. ~10%/yr → ~0.8%/mo). |

- **Simple (no discounting):**  `LTV = ARPA × Gross margin % ÷ Revenue churn rate`  (equivalently `ARPA × GM% × avg customer lifetime`, where lifetime ≈ `1 / churn`).
- **Discounted (DCF):**  `LTV = (ARPA × GM%) × (1 + d) / (1 + d − r)` for retention `r = 1 − churn` and per-period discount rate `d`.
- **Empirical (cohort survival):** sum each cohort's actual revenue across its observed life, fit/extrapolate the survival curve (e.g. geometric or BG/NBD for non-contractual), and apply gross margin. Most defensible for boards because it shows the curve, not a single multiplier.
- **Sanity check:** LTV:CAC ≥ 3:1 and CAC payback < 12 months are common SaaS guardrails. Always report which definition you used.

**Churn — pick the right definition first.** "No `session_start` in 30 days" is an *engagement* (activity-lapse) definition. It is **wrong** for many businesses:
- **Subscription / contractual:** churn = subscription cancelled or not renewed at term end (an annual customer is *not* churned just because they didn't log in for 30 days). Measure off the billing system, and prefer **revenue/net-revenue churn** over logo churn.
- **B2B / low-frequency / seasonal:** a fixed 30-day window flags healthy accounts. Set the threshold from the **observed inter-purchase/inter-session distribution** (e.g. 2–3× the median gap, or per-segment percentiles), and aggregate to the **account**, not the individual user.
- **Non-contractual e-commerce:** there's no hard cancel event — use a probabilistic "alive" model (BG/NBD) rather than a hard cutoff.

Activity-lapse query (engagement churn), with the threshold as an explicit, segment-aware parameter rather than a magic number:

```sql
WITH last_seen AS (
  SELECT
    account_id,                                   -- roll up to the account, not the user
    MAX(created_at) AS last_active
  FROM events
  WHERE event = 'session_start'
  GROUP BY account_id
)
SELECT
  account_id,
  last_active,
  (CURRENT_DATE - last_active::date) AS days_since_active,
  CASE
    WHEN CURRENT_DATE - last_active::date > 30 THEN 'lapsed'      -- "lapsed", not "churned"
    WHEN CURRENT_DATE - last_active::date > 14 THEN 'at_risk'
    ELSE 'active'
  END AS engagement_status
FROM last_seen
ORDER BY days_since_active DESC;
```

For **contractual revenue churn** in a period, prefer the billing tables:

```sql
-- Net MRR churn % for a month = (churned + contraction − expansion) / starting MRR
SELECT
  month,
  ROUND(100.0 * (churned_mrr + contraction_mrr - expansion_mrr)
              / NULLIF(starting_mrr, 0), 2) AS net_mrr_churn_pct
FROM mrr_movements         -- materialized from subscription events
ORDER BY month;
```

### 4. Dashboard Design

**Layout rules:**
- Top row: 3-4 KPI cards (current value + trend arrow + % change)
- Second row: Primary chart (line/area for trends, bar for comparisons)
- Third row: Breakdown tables or secondary charts
- Filters: Date range, segment, channel — always at top

**Chart selection:**
| Data type | Chart |
|-----------|-------|
| Trend over time | Line chart (area only if stacking parts of a whole) |
| Part of whole | 100% stacked bar; bar chart of the parts. Avoid pie/donut except ≤3 categories with very different sizes — humans compare angles/arcs poorly |
| Part of whole, over time | 100% stacked area or small multiples |
| Comparison across categories | Horizontal bar, sorted by value |
| Distribution | Histogram or box plot |
| Correlation | Scatter plot (add trend line / faceting) |
| Funnel stages | Funnel/bar chart with stage drop-off labels |
| Geographic | Choropleth map (or symbol map for raw counts) |

**Dashboard anti-patterns to avoid:**
- **No reference point.** A number with no comparison (prior period, target, benchmark) is not insight. Add deltas and sparklines.
- **Dual y-axes** to imply correlation — easily misleads; prefer indexed lines or small multiples.
- **Truncated/inconsistent axes** that exaggerate change; start bar-chart axes at zero.
- **Vanity metrics** (cumulative signups, total pageviews) that only go up — show rates, retention, and active counts instead.
- **Too many KPIs** — if everything is highlighted, nothing is. 3–5 cards max on the top row.
- **3-D charts, gauges, and rainbow palettes** that add ink without information (Tufte's data-ink ratio). Use a single accent color against neutral gray for the rest.

### 5. Statistical Analysis

**A/B test significance.** A bare p-value is not enough. Always report a **confidence interval on the absolute difference**, check **practical significance** (does the effect clear your minimum detectable effect / business threshold?), and **only read the result at the pre-planned sample size** — peeking inflates false positives badly.

```python
from scipy import stats

control_conversions, control_total = 120, 1000
variant_conversions, variant_total = 145, 1000

p1 = control_conversions / control_total
p2 = variant_conversions / variant_total
diff = p2 - p1

# Two-proportion z-test (pooled SE for the test)
p_pool = (control_conversions + variant_conversions) / (control_total + variant_total)
se_pool = (p_pool * (1 - p_pool) * (1/control_total + 1/variant_total)) ** 0.5
z_score = diff / se_pool
p_value = 2 * (1 - stats.norm.cdf(abs(z_score)))

# 95% CI on the ABSOLUTE difference (unpooled SE)
se_unpooled = (p1*(1-p1)/control_total + p2*(1-p2)/variant_total) ** 0.5
z_crit = stats.norm.ppf(0.975)
ci_low, ci_high = diff - z_crit*se_unpooled, diff + z_crit*se_unpooled

practical_threshold = 0.01   # require >= 1pp absolute lift to ship
print(f"Absolute lift: {diff*100:+.2f}pp  (rel: {(p2/p1 - 1)*100:+.1f}%)")
print(f"95% CI on absolute lift: [{ci_low*100:+.2f}pp, {ci_high*100:+.2f}pp]")
print(f"p-value: {p_value:.4f}")
print(f"Statistically significant: {'Yes' if p_value < 0.05 else 'No'}")
print(f"Practically significant: {'Yes' if ci_low > practical_threshold else 'No / inconclusive'}")
```

**Before you trust any test:**
- **Hit the planned sample size.** Decide the horizon up front (see sample-size calc below) and *don't stop early because it looks significant*. With fixed-horizon tests, peeking daily can push the real false-positive rate well above 5%.
- **Sequential / always-valid stats** if you must monitor continuously: use group-sequential boundaries (O'Brien–Fleming/Pocock) or always-valid p-values / confidence sequences (mSPRT) — the kind built into Optimizely Stats Engine, Eppo, Statsig, and GrowthBook. Don't read a naive fixed-horizon p-value mid-flight.
- **SRM (sample-ratio mismatch) check.** If you split 50/50 but observe e.g. 1000 vs 1080, run a chi-square goodness-of-fit; a tiny p-value (< 0.001) means the assignment/logging is broken — **debug, don't interpret the result.**
- **Guardrail metrics.** Watch latency, crashes, refunds, unsubscribes, support tickets. A win on the primary metric that tanks a guardrail is not a win.
- **Multiple comparisons.** Testing many variants or metrics inflates false positives — pre-register one primary metric, and correct secondary metrics (Bonferroni for a few; Benjamini–Hochberg FDR for many).
- **Novelty / primacy effects.** Early lift can decay; for behavior changes run ≥1–2 full business cycles (typically ≥1–2 weeks) and inspect the daily trend, not just the cumulative number.

**Sample size calculation.** Expose the choices that actually change the answer: one- vs two-sided, **absolute vs relative** MDE, and unequal allocation (`k = n_variant / n_control`). Decide MDE from what would be *worth shipping*, not from what's easy to detect.

```python
import math
from scipy.stats import norm

def sample_size(baseline_rate, mde, mde_relative=True, alpha=0.05,
                power=0.8, two_sided=True, allocation_ratio=1.0):
    """Per-arm sample size for a two-proportion test.
    mde: minimum detectable effect. If mde_relative, it's a fraction of baseline
         (0.10 = +10% relative); else it's absolute (0.01 = +1 percentage point).
    allocation_ratio k = n_variant / n_control.
    Returns (n_control, n_variant)."""
    z_alpha = norm.ppf(1 - alpha/2) if two_sided else norm.ppf(1 - alpha)
    z_beta  = norm.ppf(power)
    p1 = baseline_rate
    p2 = p1 * (1 + mde) if mde_relative else p1 + mde
    delta = abs(p2 - p1)
    k = allocation_ratio
    # unequal-allocation pooled variance (k=1 reduces to the balanced formula)
    pbar = (p1 + k * p2) / (1 + k)
    term_a = z_alpha * ((1 + 1/k) * pbar * (1 - pbar)) ** 0.5
    term_b = z_beta  * (p1*(1-p1) + p2*(1-p2)/k) ** 0.5
    n_control = ((term_a + term_b) / delta) ** 2
    n_control = math.ceil(n_control)
    return n_control, math.ceil(k * n_control)

nc, nv = sample_size(0.05, 0.10)                       # 5% baseline, +10% relative, two-sided
print(f"Two-sided, +10% rel: {nc} control / {nv} variant")
nc, nv = sample_size(0.05, 0.01, mde_relative=False)   # +1 percentage point absolute
print(f"Two-sided, +1pp abs: {nc} control / {nv} variant")
```

For **non-binary metrics** (revenue, session length, counts), this binomial formula doesn't apply — use a t-test/`tt_ind_solve_power` from `statsmodels.stats.power` and plug in the metric's **variance** (revenue is high-variance and heavy-tailed; consider winsorizing/capping or CUPED variance reduction). `statsmodels` (`NormalIndPower`, `proportion_effectsize`, `GofChisquarePower`) is the standard library for power analysis and the SRM chi-square check. Then translate per-arm `n` into **calendar duration** using your traffic rate, and round up to whole business cycles.

### 6. Data Storytelling

**Structure every analysis as:**
1. **Context** — Why are we looking at this? (1 sentence)
2. **Finding** — What did we discover? (lead with the insight, not the method)
3. **Evidence** — Show the chart/table that proves it
4. **Implication** — So what? What should we do?
5. **Recommendation** — Specific next action with expected impact

**Rules:**
- One insight per slide/section
- Annotate charts (mark events, callout anomalies)
- Compare to benchmarks or previous periods
- Quantify impact in dollars or users, not just percentages

**Executive readout (BLUF — bottom line up front).** Lead with the decision, then support it. Example:

> **Recommendation:** Shift Q3 paid budget from Display to Paid Search. *(decision first)*
> **Finding:** Paid Search converts trials to paid at 14% vs Display's 6%; Display drives 40% of trials but only 18% of new MRR. *(the insight)*
> **Evidence:** [funnel by channel, last 90 days; CI on the gap]. SRM checked, internal traffic excluded. *(proof + rigor caveat)*
> **Impact:** Reallocating ~$120k/quarter at current CACs is modeled at +$210k ARR; LTV:CAC moves 2.1→3.4 on the shifted spend. *(quantified in money)*
> **Risk / next step:** Display also assists later conversions; run a 3-week geo holdout before fully cutting it. *(guardrail + what you'd do next)*

Tailor the altitude to the audience: executives want the BLUF and the dollar impact; PMs want the funnel step and the user segment; data peers want the query, the definition, and the caveats. Never present a single point estimate as fact — state the confidence interval, the sample, and what could make the number wrong.

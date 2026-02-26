---
name: data-analytics
description: "Data analysis workflows, SQL query patterns, dashboard design, KPI frameworks, and data storytelling for business intelligence."
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

### 3. SQL Patterns

**Funnel analysis:**
```sql
WITH funnel AS (
  SELECT
    user_id,
    MAX(CASE WHEN event = 'signup' THEN 1 ELSE 0 END) AS signed_up,
    MAX(CASE WHEN event = 'onboarding_complete' THEN 1 ELSE 0 END) AS onboarded,
    MAX(CASE WHEN event = 'first_value_action' THEN 1 ELSE 0 END) AS activated,
    MAX(CASE WHEN event = 'purchase' THEN 1 ELSE 0 END) AS converted
  FROM events
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY user_id
)
SELECT
  COUNT(*) AS total_users,
  SUM(signed_up) AS signups,
  SUM(onboarded) AS onboarded,
  SUM(activated) AS activated,
  SUM(converted) AS converted,
  ROUND(100.0 * SUM(onboarded) / NULLIF(SUM(signed_up), 0), 1) AS signup_to_onboard_pct,
  ROUND(100.0 * SUM(activated) / NULLIF(SUM(onboarded), 0), 1) AS onboard_to_activate_pct,
  ROUND(100.0 * SUM(converted) / NULLIF(SUM(activated), 0), 1) AS activate_to_convert_pct
FROM funnel;
```

**Cohort retention:**
```sql
WITH cohort AS (
  SELECT
    user_id,
    DATE_TRUNC('week', MIN(created_at)) AS cohort_week
  FROM events
  WHERE event = 'signup'
  GROUP BY user_id
),
activity AS (
  SELECT
    user_id,
    DATE_TRUNC('week', created_at) AS activity_week
  FROM events
  WHERE event = 'session_start'
)
SELECT
  c.cohort_week,
  COUNT(DISTINCT c.user_id) AS cohort_size,
  COUNT(DISTINCT CASE WHEN a.activity_week = c.cohort_week + INTERVAL '1 week' THEN c.user_id END) AS week_1,
  COUNT(DISTINCT CASE WHEN a.activity_week = c.cohort_week + INTERVAL '2 weeks' THEN c.user_id END) AS week_2,
  COUNT(DISTINCT CASE WHEN a.activity_week = c.cohort_week + INTERVAL '4 weeks' THEN c.user_id END) AS week_4,
  COUNT(DISTINCT CASE WHEN a.activity_week = c.cohort_week + INTERVAL '8 weeks' THEN c.user_id END) AS week_8
FROM cohort c
LEFT JOIN activity a ON c.user_id = a.user_id
GROUP BY c.cohort_week
ORDER BY c.cohort_week;
```

**LTV calculation:**
```sql
WITH monthly_revenue AS (
  SELECT
    user_id,
    DATE_TRUNC('month', payment_date) AS month,
    SUM(amount) AS mrr
  FROM payments
  WHERE status = 'succeeded'
  GROUP BY user_id, DATE_TRUNC('month', payment_date)
),
user_ltv AS (
  SELECT
    user_id,
    SUM(mrr) AS total_revenue,
    COUNT(DISTINCT month) AS months_active,
    MIN(month) AS first_payment,
    MAX(month) AS last_payment
  FROM monthly_revenue
  GROUP BY user_id
)
SELECT
  ROUND(AVG(total_revenue), 2) AS avg_ltv,
  ROUND(AVG(months_active), 1) AS avg_lifetime_months,
  ROUND(AVG(total_revenue / NULLIF(months_active, 0)), 2) AS avg_arpu
FROM user_ltv;
```

**Churn detection:**
```sql
SELECT
  user_id,
  MAX(created_at) AS last_active,
  CURRENT_DATE - MAX(created_at)::date AS days_since_active,
  CASE
    WHEN CURRENT_DATE - MAX(created_at)::date > 30 THEN 'churned'
    WHEN CURRENT_DATE - MAX(created_at)::date > 14 THEN 'at_risk'
    ELSE 'active'
  END AS status
FROM events
WHERE event = 'session_start'
GROUP BY user_id
ORDER BY days_since_active DESC;
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
| Trend over time | Line chart |
| Part of whole | Stacked bar or donut |
| Comparison across categories | Horizontal bar |
| Distribution | Histogram |
| Correlation | Scatter plot |
| Funnel stages | Funnel chart |
| Geographic | Choropleth map |

### 5. Statistical Analysis

**A/B test significance:**
```python
from scipy import stats

control_conversions, control_total = 120, 1000
variant_conversions, variant_total = 145, 1000

# Two-proportion z-test
p1 = control_conversions / control_total
p2 = variant_conversions / variant_total
p_pool = (control_conversions + variant_conversions) / (control_total + variant_total)
se = (p_pool * (1 - p_pool) * (1/control_total + 1/variant_total)) ** 0.5
z_score = (p2 - p1) / se
p_value = 2 * (1 - stats.norm.cdf(abs(z_score)))

print(f"Lift: {((p2/p1) - 1) * 100:.1f}%")
print(f"p-value: {p_value:.4f}")
print(f"Significant: {'Yes' if p_value < 0.05 else 'No'}")
```

**Sample size calculation:**
```python
from scipy.stats import norm

def sample_size(baseline_rate, mde, alpha=0.05, power=0.8):
    z_alpha = norm.ppf(1 - alpha/2)
    z_beta = norm.ppf(power)
    p1 = baseline_rate
    p2 = baseline_rate * (1 + mde)
    n = ((z_alpha * (2*p1*(1-p1))**0.5 + z_beta * (p1*(1-p1) + p2*(1-p2))**0.5) / (p2 - p1)) ** 2
    return int(n) + 1

# Example: 5% baseline, detect 10% relative lift
print(f"Need {sample_size(0.05, 0.10)} users per variant")
```

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

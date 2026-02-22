---
name: retention-analytics
description: "Churn analysis, cohort retention, engagement scoring, health scoring, and win-back strategies for SaaS products. Use when analyzing churn, building health scores, running cohort analysis, designing win-back campaigns, or predicting at-risk customers."
---

# Retention Analytics

## Workflow

### 1. Cohort Retention Analysis

**SQL — weekly retention cohorts:**
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

**Retention benchmarks (B2B SaaS):**

| Timeframe | Good | Great | Best-in-class |
|-----------|------|-------|---------------|
| Week 1 | 40% | 55% | 70%+ |
| Month 1 | 30% | 45% | 60%+ |
| Month 3 | 20% | 35% | 50%+ |
| Month 12 | 15% | 25% | 40%+ |

**If W1 retention is below 40%:** Activation problem. Fix onboarding.
**If W1 is fine but M3 drops:** Value delivery problem. Users aren't finding ongoing value.

### 2. Customer Health Score

**Composite score (0-100):**

| Signal | Weight | Scoring |
|--------|--------|---------|
| Product usage frequency | 25% | Daily=100, Weekly=60, Monthly=30, None=0 |
| Feature breadth | 20% | % of key features used in last 30d |
| Support tickets | 15% | 0=100, 1-2=70, 3+=30 (inverse) |
| NPS response | 15% | Promoter=100, Passive=50, Detractor=0 |
| License utilization | 15% | % of seats/capacity used |
| Billing health | 10% | Current=100, Late=30, Failed=0 |

**Health tiers:**

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
ORDER BY risk_level DESC, u.contract_end ASC;
```

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

### 6. Retention Metrics Dashboard

| Metric | Cadence | Target |
|--------|---------|--------|
| Logo retention (monthly) | Monthly | > 95% |
| Net revenue retention | Monthly | > 110% |
| Gross revenue retention | Monthly | > 90% |
| Time to first value | Per cohort | < 24 hours |
| DAU/MAU ratio | Weekly | > 40% = sticky product |
| Support ticket CSAT | Weekly | > 90% |
| Health score distribution | Weekly | < 20% in at-risk/critical |

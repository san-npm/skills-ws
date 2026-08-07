## Contents

- 6. BigQuery export — your unsampled source of truth
- 6.1 The schema gotcha: eventparams is a REPEATED RECORD
- 6.2 Funnel conversion (step-to-step)
- 6.3 Cohort retention (weekly)
- 6.4 CAC / LTV by channel (joining cost data)
- 6.5 Landing-page performance
- 6.6 UTM QA (catch malformed campaign tags)

## 6. BigQuery export — your unsampled source of truth

Link GA4 → BigQuery in **Admin → Product links → BigQuery links**. It is **free to enable** on standard properties; you pay only Google Cloud usage beyond the free tier (**1 TiB query + 10 GiB storage per billing account per month** as of Jun 2026 — verify at https://cloud.google.com/bigquery/pricing).

What you get:
- **Daily** export → `events_YYYYMMDD` (fully processed, complete attribution, arrives mid-afternoon in the property time zone). Standard properties are capped at **~1M events/day** for daily export.
- **Streaming** export → `events_intraday_YYYYMMDD` (best-effort, ~minutes latency, **$0.05/GB**).

### 6.1 The schema gotcha: `event_params` is a REPEATED RECORD

Every event is one row, but parameters live in a nested key/value array with four typed value columns (`string_value`, `int_value`, `float_value`, `double_value`). Pulling any parameter requires an `UNNEST`. A reusable extractor:

```sql
-- All purchases yesterday with revenue and the page they happened on
SELECT
  event_timestamp,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_location') AS page,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'transaction_id') AS txn_id,
  ecommerce.purchase_revenue AS revenue,
  ecommerce.transaction_id
FROM `project.analytics_123456789.events_*`
WHERE _TABLE_SUFFIX = FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))
  AND event_name = 'purchase';
```

> **Always filter on `_TABLE_SUFFIX`** when querying the `events_*` wildcard, or you scan every day of history and burn through the free tier.

### 6.2 Funnel conversion (step-to-step)

```sql
WITH steps AS (
  SELECT user_pseudo_id,
    MAX(IF(event_name='view_item',       1, 0)) AS s1_view,
    MAX(IF(event_name='add_to_cart',     1, 0)) AS s2_cart,
    MAX(IF(event_name='begin_checkout',  1, 0)) AS s3_checkout,
    MAX(IF(event_name='purchase',        1, 0)) AS s4_purchase
  FROM `project.analytics_123456789.events_*`
  WHERE _TABLE_SUFFIX BETWEEN '20260501' AND '20260531'
  GROUP BY user_pseudo_id
)
SELECT
  SUM(s1_view)      AS view_item,
  SUM(s2_cart)      AS add_to_cart,
  SUM(s3_checkout)  AS begin_checkout,
  SUM(s4_purchase)  AS purchase,
  ROUND(SAFE_DIVIDE(SUM(s4_purchase), SUM(s1_view)) * 100, 2) AS view_to_purchase_pct
FROM steps;
```

### 6.3 Cohort retention (weekly)

```sql
WITH first_seen AS (
  SELECT user_pseudo_id,
         DATE_TRUNC(MIN(DATE(TIMESTAMP_MICROS(event_timestamp))), WEEK) AS cohort_week
  FROM `project.analytics_123456789.events_*`
  WHERE _TABLE_SUFFIX BETWEEN '20260301' AND '20260531'
  GROUP BY user_pseudo_id
),
activity AS (
  SELECT DISTINCT user_pseudo_id,
         DATE_TRUNC(DATE(TIMESTAMP_MICROS(event_timestamp)), WEEK) AS active_week
  FROM `project.analytics_123456789.events_*`
  WHERE _TABLE_SUFFIX BETWEEN '20260301' AND '20260531'
)
SELECT f.cohort_week,
       DATE_DIFF(a.active_week, f.cohort_week, WEEK) AS week_n,
       COUNT(DISTINCT a.user_pseudo_id) AS users
FROM first_seen f
JOIN activity a USING (user_pseudo_id)
GROUP BY 1, 2
ORDER BY 1, 2;
```

### 6.4 CAC / LTV by channel (joining cost data)

GA4 export has revenue but **not ad spend** — join a `channel_cost` table you load from the ad platforms (or via the `paid-ads` skill's exports):

```sql
WITH rev AS (
  SELECT traffic_source.source AS source, traffic_source.medium AS medium,
         COUNT(DISTINCT user_pseudo_id) AS customers,
         SUM(ecommerce.purchase_revenue) AS revenue
  FROM `project.analytics_123456789.events_*`
  WHERE _TABLE_SUFFIX BETWEEN '20260501' AND '20260531'
    AND event_name = 'purchase'
  GROUP BY 1, 2
)
SELECT r.source, r.medium, c.cost, r.customers, r.revenue,
       ROUND(SAFE_DIVIDE(c.cost, r.customers), 2)            AS cac,
       ROUND(SAFE_DIVIDE(r.revenue, NULLIF(c.cost,0)), 2)    AS roas
FROM rev r
LEFT JOIN `project.marketing.channel_cost` c
  ON r.source = c.source AND r.medium = c.medium
ORDER BY r.revenue DESC;
```

### 6.5 Landing-page performance

```sql
SELECT
  REGEXP_EXTRACT(
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key='page_location'),
    r'https?://[^/]+([^?#]*)'
  ) AS landing_path,
  COUNT(DISTINCT CONCAT(user_pseudo_id,
        CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key='ga_session_id') AS STRING))) AS sessions,
  COUNTIF(event_name='generate_lead') AS leads
FROM `project.analytics_123456789.events_*`
WHERE _TABLE_SUFFIX BETWEEN '20260501' AND '20260531'
  AND event_name IN ('session_start','generate_lead')
GROUP BY landing_path
ORDER BY sessions DESC
LIMIT 50;
```

### 6.6 UTM QA (catch malformed campaign tags)

```sql
SELECT
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key='source')   AS source,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key='medium')   AS medium,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key='campaign') AS campaign,
  COUNT(*) AS hits
FROM `project.analytics_123456789.events_*`
WHERE _TABLE_SUFFIX = FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))
GROUP BY 1,2,3
-- flag rows where casing/spacing/typos fragment a campaign:
HAVING REGEXP_CONTAINS(IFNULL(medium,''),  r'[A-Z ]')      -- uppercase or spaces in medium
    OR REGEXP_CONTAINS(IFNULL(source,''),  r'[A-Z ]')
    OR campaign IS NULL
ORDER BY hits DESC;
```

---

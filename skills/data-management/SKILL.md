---
name: data-management
description: "Data governance, pipeline design, ETL workflows, data quality frameworks, and warehouse architecture for growing teams."
---

# Data Management

## Workflow

### 1. Pipeline Architecture

**Batch vs streaming:**

| Approach | Latency | Use case | Tools |
|----------|---------|----------|-------|
| Batch ETL | Hours | Daily reporting, historical analysis | Airflow, dbt, Fivetran |
| Micro-batch | Minutes | Near-real-time dashboards | Spark Streaming, dbt + scheduler |
| Streaming | Seconds | Real-time alerts, live feeds | Kafka, Flink, Kinesis |

**Decision:** Start with batch. Move to streaming only when business requires sub-minute latency.

**Standard pipeline pattern:**
```
Sources → Extract → Landing/Raw → Transform → Staging → Serve → BI/Analytics
  ↓         ↓          ↓             ↓           ↓        ↓
 APIs    Fivetran    Raw zone     dbt models   Clean    Looker/
 DBs     Airbyte    (immutable)  (versioned)  tables   Metabase
 Files   Custom     S3/GCS       SQL tests    Views    API
```

### 2. Warehouse Schema Design

**Star schema (recommended for analytics):**
```sql
-- Fact table (events/transactions — append-only, granular)
CREATE TABLE fact_orders (
  order_id BIGINT PRIMARY KEY,
  customer_key INT REFERENCES dim_customers(customer_key),
  product_key INT REFERENCES dim_products(product_key),
  date_key INT REFERENCES dim_dates(date_key),
  quantity INT,
  revenue DECIMAL(10,2),
  discount DECIMAL(10,2),
  created_at TIMESTAMP
);

-- Dimension table (descriptive attributes — slowly changing)
CREATE TABLE dim_customers (
  customer_key INT PRIMARY KEY,  -- surrogate key
  customer_id VARCHAR(50),        -- natural key
  name VARCHAR(200),
  email VARCHAR(200),
  segment VARCHAR(50),
  country VARCHAR(50),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  is_current BOOLEAN DEFAULT TRUE  -- SCD Type 2
);

-- Date dimension (pre-populated)
CREATE TABLE dim_dates (
  date_key INT PRIMARY KEY,       -- YYYYMMDD format
  full_date DATE,
  year INT,
  quarter INT,
  month INT,
  week INT,
  day_of_week VARCHAR(10),
  is_weekend BOOLEAN,
  is_holiday BOOLEAN
);
```

**Star vs snowflake:**
- Star: denormalized dimensions, faster queries, easier to understand. **Use this.**
- Snowflake: normalized dimensions, saves storage, more joins. Only if storage is a concern (rarely).

### 3. dbt Project Structure

```
models/
  staging/          -- 1:1 with source tables, rename/cast/clean
    stg_stripe_payments.sql
    stg_hubspot_contacts.sql
  intermediate/     -- business logic joins
    int_customer_orders.sql
  marts/            -- final tables for BI
    dim_customers.sql
    fact_orders.sql
    metrics_monthly_revenue.sql
  schema.yml        -- tests and documentation
```

**dbt model example:**
```sql
-- models/marts/dim_customers.sql
WITH customers AS (
  SELECT * FROM {{ ref('stg_hubspot_contacts') }}
),
orders AS (
  SELECT customer_id, MIN(order_date) AS first_order, COUNT(*) AS total_orders, SUM(revenue) AS ltv
  FROM {{ ref('stg_stripe_payments') }}
  GROUP BY customer_id
)
SELECT
  c.customer_id,
  c.name,
  c.email,
  c.segment,
  c.country,
  o.first_order,
  o.total_orders,
  o.ltv,
  CASE WHEN o.ltv > 1000 THEN 'high' WHEN o.ltv > 100 THEN 'medium' ELSE 'low' END AS value_tier
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id
```

### 4. Data Quality Framework

**Quality dimensions:**

| Dimension | Definition | Check |
|-----------|-----------|-------|
| Completeness | No missing required values | `WHERE column IS NULL` count |
| Accuracy | Values are correct | Spot-check against source, range validation |
| Consistency | Same value across systems | Compare CRM vs billing vs product DB |
| Timeliness | Data is fresh enough | `MAX(updated_at)` vs expected freshness |
| Uniqueness | No unintended duplicates | `COUNT(*) vs COUNT(DISTINCT key)` |
| Validity | Values match expected format | Regex, enum validation, range checks |

**dbt tests (add to schema.yml):**
```yaml
models:
  - name: dim_customers
    columns:
      - name: customer_id
        tests:
          - not_null
          - unique
      - name: email
        tests:
          - not_null
          - accepted_values:
              values: []
              quote: false
              config:
                where: "email NOT LIKE '%@%'"
                severity: warn
      - name: segment
        tests:
          - accepted_values:
              values: ['enterprise', 'mid-market', 'smb', 'self-serve']
```

**Data quality score:**
```
Quality score = (Completeness × 0.3) + (Accuracy × 0.25) + (Consistency × 0.2) + (Timeliness × 0.15) + (Uniqueness × 0.1)
```
Target: > 95% across all dimensions.

### 5. GDPR Compliance

**Data subject rights checklist:**

| Right | Implementation |
|-------|---------------|
| Access (Art. 15) | Export all personal data within 30 days |
| Rectification (Art. 16) | Allow users to correct their data |
| Erasure (Art. 17) | Delete personal data on request (right to be forgotten) |
| Portability (Art. 20) | Provide data in machine-readable format |
| Restriction (Art. 18) | Stop processing but retain data |
| Objection (Art. 21) | Opt out of marketing/profiling |

**Data retention policy template:**

| Data type | Retention period | Basis |
|-----------|-----------------|-------|
| Account data | Duration of contract + 3 years | Contractual necessity |
| Payment records | 7 years | Legal obligation (tax) |
| Analytics events | 26 months | Legitimate interest |
| Marketing consent | Until withdrawn | Consent |
| Support tickets | 3 years after resolution | Legitimate interest |
| Deleted account data | 30 days (grace period) then purge | Erasure right |

**Consent management:**
- Record: what, when, how, and version of consent text
- Allow granular consent (analytics, marketing, third-party separately)
- Make withdrawal as easy as giving consent
- Re-consent on material changes to privacy policy

### 6. Monitoring

**Automated alerts:**
- Pipeline failure (any step) → Slack/PagerDuty immediate
- Data freshness > expected SLA → warn after 1 hour, alert after 4 hours
- Quality score drops below 90% → alert data team
- Duplicate rate > 1% → alert
- Schema change detected in source → alert (breaking changes)

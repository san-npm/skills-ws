---
name: data-management
description: "Data governance, ELT/ETL pipeline design, warehouse modeling, data quality, contracts, lineage, and privacy compliance for analytics teams. Use when designing a warehouse/dbt project, defining data quality tests or contracts, setting up ownership/RACI and PII classification, or implementing GDPR retention/erasure and access controls."
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

**Declare the grain first.** A fact table's grain is the business meaning of one row. Every measure and foreign key must be true at that grain. The most common modeling bug is mixing header-level and line-level facts in one table — an order with 3 products is 1 order but 3 lines, so `order_id` cannot be a unique key at line grain.

```sql
-- FACT (line grain): one row per order line. PK is the line, NOT the order.
-- Additive measures (quantity, revenue) live here.
CREATE TABLE fact_order_lines (
  order_line_key  BIGINT PRIMARY KEY,                 -- surrogate, one per line
  order_id        BIGINT NOT NULL,                    -- degenerate dimension (header id)
  customer_key    INT  NOT NULL REFERENCES dim_customers(customer_key),
  product_key     INT  NOT NULL REFERENCES dim_products(product_key),
  order_date_key  INT  NOT NULL REFERENCES dim_dates(date_key),
  quantity        INT          NOT NULL,
  unit_price      DECIMAL(12,2) NOT NULL,
  line_revenue    DECIMAL(12,2) NOT NULL,             -- quantity * unit_price - line_discount
  line_discount   DECIMAL(12,2) NOT NULL DEFAULT 0,
  loaded_at       TIMESTAMP    NOT NULL
);

-- FACT (header grain): one row per order. PK = order_id.
-- Put header-only measures here (shipping, order-level discount). Do NOT sum these
-- after joining to lines or you fan-out and double-count — keep grains separate.
CREATE TABLE fact_orders (
  order_id          BIGINT PRIMARY KEY,               -- header grain ⇒ order_id is unique
  customer_key      INT NOT NULL REFERENCES dim_customers(customer_key),
  order_date_key    INT NOT NULL REFERENCES dim_dates(date_key),
  order_total       DECIMAL(12,2) NOT NULL,           -- sum of line_revenue at load time
  shipping_amount   DECIMAL(12,2) NOT NULL DEFAULT 0, -- header-only, non-additive across lines
  order_discount    DECIMAL(12,2) NOT NULL DEFAULT 0,
  line_count        INT NOT NULL,
  loaded_at         TIMESTAMP NOT NULL
);
```

Rule of thumb: report line-level metrics from `fact_order_lines`, header-level metrics (AOV, shipping) from `fact_orders`. If you must combine, aggregate one fact to the other's grain first (CTE), never join-then-sum.

```sql
-- Date dimension (pre-populated, one row per calendar day)
CREATE TABLE dim_dates (
  date_key INT PRIMARY KEY,       -- YYYYMMDD integer, e.g. 20260607
  full_date DATE NOT NULL,
  year INT, quarter INT, month INT, week INT,
  day_of_week VARCHAR(10),
  is_weekend BOOLEAN,
  is_holiday BOOLEAN
);
```

**Star vs snowflake:**
- Star: denormalized dimensions, faster queries, easier to understand. **Use this.**
- Snowflake: normalized dimensions, saves storage, more joins. Only if storage is a concern (rarely).

**Slowly Changing Dimensions (SCD Type 2 — done correctly).** `is_current` alone is NOT SCD2. A real Type-2 dimension keeps full history: a new versioned row on every tracked-attribute change, with validity bounds and exactly one current row per natural key.

```sql
CREATE TABLE dim_customers (
  customer_key   VARCHAR(36) PRIMARY KEY,   -- surrogate key, unique per VERSION (deterministic hash)
  customer_id    VARCHAR(50) NOT NULL,      -- natural/business key (repeats across versions)
  name           VARCHAR(200),
  email          VARCHAR(200),
  segment        VARCHAR(50),
  country        VARCHAR(50),
  valid_from     TIMESTAMP   NOT NULL,      -- when this version became effective
  valid_to       TIMESTAMP   NOT NULL DEFAULT TIMESTAMP '9999-12-31 00:00:00', -- open-ended for current
  is_current     BOOLEAN     NOT NULL DEFAULT TRUE,
  row_hash       VARCHAR(64) NOT NULL       -- hash of tracked cols, detects real changes
);
-- Enforce "one current row per natural key" (partial index where supported):
CREATE UNIQUE INDEX uq_dim_customers_current
  ON dim_customers (customer_id) WHERE is_current;
-- Facts join on the surrogate customer_key valid at the order's date → preserves point-in-time truth.
```

Upsert/merge logic. **Order matters: stage the change-set first, then close the old versions, then insert the new ones.** The partial unique index rejects a second current row per key, so you cannot insert before closing; computing the change-set against the *still-current* version (before closing it) keeps change detection unambiguous:

```sql
-- 0) Stage new OR changed natural keys, compared against the still-current row
--    BEFORE touching it, so change detection is unambiguous.
CREATE TEMP TABLE changed_customers AS
SELECT s.*
FROM stg_customers s
LEFT JOIN dim_customers d
  ON d.customer_id = s.customer_id AND d.is_current
WHERE d.customer_id IS NULL                          -- brand-new customer
   OR d.row_hash <> md5(concat_ws('||', s.name, s.email, s.segment, s.country));  -- changed

-- 1) Close the previous current version for keys about to get a newer one.
UPDATE dim_customers d
SET valid_to = c.loaded_at, is_current = FALSE
FROM changed_customers c
WHERE d.customer_id = c.customer_id
  AND d.is_current;

-- 2) Insert the new current versions.
INSERT INTO dim_customers (customer_key, customer_id, name, email, segment, country,
                           valid_from, valid_to, is_current, row_hash)
SELECT
  md5(c.customer_id || '|' || c.loaded_at::text)::uuid::text,  -- deterministic surrogate
  c.customer_id, c.name, c.email, c.segment, c.country,
  c.loaded_at, TIMESTAMP '9999-12-31', TRUE,
  md5(concat_ws('||', c.name, c.email, c.segment, c.country))
FROM changed_customers c;
```

Wrap the statements in one transaction so the dimension is never observed with two current rows. The partial unique index above is your safety net: it rejects the load if the close step misses a stale current row.

In dbt, prefer the built-in `snapshot` (`strategy='check'` or `'timestamp'`), which generates `dbt_valid_from`/`dbt_valid_to`/`dbt_scd_id` for you instead of hand-writing the merge.

### 3. dbt Project Structure

```
models/
  staging/          -- 1:1 with source tables, rename/cast/clean
    stg_stripe_payments.sql
    stg_hubspot_contacts.sql
    _stg__sources.yml -- source freshness + raw-table contracts
  intermediate/     -- business logic joins
    int_customer_orders.sql
  marts/            -- final tables for BI
    dim_customers.sql
    fact_orders.sql
    fact_order_lines.sql
    metrics_monthly_revenue.sql
    _marts__models.yml -- tests, descriptions, contracts
snapshots/          -- SCD Type 2 history (dbt snapshot blocks)
  customers_snapshot.sql
packages.yml        -- dbt-utils, dbt-expectations
```

Add `dbt_utils` and `dbt_expectations` to `packages.yml` (run `dbt deps`); they supply the realistic data-quality tests used below:
```yaml
# packages.yml
packages:
  - package: dbt-labs/dbt_utils
    version: [">=1.3.0", "<2.0.0"]
  - package: metaplane/dbt_expectations
    version: [">=0.10.0", "<1.0.0"]
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

### 4. Data Governance

Governance is who owns what, who can see what, and how you prove it. Keep it lightweight but concrete.

**Ownership & RACI.** Assign every dataset/domain an owner and steward; review quarterly.

| Role | Responsibility |
|------|----------------|
| Data Owner (business) | Accountable for the dataset, approves access, sets retention/classification |
| Data Steward | Responsible for quality, definitions, fixing issues, maintaining docs/tests |
| Data Engineer | Builds/operates pipelines; consulted on schema changes |
| Consumers (analysts/PM) | Informed of changes/SLAs via changelog + freshness alerts |

**PII / data classification tiers.** Tag every column; the tag drives masking, retention, and access.

| Tier | Examples | Controls |
|------|----------|----------|
| Public | product catalog, public metrics | none |
| Internal | aggregated revenue, internal IDs | role-based access |
| Confidential / PII | name, email, IP, device id | column masking, access review, retention limit |
| Restricted / sensitive | payment data, health, gov ID, special-category (GDPR Art. 9) | encryption, least-privilege, audit log, DPIA |

In dbt, classify in the model YAML with `meta` so it propagates to the catalog and downstream policies:
```yaml
columns:
  - name: email
    meta: { pii: true, classification: confidential, masking_policy: email_mask }
  - name: customer_id
    meta: { classification: internal }
```

**Access control (modern warehouse patterns).** Grant roles, never individuals. Use the warehouse's native fine-grained controls instead of building views per team:
- **Column masking** (dynamic data masking): show `j***@x.com` to analysts, full value to a `pii_reader` role. Snowflake `MASKING POLICY`, BigQuery column-level data masking, Databricks Unity Catalog column masks.
- **Row access policies / row-level security**: restrict rows by region/tenant. Snowflake `ROW ACCESS POLICY`, BigQuery row-level security, Databricks row filters, Postgres RLS.
```sql
-- Snowflake masking policy: full email only for the pii_reader role
CREATE MASKING POLICY email_mask AS (val STRING) RETURNS STRING ->
  CASE WHEN CURRENT_ROLE() IN ('PII_READER') THEN val
       ELSE REGEXP_REPLACE(val, '^[^@]+', '****') END;
ALTER TABLE dim_customers MODIFY COLUMN email SET MASKING POLICY email_mask;
```
- Run a **quarterly access review**: list grants per role, confirm with each Data Owner, revoke unused. Log who approved.

**Lineage & catalog.** Know where every field comes from and who consumes it before you change anything.
- dbt already produces column/model lineage via `ref()`/`source()` → expose it with **dbt docs** (`dbt docs generate`) or push the manifest to a catalog.
- Catalog options (as of Jun 2026, verify current features): **DataHub** or **OpenMetadata** (open-source), **Unity Catalog** (Databricks), or **dbt Catalog/Explorer** if on dbt Cloud. Catalog stores: owner, classification, freshness SLA, description, lineage.

**Data contracts.** A contract is an enforced agreement on a producer's schema so upstream changes can't silently break you. dbt enforces this at build time:
```yaml
models:
  - name: stg_stripe_payments
    config:
      contract: { enforced: true }   # build FAILS if a column type/name drifts from below
    columns:
      - name: customer_id
        data_type: varchar
        constraints: [{ type: not_null }]
      - name: amount
        data_type: numeric
```
Pair with **source freshness** so stale upstream data is caught automatically:
```yaml
sources:
  - name: stripe
    freshness: { warn_after: {count: 12, period: hour}, error_after: {count: 24, period: hour} }
    loaded_at_field: _loaded_at
    tables: [{ name: payments }]
```

**Incident workflow.** When a quality test/freshness check fails:
1. **Detect** — test/freshness alert fires to the data on-call channel (see Monitoring).
2. **Triage** — assess blast radius via lineage (which dashboards/marts consume the broken model); set severity.
3. **Contain** — pause/hold the affected job, mark stale dashboards, notify consumers (the "Informed" row above).
4. **Fix & backfill** — correct source/transform, re-run, validate the failing test now passes.
5. **Post-mortem** — for SEV1/2, write a blameless root-cause + add a regression test so the same break is caught next time.

### 5. Data Quality Framework

**Quality dimensions:**

| Dimension | Definition | Check |
|-----------|-----------|-------|
| Completeness | No missing required values | `WHERE column IS NULL` count |
| Accuracy | Values are correct | Spot-check against source, range validation |
| Consistency | Same value across systems | Compare CRM vs billing vs product DB |
| Timeliness | Data is fresh enough | `MAX(updated_at)` vs expected freshness |
| Uniqueness | No unintended duplicates | `COUNT(*) vs COUNT(DISTINCT key)` |
| Validity | Values match expected format | Regex, enum validation, range checks |

**dbt tests (add to `_marts__models.yml`).** Note on syntax: dbt Core 1.10+ standardizes test args under an `arguments:` block (the older flat style still parses but is being deprecated). Shown in current style below.

`accepted_values` is the WRONG tool for email validity — `values: []` compiles to a degenerate predicate and tests nothing. Validate format with a regex test from `dbt_expectations`, or `dbt_utils.expression_is_true` for an adapter-portable check:

```yaml
version: 2

models:
  - name: dim_customers
    columns:
      - name: customer_id
        data_tests:
          - not_null
          - unique          # natural key uniqueness applies to the CURRENT version
      - name: email
        data_tests:
          - not_null
          # Correct email-format check (regex). Adjust pattern as needed.
          - dbt_expectations.expect_column_values_to_match_regex:
              arguments:
                regex: "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"
              config:
                severity: warn   # warn (don't fail the build) on dirty source emails
      - name: segment
        data_tests:
          - accepted_values:    # accepted_values IS correct for a known enum
              arguments:
                values: ['enterprise', 'mid-market', 'smb', 'self-serve']

  # Grain assertion: order_id must be unique only at HEADER grain.
  - name: fact_orders
    columns:
      - name: order_id
        data_tests: [not_null, unique]

  # At LINE grain, order_id repeats — assert the SURROGATE is unique instead,
  # and the (order_id, product_key) combination is unique.
  - name: fact_order_lines
    columns:
      - name: order_line_key
        data_tests: [not_null, unique]
    data_tests:
      - dbt_utils.unique_combination_of_columns:
          arguments:
            combination_of_columns: ['order_id', 'product_key']
```

If you cannot add packages, a custom singular test under `tests/` is the portable fallback — it fails when any row is invalid:
```sql
-- tests/assert_valid_email.sql  (returns offending rows ⇒ test fails if any)
SELECT customer_id, email
FROM {{ ref('dim_customers') }}
WHERE email IS NOT NULL
  AND email NOT SIMILAR TO '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
```

**Data quality score (make each dimension measurable first).** A weighted score is only meaningful if every input is a normalized 0–100% pass rate computed the same way. Define each as `passing_rows / evaluated_rows` over a fixed window (e.g. last 24h of loads):

| Dimension | Measured as (0–100%) | Example metric |
|-----------|----------------------|----------------|
| Completeness | rows with all required cols populated ÷ total rows | `1 - (nulls_in_required / total)` |
| Validity | rows passing format/range/enum tests ÷ total | `valid_email + valid_enum + in_range / total` |
| Uniqueness | `COUNT(DISTINCT key) / COUNT(*)` on natural key | 1.0 = no dupes |
| Consistency | rows matching across systems ÷ reconciled rows | CRM vs billing customer match rate |
| Timeliness | 1 if `MAX(updated_at)` within SLA else 0 (or % of partitions fresh) | freshness pass rate |
| Accuracy | % of a sampled audit set matching source of truth | manual/spot-check sample |

```sql
-- Each component returns a 0..1 ratio; combine with documented weights.
WITH q AS (
  SELECT
    1.0 - (COUNT(*) FILTER (WHERE email IS NULL)::numeric / COUNT(*))               AS completeness,
    AVG((email SIMILAR TO '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}')::int)   AS validity,
    COUNT(DISTINCT customer_id)::numeric / COUNT(*)                                 AS uniqueness
  FROM dim_customers WHERE is_current
)
SELECT ROUND(100 * (completeness*0.3 + validity*0.25 + uniqueness*0.1
                    /* + consistency*0.2 + timeliness*0.15 from their own queries */), 1)
       AS quality_score_pct
FROM q;
```
Weights are a business choice — document them next to the metric. Target `> 95%` only after each component is defined and sampled consistently; an undefined "accuracy" makes the target meaningless.

### 6. Privacy & Compliance (GDPR + AI Act)

**Data subject rights checklist:**

| Right | Implementation |
|-------|---------------|
| Access (Art. 15) | Export all personal data within 30 days |
| Rectification (Art. 16) | Allow users to correct their data |
| Erasure (Art. 17) | Delete personal data on request (right to be forgotten) |
| Portability (Art. 20) | Provide data in machine-readable format |
| Restriction (Art. 18) | Stop processing but retain data |
| Objection (Art. 21) | Opt out of marketing/profiling |

**Data retention — example template, NOT legal limits.** GDPR sets no fixed retention numbers; it requires *storage limitation* (Art. 5(1)(e)) — keep data only as long as needed for the stated purpose, then delete or anonymize. The "periods" below are common defaults that must be adjusted per **jurisdiction**, **lawful basis**, and **data-minimization**; statutory periods (tax, employment) vary by country. Verify each with counsel/your DPO.

| Data type | Typical default* | Lawful basis (Art. 6) | Caveats |
|-----------|------------------|-----------------------|---------|
| Account data | Contract + (1–3y) | Contract / legal obligation | Local limitation periods differ |
| Payment/invoice records | Country tax law (often 6–10y) | Legal obligation | E.g. DE/LU ~10y, varies — confirm locally |
| Analytics events | Minimize; pseudonymize early | Consent or legitimate interest | "26 months" was the old Universal Analytics default, not a GDPR rule (GA4 standard retention is 2 or 14 months); needs LI balancing test or consent |
| Marketing consent log | Until withdrawn + proof window | Consent | Keep the consent *record* to prove it |
| Support tickets | As needed (e.g. 1–3y) | Legitimate interest | Strip PII when no longer needed |
| Deleted-account grace | 30d then purge from prod + backups | Erasure right | Define backup-deletion path (below) |

\* Illustrative only — set real values with your DPO per applicable law.

**Erasure must propagate (don't forget backups & downstream).** A delete in prod that lingers in the warehouse/backups/third-parties is non-compliant. Maintain a deletion runbook: prod DB → analytics warehouse (and marts derived from it) → search indexes/caches → backups (document the rolling-backup expiry as the deletion mechanism) → processors (Stripe, email, support tools) via their delete APIs. Log every erasure (subject id hash, date, systems cleared) for accountability.

**Consent management:**
- Record: what, when, how, and version of consent text (store the consent log as proof)
- Allow granular consent (analytics, marketing, third-party separately)
- Make withdrawal as easy as giving consent
- Re-consent on material changes to privacy policy

**Accountability & cross-border (the documents regulators ask for).**
- **RoPA** (Art. 30): Record of Processing Activities — what data, why, who, retention, recipients.
- **DPIA** (Art. 35): Data Protection Impact Assessment for high-risk processing (large-scale profiling, special-category data, systematic monitoring).
- **DPA** (Art. 28): Data Processing Agreement with every processor/sub-processor (your warehouse, ETL vendor, email tool).
- **International transfers** (Ch. V): for EU→non-adequate-country flows, use **SCCs** (Standard Contractual Clauses) + a **TIA** (Transfer Impact Assessment). EU↔US: rely on the **EU-US Data Privacy Framework** only if the vendor is certified. Pin your warehouse/processor *region* to keep data in-region where feasible.
- **Audit log**: keep an immutable log of access to PII and of erasure/rectification actions.

**EU AI Act — data-governance touchpoints (as of Jun 2026; phased obligations are rolling in — verify current status at https://artificialintelligenceact.eu).** If your pipelines feed model training or automated decisions:
- Training/validation data for high-risk AI must meet **data governance** requirements (Art. 10): relevance, representativeness, examination for bias, documented provenance.
- **GDPR still applies** to personal data used for training — you need a lawful basis and must honor erasure; prefer anonymized/pseudonymized training sets and record data lineage so you can show provenance.
- Keep dataset documentation (sources, classification tier, consent/lawful basis) in the catalog alongside the data — this doubles as AI-Act and GDPR evidence.

> This section is engineering guidance, not legal advice. Retention periods, lawful bases, and AI-Act applicability depend on your jurisdiction and use case — confirm with a qualified DPO/legal counsel.

### 7. Monitoring

**Automated alerts:**
- Pipeline failure (any step) → Slack/PagerDuty immediate
- Data freshness > expected SLA → warn after 1 hour, alert after 4 hours
- Quality score drops below 90% → alert data team
- Duplicate rate > 1% → alert
- Schema change detected in source → alert (breaking changes)

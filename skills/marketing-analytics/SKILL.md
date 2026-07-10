---
name: marketing-analytics
description: "Marketing measurement on GA4/GTM: event taxonomy, ecommerce dataLayer, key events, Consent Mode v2, server-side tagging/Measurement Protocol, UTMs, 2026 attribution, BigQuery SQL, dashboards. Use when setting up GA4/GTM, UTMs, key-event/conversion tracking, attribution, dashboards, funnel/cohort analysis, BigQuery exports, or consent compliance."
---

# Marketing Analytics

A standalone implementation guide for instrumenting, validating, and analyzing marketing measurement on the modern Google stack (GA4 + Google Tag Manager + server-side tagging + BigQuery), plus the UTM, attribution, and governance discipline that keeps the data trustworthy. For paid-channel optimization see the `paid-ads` skill; for lifecycle/email metrics see `email-sequence`; for activation/retention metrics see `product-led-growth`.

> **2026 context.** GA4 is the only Google Analytics product (Universal Analytics was shut off July 2023). Three things below changed recently and trip people up: (1) GA4 retired first-click/linear/time-decay/position-based attribution in **Nov 2023**, and an **Apr 2026** restructure pushed reporting further toward data-driven and changed default windows; (2) **Consent Mode v2** (four signals) is required for EEA traffic via a Google-certified CMP, and from **June 15 2026** the GA4 *Google Signals* toggle no longer governs Google Ads data; Consent Mode (`ad_storage`) becomes the authority for what reaches Ads; (3) data-driven attribution silently falls back to last-click below roughly **400 conversions for a given key event** (within the lookback window), not the old ~1,000 thinking. The attribution models page (https://support.google.com/analytics/answer/10596866) documents the current model list; the DDA data requirements and 2026 changes are documented separately in Analytics Help, so confirm the current threshold there before quoting it to a client.

---

## 1. GA4 Setup

### 1.1 Property → stream → tag, in order

1. **Create the property** (Admin → Create property). Set the reporting time zone and currency **once** — changing them later does not retro-correct historical data.
2. **Create a Web data stream.** Copy the **Measurement ID** (`G-XXXXXXXXXX`). The stream-level **Measurement Protocol API secret** (Admin → Data streams → your stream → Measurement Protocol API secrets) is created separately and is stream-specific — never reuse it across streams.
3. **Install the tag.** Prefer GTM (see §3) over hardcoded `gtag.js` so non-engineers can iterate. If you must hardcode, load the Google tag once site-wide before any event fires.
4. **Set data retention to 14 months** (Admin → Data retention) — the default is 2 months and silently caps how far back exploration reports can look. Event-level data in **BigQuery is unaffected** by this and is your long-term store (§6).
5. **Turn on Google signals only if you have consent for it** and understand the thresholding it can introduce; many privacy-conscious setups leave it off and rely on BigQuery for unsampled data.

### 1.2 Event taxonomy

Design custom events in a consistent `object_action` pattern (snake_case, ≤40 chars, lowercase). GA4 auto-collects some of these — do not re-implement an auto event with the same name.

```
# Auto-collected (do NOT re-send): page_view, session_start, first_visit, user_engagement
# Enhanced Measurement (toggle in stream settings, §1.4): scroll, click (outbound), view_search_results, file_download, video_*, form_start, form_submit
# Your custom marketing/product events:
generate_lead          # form_submit on a high-intent form (replaces ad-hoc "demo_request")
sign_up                # account creation  (recommended event name — keep it)
login
trial_start
subscribe              # paid conversion / start of paid plan
purchase               # ecommerce transaction (reserved name + required params, §2)
begin_checkout
add_to_cart
cta_click              # params: cta_id, cta_location, cta_variant
content_view           # params: content_type (blog|docs|landing|product), content_id
feature_use            # params: feature_name, feature_surface
```

Rules:
- **Use Google's recommended event names** (`sign_up`, `login`, `purchase`, `generate_lead`, `add_to_cart`, `begin_checkout`, `subscribe`, `refund`, etc.) wherever one exists — they unlock prebuilt reports and Ads integrations. Invent custom names only when none fits. Full list: https://support.google.com/analytics/answer/9267735.
- Push descriptive **event parameters** instead of minting many near-duplicate event names. `cta_click` + `cta_location=pricing_header` beats `pricing_header_cta_click`.
- Register any parameter you want to segment/report on as a **custom dimension** (§1.5) — unregistered params are collected but not queryable in the GA4 UI (they are still in BigQuery).
- **Limits to respect:** 25 parameters per event; 25 user properties per property; 50 custom dimensions + 50 custom metrics (event-scoped) per property; event names and most string values truncate at 100 chars (40 for event names). Exceeding the registered-dimension cap silently drops new ones.

### 1.3 Key events (formerly "conversions")

GA4 renamed **Conversions → Key events** in the Analytics UI (2024). Mark events as key events in **Admin → Events → toggle "Mark as key event"**. (Google **Ads** still calls its imported actions "conversions" — so a GA4 *key event* imported into Ads becomes an Ads *conversion*; expect both words in conversations.)

Typical key events for a SaaS/marketing site:
- `generate_lead` — high-intent lead (demo/contact)
- `sign_up` — new account
- `trial_start` — trial activation
- `subscribe` / `purchase` — revenue event
- `begin_checkout` — mid-funnel (optional, for funnel diagnostics)

Mark **only genuine business outcomes** as key events. Marking `page_view` or `scroll` as a key event pollutes conversion rate, attribution, and any Ads bidding that imports it.

### 1.4 Enhanced Measurement

Enable in **Admin → Data streams → Web stream → Enhanced measurement**: Page views, Scrolls (fires once at 90% depth), Outbound clicks, Site search (set the query parameter, default `q`), File downloads, Video engagement, Form interactions. Each toggle auto-collects without code. Two cautions:
- The single `scroll` event (90%) is coarse. For 25/50/75/100% milestones, add a custom scroll-depth trigger in GTM and send `scroll` with a `percent_scrolled` parameter.
- Enhanced "Form interactions" (`form_start`/`form_submit`) keys off `<form>` semantics; SPA/React forms that don't use a real form submit need a manual `form_submit` event.

### 1.5 Custom dimensions & user properties

Register in **Admin → Custom definitions**. Event-scoped dimensions read an event parameter; user-scoped dimensions read a user property set via `set user_properties`.

| Definition | Scope | Source param/property | Example values |
|---|---|---|---|
| `user_type` | User | user property `user_type` | free, trial, paid, churned |
| `plan_tier` | User | user property `plan_tier` | starter, pro, enterprise |
| `content_category` | Event | param `content_type` | blog, docs, landing, product |
| `experiment_variant` | Event | param `experiment_variant` | control, variant_a |
| `cta_location` | Event | param `cta_location` | hero, pricing_header, footer |

**Never** put PII (email, name, raw IP, phone) into a parameter or user property — it violates the GA4 ToS and can get the property suspended. Hash or omit. For logged-in stitching, send a non-PII `user_id` (see §7.3).

---

## 2. Ecommerce & gtag/dataLayer payloads

GA4 ecommerce uses **reserved event names** with a required `items[]` array and a top-level `currency` + `value`. Omitting `currency` makes `value` unusable in revenue reports.

### 2.1 Recommended event sequence

`view_item_list → select_item → view_item → add_to_cart → begin_checkout → add_payment_info → purchase` (and `refund` for returns).

### 2.2 `purchase` via gtag.js (client-side)

```html
<script>
gtag('event', 'purchase', {
  transaction_id: 'T_12345',        // REQUIRED, must be unique — dedupes refunds & re-fires
  value: 59.97,                     // sum of item revenue actually charged
  currency: 'USD',                  // REQUIRED ISO-4217; without it value is dropped
  coupon: 'SPRING2026',
  shipping: 4.99,
  tax: 5.00,
  items: [
    { item_id: 'SKU_1', item_name: 'Pro Plan (annual)', item_category: 'subscription',
      price: 49.99, quantity: 1, item_brand: 'Acme', discount: 10.00 },
    { item_id: 'SKU_2', item_name: 'Add-on seat', price: 9.99, quantity: 1 }
  ]
});
</script>
```

### 2.3 Same event via GTM dataLayer

With a GTM "GA4 Event" tag whose **Event Name = `{{Event}}`** and ecommerce data read from the dataLayer (toggle *"Send Ecommerce data" → Data source: Data Layer*):

```html
<script>
window.dataLayer = window.dataLayer || [];
dataLayer.push({ ecommerce: null });   // clear the previous ecommerce object first (prevents bleed-through)
dataLayer.push({
  event: 'purchase',
  ecommerce: {
    transaction_id: 'T_12345',
    value: 59.97,
    currency: 'USD',
    items: [
      { item_id: 'SKU_1', item_name: 'Pro Plan (annual)', price: 49.99, quantity: 1 }
    ]
  }
});
</script>
```

The `dataLayer.push({ ecommerce: null })` line is mandatory between ecommerce events — without it, items from a prior event leak into the next.

### 2.4 Setting user properties

```js
gtag('set', 'user_properties', {
  user_type: 'paid',
  plan_tier: 'pro'
});
gtag('config', 'G-XXXXXXXXXX', { user_id: 'u_8f3a2c' });  // non-PII stable id
```

---

## 3. Google Tag Manager (web) implementation

Use GTM as the single deployment surface so marketers can add tags without code deploys, and so Consent Mode (§4) is enforced centrally.

### 3.1 Minimal, production-grade dataLayer contract

Agree this schema with engineering; it is the contract GTM reads.

```js
// Fired on every route change in an SPA (and on initial load):
dataLayer.push({
  event: 'page_view',
  page: { path: location.pathname, title: document.title, type: 'pricing' }
});

// Fired when a known user is present (after login / on hydrate):
dataLayer.push({
  event: 'user_data_ready',
  user: { id: 'u_8f3a2c', type: 'paid', plan: 'pro' }   // id is non-PII
});

// Generic marketing interaction:
dataLayer.push({
  event: 'cta_click',
  cta: { id: 'start_trial', location: 'pricing_header', variant: 'b' }
});
```

### 3.2 Tag/trigger/variable wiring

- **One GA4 Configuration tag** (the "Google Tag", `G-XXXXXXXXXX`) firing on Consent Initialization → All Pages, with **"Send a page view"** left ON for the initial load.
- **GA4 Event tags** for each custom event, triggered on the matching `event` name, reading Data Layer Variables (`cta.id`, `user.type`, …) into event parameters and user properties.
- For SPA page views, **turn OFF** the config tag's automatic page_view and fire your own `page_view` event tag on the `page_view` dataLayer push, so route changes are captured.
- Use **Data Layer Variables** (not DOM scraping / auto-event variables) for anything load-bearing — DOM selectors break on the next redesign.

### 3.3 Always test in Preview/Debug before publishing

Open **GTM → Preview**, walk the funnel, and confirm each tag fires once (not twice), with the expected parameters, and that consent state is correct. Then **Submit/Publish** with a version note.

---

## 4. Consent Mode v2 (required for EEA, and best practice everywhere)

Consent Mode v2 sends **four** signals; the two added in v2 govern how Google may use data for advertising:

| Signal | Controls |
|---|---|
| `analytics_storage` | GA4 analytics cookies / storage |
| `ad_storage` | Advertising cookies / storage |
| `ad_user_data` | Whether user data may be **sent** to Google for ads |
| `ad_personalization` | Whether data may be used for **personalized** ads / remarketing |

Rules and 2026 notes:
- For **EEA/UK/Switzerland traffic, default all four to `denied`** *before* any user interaction. A "granted" default prior to consent is a compliance defect — fix immediately.
- You must use a **Google-certified CMP** to unlock conversion modeling. Without certification, modeling does not run.
- **Basic vs Advanced.** *Basic*: Google tags are blocked entirely until consent — zero data (and no modeling) from non-consenters. *Advanced*: tags load with default-denied and send **cookieless pings**, enabling conversion/behavioral modeling that recovers a meaningful share of lost conversions. Advanced is generally preferred for ad performance; basic is simpler and more conservative.
- **June 15 2026 change:** from this date the GA4 **Google Signals** toggle stops governing Google Ads data collection; **`ad_storage`** (your Consent Mode signal) becomes the authority for what reaches linked Ads accounts. Google Signals narrows to Analytics-only (associating signed-in sessions for GA4 reporting). Net effect: your CMP → Consent Mode wiring becomes the source of truth for Ads consent, so re-verify your CMP emits all four signals correctly. Details: see Google's "Updates to Google Analytics data controls" announcement in Analytics Help (the EU consent policy page, answer/14275483, covers the consent signal requirements but not this change).

### 4.1 Default + update (gtag) — set the default *first*, synchronously

```html
<!-- BEFORE the Google tag / GTM loads -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    wait_for_update: 500           // ms to wait for the CMP before tags decide
    // optionally: region: ['ES','FR','DE', ...]  // scope denied-default to EEA only
  });
</script>

<!-- After the user accepts in your CMP, push an UPDATE: -->
<script>
  gtag('consent', 'update', {
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
    analytics_storage: 'granted'
  });
</script>
```

In **GTM**, set the equivalent default via a **Consent Initialization → All Pages** tag (a CMP template or a Consent Mode default tag), and ensure each tag's **Consent Settings → Additional consent checks** require `analytics_storage` (GA4) or `ad_storage`/`ad_user_data` (Ads/remarketing) as appropriate. Verify in Preview that tags show **"blocked – consent not granted"** before acceptance.

---

## 5. Server-side tagging & Measurement Protocol

Move collection server-side for durability (ad-blocker/ITP resilience, first-party cookies, PII redaction before it reaches Google) and to capture events the browser can't (renewals, refunds, offline conversions).

### 5.1 Two distinct things — don't conflate them

- **Server-side GTM (sGTM):** a tagging container you run on your own subdomain (e.g. `https://gtm.example.com`) in Cloud Run / App Engine. The browser sends to *your* endpoint; sGTM forwards to GA4, Ads, etc. Best for high-volume, first-party web measurement.
- **Measurement Protocol (MP):** a raw HTTP API to send events to GA4 from any backend. Best for offline/async server events (subscription renewal, post-checkout confirmation, IoT).

### 5.2 GA4 Measurement Protocol request

`POST https://www.google-analytics.com/mp/collect?measurement_id=G-XXXXXXXXXX&api_secret=YOUR_API_SECRET`

```bash
curl -s -X POST \
  "https://www.google-analytics.com/mp/collect?measurement_id=G-XXXXXXXXXX&api_secret=$GA4_MP_API_SECRET" \
  -H 'Content-Type: application/json' \
  -d '{
    "client_id": "1234567890.1680000000",
    "user_id": "u_8f3a2c",
    "timestamp_micros": 1718000000000000,
    "consent": { "ad_user_data": "GRANTED", "ad_personalization": "DENIED" },
    "user_properties": { "plan_tier": { "value": "pro" } },
    "events": [{
      "name": "subscribe",
      "params": {
        "value": 49.99,
        "currency": "USD",
        "transaction_id": "T_12345",
        "session_id": "s_001",            
        "engagement_time_msec": "1"        
      }
    }]
  }'
```

Constraints & gotchas:
- `client_id` is **required** and should match the browser's GA4 `client_id` (read it from the `_ga` cookie or GA4's `get` API) so server events join the same user/session. A fresh random `client_id` creates orphan sessions.
- Up to **25 events per request**; event/param naming follows the same rules as §1.2.
- Include `session_id` and `engagement_time_msec` if you want the event to count toward an active session; without them MP events can land outside any session.
- Pass the user's `consent` object so MP respects consent.
- Validate against the debug endpoint first: `POST https://www.google-analytics.com/debug/mp/collect` returns `validationMessages`. **The production endpoint never returns errors** — a `2xx` does not mean the event was accepted.
- Keep the **API secret in an env var/secret manager**, never in client code or the repo. Reference: https://developers.google.com/analytics/devguides/collection/protocol/ga4.

---

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

## 7. UTM strategy

### 7.1 Convention

```
utm_source   = the platform / referrer        (google, facebook, linkedin, newsletter, partner-acme)
utm_medium   = the marketing channel type      (cpc, paid_social, email, referral, affiliate, display)
utm_campaign = the campaign                     (spring-sale-2026, product-launch-q2)
utm_content  = creative / placement variant     (hero-image-a, cta-blue, sidebar)
utm_term     = keyword                          (paid search only)
utm_id       = optional campaign ID joining to ad-platform cost (recommended for CAC/ROAS joins)
```

### 7.2 Rules (these are the ones people break)

- **All lowercase, hyphens not spaces/underscores.** GA4 treats `Email`, `email`, and `e-mail` as three different mediums — fragmentation destroys channel reports. Use the §6.6 QA query weekly.
- **Use the canonical `medium` values GA4 maps to default channel groups** (`cpc`, `paid_social`, `email`, `organic`, `referral`, `display`, `affiliate`). A made-up medium like `social-paid` falls into "Unassigned".
- **Never put UTMs on internal links.** A click on an internally-tagged link starts a **new session** and reattributes the user to that fake source — wiping the real acquisition channel. For internal A/B/CTA tracking use event parameters (§3.1), not UTMs.
- **Tag every external inbound link you control:** ads, email CTAs, social posts, partner placements, QR codes, paid newsletter slots.
- **Document the taxonomy in one shared sheet** and (better) generate URLs from a builder that enforces the allowed values — free-typed UTMs are the #1 source of dirty channel data.
- **Don't tag organic/owned destinations you don't want counted as campaigns** (e.g. links inside your own transactional emails to the app) unless you've decided they should be a channel.

---

## 8. Attribution (GA4, 2026)

GA4 retired first-click, linear, time-decay, and position-based attribution in **November 2023**. Treat those as **historical or third-party-tool-only** models — they are not selectable in GA4 today. What GA4 actually offers now, grouped by which channels can receive credit:

| Reporting model (current in GA4) | Channel group it credits | How it assigns credit |
|---|---|---|
| **Data-driven (DDA)** — recommended default | Paid **and** organic channels | ML model trained on your converting *and* non-converting paths; distributes fractional credit by measured contribution |
| **Paid and organic last click** | Paid and organic channels | 100% to the **last** channel clicked (ignores direct unless direct is the only touch); YouTube engaged-views count |
| **Google paid channels last click** | **Google paid only** | 100% to the last **Google paid** click — used to reconcile with Google Ads |

Set in **Admin → Attribution settings**: choose **Data-driven**, set **reporting credit to "Paid and organic"** for the fullest picture, and set the **lookback window** to match your sales cycle (acquisition events up to 30 days; other key events 30/60/90 days).

Guidance:
- **Default to data-driven.** If a key event has **fewer than ~400 conversions for that event** within the lookback window (a property-wide total around 20,000 conversions is also commonly cited), GA4 **silently falls back to last-click** for that key event (no warning in the UI), so DDA numbers for low-volume conversions are effectively last-click; note this when interpreting reports. Consolidate sparse key events or widen the lookback window to clear the bar. Confirm the current threshold in Analytics Help before quoting it (the attribution models page, answer/10596866, covers the model list above but not the thresholds).
- **Reconcile, don't expect a match.** GA4 (event-time, its own modeling/identity) and Google Ads (conversion-time, its own modeling) will report different conversion counts for the same campaign — that is expected, not a bug. Use **"Google paid channels last click"** when you specifically need numbers closest to Ads.
- **Note the April 2026 attribution restructure** Google rolled out to GA4 reporting: re-baseline any saved attribution comparisons made before it and don't compare across the boundary. The changelog is documented separately in Analytics Help (the attribution models page, answer/10596866, does not cover the April 2026 change).
- For true multi-touch beyond GA4's three models (e.g. linear/position-based, cross-device, offline blends), do it in **BigQuery** (§6) or a dedicated attribution tool — don't claim GA4 still offers those models.

---

## 9. KPI dashboards

Build core dashboards in **Looker Studio** on the GA4 connector (fast, native) and reserve **BigQuery-backed** Looker Studio for unsampled/blended/cost-joined views (§6). Define each tile with an explicit metric, dimension, and segment so it isn't ambiguous.

### Acquisition
- Sessions & users by **Session source/medium** and **Default channel group**
- New vs returning users
- **CPA/CAC by channel** (requires cost join, §6.4 — not in GA4 alone)
- Landing-page key-event rate (`generate_lead` / sessions)

### Engagement
- Engaged sessions / sessions (**engagement rate**) — GA4's replacement for the old "bounce rate"; bounce rate = 1 − engagement rate
- Average engagement time per session
- Pages/screens per session
- Scroll depth milestones (needs the custom `percent_scrolled` event, §1.4)

### Conversion
- Key-event conversion rate **by funnel step** and step-to-step drop-off (§6.2 for the unsampled version)
- Revenue and **value by attribution model** (compare DDA vs paid-and-organic-last-click side by side)
- CAC and **ROAS** by channel (§6.4)

### Retention
- Weekly/monthly **cohort retention curves** (§6.3)
- Active users (DAU/WAU/MAU) and stickiness (DAU/MAU)
- Churn rate by cohort
- **LTV by acquisition channel** (revenue ÷ customers over the cohort window)

> Sampling note: standard GA4 **Explorations** can sample above ~10M events in the date range; **standard reports** are unsampled but less flexible. When a number must be exact (board decks, finance), source it from **BigQuery**, not an Exploration.

---

## 10. Measurement governance (keep the data trustworthy)

1. **Naming is a contract.** Event names, parameter names, and UTM values come from a single documented spec (a "tracking plan"). New events get added to the plan and reviewed *before* they ship — ad-hoc events with inconsistent names are the root cause of most "the data is wrong" complaints.
2. **One source of truth per metric.** Decide where each number lives (GA4 UI vs BigQuery vs the ad platform) and put it in the dashboard description. Revenue reconciles to the billing system / `stripe-billing`-style source, not GA4, which is a measurement estimate.
3. **PII is prohibited** in GA4 parameters, user properties, and any field sent to Google — no emails, names, phone numbers, raw IPs, or precise addresses. Hash identifiers; redact server-side before MP/sGTM forwarding (§5).
4. **Identity stitching has limits.** `user_id` joins sessions for **logged-in** users only; pre-login and cross-device-without-login traffic is stitched by GA4 modeling/`user_pseudo_id` and is approximate. Don't promise deterministic cross-device journeys you can't deliver.
5. **Consent first.** Denied-by-default for EEA, certified CMP, all four Consent Mode v2 signals wired (§4). Audit that tags are actually blocked pre-consent in GTM Preview. Note that consent gaps make absolute counts under-report; modeling partially fills them.
6. **Change management.** Don't change the reporting time zone, currency, attribution model, or channel groupings casually — each creates a discontinuity. Log such changes (GA4 supports property annotations) and annotate dashboards so analysts don't read a config change as a real trend.
7. **Dashboard ownership.** Every dashboard has a named owner and a review cadence; orphaned dashboards drift and get silently distrusted.

---

## 11. QA / debug checklist (run before declaring tracking "live")

- [ ] **DebugView** (Admin → DebugView, with GTM Preview or the GA Debugger on) shows each event **once** with the expected parameters — no duplicate `page_view`/`purchase`.
- [ ] **Realtime** report shows the event and its key-event flag within ~30s.
- [ ] **Key events** are marked for genuine outcomes only; `purchase` carries `currency` + `value` + a unique `transaction_id`.
- [ ] **Consent**: in GTM Preview, confirm tags are **blocked** before acceptance and **fire** after; all four CMP signals flip on `update`.
- [ ] **Ecommerce**: `dataLayer.push({ ecommerce: null })` precedes each ecommerce push; items array populated.
- [ ] **UTMs**: run the §6.6 QA query — no uppercase/spaces in `source`/`medium`, no null campaigns on paid hits, no internal links carrying UTMs.
- [ ] **Custom dimensions** registered for every parameter you report on (unregistered params won't appear in the GA4 UI).
- [ ] **BigQuery** link active; a `SELECT … _TABLE_SUFFIX = yesterday` query returns rows and the `purchase` revenue ties out to billing within tolerance.
- [ ] **Measurement Protocol** events validated against `/debug/mp/collect` and carrying a matching `client_id` (no orphan sessions).
- [ ] **No PII** anywhere in parameters/user properties (spot-check `event_params` and `user_properties` in BigQuery).

---

## Cross-references

- **Paid-channel setup, bidding, and ad-platform conversion import** → `paid-ads`
- **Email/lifecycle engagement metrics and deliverability** → `email-sequence`
- **Activation, feature adoption, and retention modeling** → `product-led-growth`

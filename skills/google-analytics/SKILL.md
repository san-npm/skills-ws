---
name: google-analytics
description: "GA4 implementation and analysis: event taxonomy, custom dimensions, key events (the 2024 rename of conversions), Google Ads import, GTM + Consent Mode v2, audiences, BigQuery export, and the Data API. Use when setting up GA4, fixing tracking/conversions, building Looker Studio reports, or querying analytics programmatically."
---

# Google Analytics 4

## Workflow

### 1. Measurement Plan

Before touching GA4, define what matters:

| Layer | Question | Example |
|-------|----------|---------|
| Business objective | What's the goal? | Increase trial signups 20% |
| KPI | How do we measure? | Trial signup rate, activation rate |
| Events | What do we track? | `sign_up`, `tutorial_complete`, `plan_selected` |
| Dimensions | What context? | plan_type, referral_source, user_role |

### 2. Event Taxonomy

Use a consistent naming convention. Never use spaces or capitals in event names.

**Naming pattern:** `object_action` (noun_verb)

```
# Core events (auto-collected — don't recreate)
page_view, session_start, first_visit, user_engagement

# Recommended events (use GA4 standard names)
sign_up, login, purchase, add_to_cart, begin_checkout

# Custom events (your business logic)
trial_started
feature_activated
plan_upgraded
invite_sent
onboarding_completed
support_ticket_opened
```

**Implementation (gtag.js):**
```javascript
// Custom event with parameters
gtag('event', 'trial_started', {
  plan_type: 'pro',
  referral_source: 'pricing_page',
  value: 49
});

// User property (set once per user)
gtag('set', 'user_properties', {
  account_type: 'enterprise',
  company_size: '50-200'
});
```

**GTM dataLayer push:**
```javascript
dataLayer.push({
  event: 'plan_upgraded',
  plan_from: 'free',
  plan_to: 'pro',
  mrr_delta: 49
});
```

### 3. GTM Implementation & Consent Mode v2

If you load GA4 through Google Tag Manager (web container), use exactly **one** GA4 base tag plus event tags — never also hardcode `gtag.js` for the same property (that is the #1 cause of doubled events).

**Tag structure:**
- **Google tag** (`G-XXXXXXX`) — fires once on *Initialization - All Pages* (formerly the "GA4 Configuration" tag; renamed to the unified *Google tag*). Set shared fields/user properties here.
- **GA4 Event** tags — one per custom event, triggered by a *Custom Event* trigger matching your `dataLayer` `event` name. Map `dataLayer` values into **Event parameters** (these become GA4 event params; register them as custom definitions — section 4 — to use them in reports).
- Pass enhanced-measurement-overlapping events carefully; disable GA4 enhanced measurement options you are sending manually to avoid duplicates (e.g. don't send a manual `page_view` if enhanced measurement page views are on).

**Consent Mode v2 (required for EEA/UK ad/personalization features and Google Ads remarketing).** Set defaults *before* the Google tag fires (top of `<head>`, or a Consent Initialization trigger in GTM), then update on user choice:

```javascript
// gtag — runs before any tag, defaults to denied
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',        // v2 signal
  ad_personalization: 'denied',  // v2 signal
  analytics_storage: 'denied',
  wait_for_update: 500           // ms to wait for CMP before tags fire
});

// After the user accepts in your CMP:
gtag('consent', 'update', {
  ad_storage: 'granted',
  ad_user_data: 'granted',
  ad_personalization: 'granted',
  analytics_storage: 'granted'
});
```

With consent denied, GA4 uses **cookieless pings** (modeled/behavioral data) rather than dropping data entirely. The two v2 signals `ad_user_data` and `ad_personalization` are mandatory for EEA traffic to keep audiences/remarketing working in Google Ads.

**Server-side GTM** (sGTM, runs in a Cloud Run / App Engine container) caveats:
- Improves data quality and first-party cookie longevity, but does **not** make tracking consent-exempt — you still need a lawful basis and should forward consent state to the server container.
- Set the GA4 client's `transport_url` to your sGTM endpoint; the server container's GA4 client claims the request and forwards to Measurement Protocol.
- Watch for **duplicate events**: if both web GTM and sGTM send the same hit, or you mix `gtag` + sGTM, you double-count. Use a single send path per event.
- Server-side dedup for purchase: include a `transaction_id`; GA4 dedupes `purchase` events with the same `transaction_id` within ~ the same session window.

### 4. Custom Dimensions & Metrics

Register event parameters and user properties as custom definitions in **GA4 Admin → Custom definitions → Create custom dimensions/metrics**.

Important nuance: GA4 *collects* event parameters as soon as you send them, but they are **not queryable as dimensions in standard reports / explorations until you register them** — and registration is **not retroactive** for the standard reporting surface (data flows into a registered dimension only from the time of registration onward). So register early. (BigQuery export and the Data API can access raw parameters without registration; see sections 11–12.) Limits: 50 event-scoped + 25 user-scoped + 50 custom metrics per standard property (more on GA4 360).

| Scope | Dimension | Example values | Use |
|-------|-----------|----------------|-----|
| Event | plan_type | free, pro, enterprise | Segment by plan |
| Event | feature_name | dashboard, export, api | Feature adoption |
| User | account_type | individual, team, enterprise | User segmentation |
| User | signup_source | organic, paid, referral | Acquisition quality |

### 5. Key Events (formerly "Conversions")

**Terminology — get this right or you will miscommunicate with stakeholders.** In March 2024 Google renamed Analytics **conversions → "key events"**. The word *conversion* now means something different in each product:

| Term | Where | Meaning |
|------|-------|---------|
| **Key event** | Google **Analytics** (GA4) | An important action you mark to measure (in reports/explorations). |
| **Conversion** | Google **Ads** | A key event you have promoted for ad bidding/optimization. |

Mark an event as a key event in **GA4 Admin → Data display → Key events → New key event** (or toggle the star on an existing event in the **Events** table). The old "Mark as conversion" toggle no longer exists; the metric in reports is now **Key events** (and `keyEvents` in the Data API — see section 12).


**Primary key events (business-critical):**
- `sign_up` — new account created
- `purchase` — payment completed
- `trial_started` — trial activated
- `plan_upgraded` — expansion revenue

**Micro key events (track for analysis; do NOT promote to Ads conversions / bid on):**
- `onboarding_completed`
- `feature_activated`
- `invite_sent`

#### Importing GA4 key events into Google Ads

Marking an event as a key event in GA4 does **not** by itself make it an Ads conversion — that import is a separate, deliberate step (this is the most common 2026 setup failure):

1. Link the property in **GA4 Admin → Product links → Google Ads links** (enable personalized advertising / auto-tagging).
2. In **Google Ads → Goals → Conversions → Summary → New conversion action → Import → Google Analytics 4 properties**, select the key event(s) to import.
3. In Ads, each imported conversion has its own goal type (Primary = bids on it; Secondary = observe only) and its own attribution/count settings — set these in Ads, **not** GA4.

Caveats (as of Jun 2026; verify at https://support.google.com/analytics/answer/13965727):
- Importing a **non-key** event from GA4 automatically marks it as a key event in GA4.
- Google periodically changes which auto-collected events count as key events by default; if your Ads bidding imports key events from GA4, re-verify your imported conversion list after any GA4 release and don't assume an event (e.g. `begin_checkout`) is still a key event without checking **Admin → Key events**.
- Don't double-count: if you also run a Google Ads conversion tag (gtag/GTM) for the same action, set one of the two to Secondary or you will inflate conversions.

### 6. Audience Segments

Build in **GA4 Admin → Data display → Audiences → New audience**. GA4 audiences are not a free-form SQL filter — they are composed from these exact constructs:

- **Conditions** scoped *Across all sessions* / *Within the same session* / *Within the same event*, combined with AND/OR groups.
- **Sequences** — ordered steps ("A then B"), each directly-followed-by or indirectly-followed-by, optionally time-constrained.
- **Exclusions** — temporarily (while condition met) or permanently remove users.
- **Membership duration** — 1–540 days (default 30); how long a user stays in the audience after qualifying.
- **Metric thresholds** on event *count* and event *parameters* (e.g. `event_count for trial_started > 3`), and conditions on **registered** custom dimensions / user properties (section 4). Raw recency like "last active 30 days ago" is not a field — express recency with the **dynamic lookback** in the date scope, an **exclusion**, or a **predictive audience** instead.
- **Predictive audiences** (require enough conversion volume to train): e.g. *Likely 7-day churning users*, *Likely 7-day purchasers*, *Predicted top spenders* — built on GA4's `churnProbability` / `purchaseProbability` metrics.

Audiences populate from creation forward (mostly **not retroactive**). To use them for **remarketing**, the property must be linked to Google Ads (section 5) with personalized advertising enabled; otherwise they are analysis-only.

| Audience | How to build it in GA4 (exact constructs) | Use |
|----------|-------------------------------------------|-----|
| Active trial users | Across all sessions: `trial_started` event in last 14 days (date scope) AND event_count of `session_start` ≥ 3 | Nurture campaigns |
| Power users | `event_count` of `feature_activated` ≥ 10 (membership duration 30d) | Upsell targeting |
| At-risk paying users | Predictive: *Likely 7-day churning users* AND user property `account_type = paid` | Win-back campaigns |
| High-intent visitors | Sequence: `page_view` where `page_location` contains `/pricing` (≥ 2) → **exclude** users with a `sign_up` event | Retargeting ads |

### 7. Cross-Domain Tracking

For multi-domain setups, configure linking in the UI (**GA4 Admin → Data streams → [web stream] → Configure tag settings → Configure your domains**) rather than hardcoding a linker — the UI writes the cross-domain config into the Google tag for all listed domains. Equivalent in code if you must:

```javascript
gtag('config', 'G-XXXXXXX', {
  linker: {
    domains: ['example.com', 'app.example.com', 'checkout.example.com']
  }
});
```

Also add the other domains to **Admin → Data settings → Data filters / unwanted referrals** so payment/auth domains (e.g. a Stripe checkout) don't start new sessions. Verify in GA4 DebugView — the same session/`session_id` should persist across domains and not restart.

### 8. Attribution Settings

GA4 Admin → Attribution settings:

- **Reporting attribution model:** Data-driven (default). GA4 also still offers two rules-based last-click models: *Paid and organic last click* and *Google paid channels last click*. First click, linear, time decay, and position-based were removed in November 2023.
- **Key-event lookback window:** acquisition key events default 30 days (configurable 7/30); all other key events default 90 days (configurable up to 90).
- **Channel reporting:** uses the **default channel groups** (Cross-network, Paid Search, Organic Social, etc.); create a **custom channel group** if your UTMs don't map cleanly.

### 9. Looker Studio Reporting

Connect GA4 as data source (the GA4 connector now exposes **Key events** and **Session key event rate**, not "Conversions"). Key dashboard pages:

**Overview dashboard:**
- Sessions, users, new users (line chart, 30d trend)
- Session key event rate by channel (bar chart)
- Top landing pages by sessions and key event rate (table)
- Device category breakdown (pie chart)

**Acquisition dashboard:**
- Users by source/medium (table with sparklines)
- Campaign performance (sessions, key events, cost per key event — blend with a Google Ads source for spend/CPA)
- Organic vs paid trend (combo chart)

**Engagement dashboard:**
- Events per session by page (heatmap)
- Feature adoption funnel (custom funnel chart)
- User retention cohort (built-in cohort table)

### 10. Debugging

**GA4 DebugView:** Enable with:
```javascript
gtag('config', 'G-XXXXXXX', { debug_mode: true });
```
Or install the **Google Analytics Debugger** Chrome extension, or use **GTM Preview** mode (which sends debug-flagged hits to DebugView).

**Common issues:**
- Events not showing → DebugView and Realtime are near-instant; standard reports lag (typically a few hours, up to 24–48h). If still missing, check the request fired (Network tab → `/g/collect`) and that an ad-blocker isn't dropping it.
- Duplicate events → double install (GTM + hardcoded gtag), or both web GTM and server-side GTM sending the same hit; consolidate to one send path.
- Key event not counting in Ads → confirm it's marked as a key event in GA4 **and** imported as a conversion in Google Ads (section 5); the two are separate steps.
- Cross-domain breaks → check the configured-domains list and unwanted-referral exclusions (section 7); a restarted session usually means a referral wasn't excluded.
- `(not set)` / `(other)` in reports → unregistered or high-cardinality custom dimensions, or params not sent on every event (section 4).

### 11. BigQuery Export (for serious analysis)

For anything beyond the GA4 UI/Looker — funnel SQL, LTV, stitching to backend data — enable the free **BigQuery Linking** (GA4 Admin → Product links → BigQuery). Standard properties get **daily** export (and optional streaming/intraday); GA4 360 gets fresh-daily + streaming. Data lands in `analytics_<property_id>.events_YYYYMMDD` (+ `events_intraday_*` if streaming is on).

**Schema essentials:**
- One row per **event**. Event params live in the **`event_params`** `REPEATED RECORD` (key + `value.string_value` / `int_value` / `double_value`), so you must UNNEST to read a param.
- `user_pseudo_id` = the device/client identifier (cookieless-ID friendly); `user_id` is your logged-in ID if you set it.
- There is **no `session_id` column** — derive sessions from the `ga_session_id` event param (per `user_pseudo_id`). A session = (`user_pseudo_id`, `ga_session_id`).
- Ecommerce items are in the **`items`** `REPEATED RECORD`; UNNEST to get per-item rows.
- `event_timestamp` is **microseconds** (not millis) since epoch, UTC.

**Pattern — pull one event param and count key events:**
```sql
SELECT
  event_date,
  (SELECT value.string_value
     FROM UNNEST(event_params) WHERE key = 'plan_type') AS plan_type,
  COUNT(*) AS event_count,
  COUNTIF(event_name = 'purchase') AS purchases,
  -- session count = distinct (user, ga_session_id)
  COUNT(DISTINCT CONCAT(
    user_pseudo_id,
    CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key='ga_session_id') AS STRING)
  )) AS sessions
FROM `your_project.analytics_123456789.events_*`
WHERE _TABLE_SUFFIX BETWEEN '20260501' AND '20260531'
GROUP BY event_date, plan_type
ORDER BY event_date;
```

**Common SQL pitfalls:**
- **Always** filter on `_TABLE_SUFFIX` (the wildcard `events_*` scans every day = full-table cost). Combine intraday + daily carefully to avoid double-counting the current day.
- A scalar subquery over `UNNEST(event_params)` returns the *first* match; if a key can repeat, aggregate instead.
- GA4's UI session/engagement metrics won't match naive SQL exactly (the UI applies modeling, late-arriving hits, and its own session logic) — expect small deltas, define your metrics explicitly.
- Revenue: use `ecommerce.purchase_revenue` (or sum `items.item_revenue`); don't sum a generic `value` param across event types.

### 12. GA4 Data API

Query data programmatically (Python `google-analytics-data` library; `BetaAnalyticsDataClient` / `data_v1beta` is still the current GA4 reporting client as of Jun 2026 — verify at https://developers.google.com/analytics/devguides/reporting/data/v1). Authenticate with a service account: create one in Google Cloud, grant it **Viewer** on the GA4 property (Admin → Property access management), and point `GOOGLE_APPLICATION_CREDENTIALS` at its JSON key.

```python
import os
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    RunReportRequest, DateRange, Dimension, Metric,
)

# export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
PROPERTY_ID = "123456789"          # numeric property ID, not "G-XXXX"
client = BetaAnalyticsDataClient()  # picks up ADC from the env var above

def fetch_all_rows(page_size: int = 250_000):
    """Paginate the report; the API defaults to 10,000 rows and caps at 250,000 rows per request."""
    offset = 0
    while True:
        req = RunReportRequest(
            property=f"properties/{PROPERTY_ID}",
            date_ranges=[DateRange(start_date="30daysAgo", end_date="yesterday")],
            dimensions=[Dimension(name="sessionSource"), Dimension(name="sessionMedium")],
            # GA4 metric is `keyEvents` (the renamed `conversions`); use
            # `keyEvents:<event_name>` for a single key event, e.g. `keyEvents:purchase`.
            metrics=[Metric(name="sessions"), Metric(name="keyEvents")],
            limit=page_size,
            offset=offset,
        )
        resp = client.run_report(req)
        for row in resp.rows:
            yield [v.value for v in row.dimension_values] + [v.value for v in row.metric_values]
        # row_count is the total matching rows; stop once we've fetched them all
        offset += len(resp.rows)
        if offset >= resp.row_count or not resp.rows:
            break

for row in fetch_all_rows():
    print(row)
```

**Notes:**
- **Validate metric/dimension names against the property** before hardcoding — available fields (including your registered custom dimensions and any `keyEvents:<name>` you can request) come from `client.get_metadata(name=f"properties/{PROPERTY_ID}/metadata")`. API names are case-sensitive (`keyEvents`, not `KeyEvents`).
- To report a **specific** key event, either request the metric `keyEvents:purchase`, or filter `eventName` with a `dimension_filter` and use the `eventCount` metric.
- Quotas are token-based per property per day/hour; batch with `run_report` `limit`/`offset` as above and cache results rather than re-querying.

## Weekly Audit Checklist

- [ ] Check Realtime for expected event flow
- [ ] Verify key-event counts match backend data (±5% tolerance)
- [ ] Review `(not set)` and `(other)` values in reports — indicates taxonomy / custom-definition gaps
- [ ] Check data freshness in Looker Studio dashboards
- [ ] Confirm Google Ads conversion imports still map to the intended GA4 key events (re-check after any GA4 default-eligibility change)
- [ ] Review audience sizes for remarketing — flag if dropping unexpectedly
- [ ] Audit new events in DebugView (or GTM Preview) before production rollout
- [ ] Confirm Consent Mode v2 signals (`ad_user_data`, `ad_personalization`) fire for EEA traffic

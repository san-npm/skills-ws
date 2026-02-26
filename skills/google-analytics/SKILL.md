---
name: google-analytics
description: "GA4 setup, event taxonomy, custom dimensions, conversion tracking, audience segments, and reporting automation."
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

### 3. Custom Dimensions & Metrics

Register in GA4 Admin → Custom definitions before sending data.

| Scope | Dimension | Example values | Use |
|-------|-----------|----------------|-----|
| Event | plan_type | free, pro, enterprise | Segment by plan |
| Event | feature_name | dashboard, export, api | Feature adoption |
| User | account_type | individual, team, enterprise | User segmentation |
| User | signup_source | organic, paid, referral | Acquisition quality |

### 4. Conversion Tracking

Mark key events as conversions in GA4 Admin → Events → toggle "Mark as conversion."

**High-value conversions:**
- `sign_up` — new account created
- `purchase` — payment completed
- `trial_started` — trial activated
- `plan_upgraded` — expansion revenue

**Micro-conversions (track but don't optimize ads against):**
- `onboarding_completed`
- `feature_activated`
- `invite_sent`

### 5. Audience Segments

Build in GA4 → Audiences for remarketing and analysis:

| Audience | Condition | Use |
|----------|-----------|-----|
| Active trial users | `trial_started` in last 14 days AND `session_count > 3` | Nurture campaigns |
| Power users | `feature_activated` count > 10 in 30 days | Upsell targeting |
| Churned users | `last_active > 30 days` AND `account_type = paid` | Win-back campaigns |
| High-intent visitors | Viewed pricing page 2+ times, no signup | Retargeting ads |

### 6. Cross-Domain Tracking

For multi-domain setups (app.example.com + www.example.com):

```javascript
gtag('config', 'G-XXXXXXX', {
  linker: {
    domains: ['example.com', 'app.example.com', 'checkout.example.com']
  }
});
```

Verify in GA4 DebugView — sessions should NOT restart across domains.

### 7. Attribution Settings

GA4 Admin → Attribution settings:

- **Reporting attribution model:** Data-driven (default, recommended)
- **Lookback window:** 30 days for acquisition, 90 days for other conversions
- **Cross-channel:** Enable for accurate multi-touch attribution

### 8. Looker Studio Reporting

Connect GA4 as data source. Key dashboard pages:

**Overview dashboard:**
- Sessions, users, new users (line chart, 30d trend)
- Conversion rate by channel (bar chart)
- Top landing pages by sessions and conversion rate (table)
- Device category breakdown (pie chart)

**Acquisition dashboard:**
- Users by source/medium (table with sparklines)
- Campaign performance (sessions, conversions, CPA)
- Organic vs paid trend (combo chart)

**Engagement dashboard:**
- Events per session by page (heatmap)
- Feature adoption funnel (custom funnel chart)
- User retention cohort (built-in cohort table)

### 9. Debugging

**GA4 DebugView:** Enable with:
```javascript
gtag('config', 'G-XXXXXXX', { debug_mode: true });
```
Or install GA Debugger Chrome extension.

**Common issues:**
- Events not showing → check real-time report (24-48h processing delay for standard reports)
- Duplicate events → check for double gtag installation (GTM + hardcoded)
- Missing conversions → verify event is marked as conversion AND firing correctly
- Cross-domain breaks → check linker config and excluded referrals

### 10. GA4 Data API

Query data programmatically:
```python
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import RunReportRequest, DateRange, Dimension, Metric

client = BetaAnalyticsDataClient()
request = RunReportRequest(
    property=f"properties/{PROPERTY_ID}",
    date_ranges=[DateRange(start_date="30daysAgo", end_date="today")],
    dimensions=[Dimension(name="sessionSource"), Dimension(name="sessionMedium")],
    metrics=[Metric(name="sessions"), Metric(name="conversions")],
)
response = client.run_report(request)
for row in response.rows:
    print(row.dimension_values[0].value, row.metric_values[0].value)
```

## Weekly Audit Checklist

- [ ] Check real-time for expected event flow
- [ ] Verify conversion counts match backend data (±5% tolerance)
- [ ] Review (not set) and (other) values in reports — indicates taxonomy gaps
- [ ] Check data freshness in Looker Studio dashboards
- [ ] Review audience sizes for remarketing — flag if dropping unexpectedly
- [ ] Audit new events in DebugView before production rollout

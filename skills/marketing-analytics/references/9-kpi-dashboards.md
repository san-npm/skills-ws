## Contents

- 9. KPI dashboards
- Acquisition
- Engagement
- Conversion
- Retention

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

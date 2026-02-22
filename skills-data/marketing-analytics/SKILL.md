---
name: marketing-analytics
description: "GA4 setup, UTM strategy, conversion tracking, attribution modeling (first-touch, last-touch, linear, time-decay, data-driven), KPI dashboards, event taxonomy, GTM implementation. Use when setting up Google Analytics, creating UTM conventions, implementing conversion tracking, building marketing dashboards, choosing attribution models, or designing event taxonomies."
---

# Marketing Analytics

## GA4 Setup

### Event Taxonomy

Design events in a consistent `object_action` pattern:
```
page_view, session_start, first_visit
form_submit, form_start, form_error
button_click, link_click, cta_click
signup_start, signup_complete
purchase_start, purchase_complete
feature_use, feature_activate
content_view, content_scroll, content_share
```

### Key Events (Conversions)
Mark as conversions in GA4:
- `signup_complete` — new account creation
- `purchase_complete` — transaction
- `demo_request` — high-intent lead
- `trial_start` — trial activation
- `contact_submit` — contact form

### Enhanced Measurement
Enable in GA4 settings: page views, scrolls, outbound clicks, site search, file downloads, video engagement.

### Custom Dimensions
- `user_type`: free, trial, paid, churned
- `traffic_source_detail`: granular source tracking
- `content_category`: blog, docs, landing, product
- `experiment_variant`: A/B test tracking

Full setup guide: [references/ga4-setup.md](references/ga4-setup.md)

## UTM Strategy

### Convention
```
utm_source = platform (google, facebook, linkedin, newsletter)
utm_medium = channel type (cpc, social, email, referral)
utm_campaign = campaign name (spring-sale-2026, product-launch)
utm_content = creative variant (hero-image-a, cta-blue)
utm_term = keyword (only for paid search)
```

### Rules
- All lowercase, hyphens not underscores
- Consistent naming across team (document in shared sheet)
- Never use UTMs on internal links (breaks session attribution)
- Tag every external link: ads, emails, social posts, partner links

Full conventions: [references/utm-conventions.md](references/utm-conventions.md)

## Attribution Models

| Model | How It Works | Best For |
|-------|-------------|----------|
| Last Click | 100% credit to last touchpoint | Bottom-funnel optimization |
| First Click | 100% credit to first touchpoint | Understanding acquisition |
| Linear | Equal credit to all touchpoints | Balanced view |
| Time Decay | More credit to recent touchpoints | Long sales cycles |
| Position-Based | 40% first, 40% last, 20% middle | Most balanced default |
| Data-Driven | ML-based, GA4 default | 1000+ conversions/month |

Recommendation: Use data-driven if you have the volume. Otherwise, position-based is the best default.

Details: [references/attribution-models.md](references/attribution-models.md)

## KPI Dashboard

### Acquisition
- Sessions by source/medium
- New vs returning users
- Cost per acquisition (CPA) by channel
- Landing page conversion rates

### Engagement
- Pages per session
- Average engagement time
- Bounce rate by page
- Scroll depth (25%, 50%, 75%, 100%)

### Conversion
- Conversion rate by funnel step
- Drop-off between steps
- Revenue by attribution model
- Customer acquisition cost (CAC)

### Retention
- Cohort retention curves
- Monthly active users (MAU)
- Churn rate by cohort
- Customer lifetime value (CLV)

## References

- [references/ga4-setup.md](references/ga4-setup.md) — Complete GA4 implementation guide
- [references/utm-conventions.md](references/utm-conventions.md) — UTM naming standards and examples
- [references/attribution-models.md](references/attribution-models.md) — Deep dive on each model with examples

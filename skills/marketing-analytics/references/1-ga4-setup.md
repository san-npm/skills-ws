## Contents

- 1. GA4 Setup
- 1.1 Property → stream → tag, in order
- 1.2 Event taxonomy
- 1.3 Key events (formerly "conversions")
- 1.4 Enhanced Measurement
- 1.5 Custom dimensions & user properties

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

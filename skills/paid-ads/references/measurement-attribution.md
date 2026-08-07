## Contents

- Measurement & Attribution
- Attribution Models
- What to Track
- UTM Parameter Standard
- Post-Click Tracking Setup
- Privacy & Signal Loss (post-iOS, cookie deprecation, consent)

## Measurement & Attribution

### Attribution Models

**Reality check (as of Jun 2026):** Google deprecated first-click, linear, time-decay, and position-based attribution across Google Ads and GA4 in 2023. The only models you can actually *select* for conversions today are **data-driven (default)** and **last click**. The legacy models survive only as analytical lenses in third-party tools (e.g., a CRM, an MMP, or warehouse-native attribution) — never assume you can switch to them inside Google Ads.

| Model | How It Works | Status (Jun 2026) | Best For |
|-------|-------------|-------------------|----------|
| Data-Driven (DDA) | ML assigns fractional credit by measured contribution | **Active — Google/GA4 default** | Default for everyone; needs enough conversion volume to model, otherwise silently falls back to last click |
| Last Click | 100% credit to final ad-clicked touchpoint | **Active in Google Ads/GA4** | Short cycles, direct response, low-volume accounts where DDA can't model |
| First Click | 100% credit to discovery touchpoint | **Removed from Google** — third-party analytics only | Top-of-funnel analysis outside Google |
| Linear | Equal credit to all touchpoints | **Removed from Google** — third-party only | Full-journey lens in MMP/warehouse |
| Time Decay | More credit to recent touchpoints | **Removed from Google** — third-party only | Long-cycle lens in MMP/warehouse |
| Position-Based (U-shaped) | 40% first, 40% last, 20% middle | **Removed from Google** — third-party only | Balanced lens in MMP/warehouse |

Meta uses its own attribution settings (default **7-day click / 1-day view**) configured per ad set, independent of Google's models. For cross-channel truth, reconcile platform-reported conversions against a single source (GA4, CRM, or an MMP) plus periodic incrementality tests — platforms each over-claim credit for the same conversion.

### What to Track

**Conversion actions (set up BEFORE launching ads):**

```
PRIMARY (optimize toward these):
- Purchase / Signup / Demo booked / Lead form submitted

SECONDARY (observe, don't optimize):
- Add to cart / Pricing page view / Key page engagement
- Phone calls / Chat initiated

MICRO (for funnel analysis):
- Video views / Content downloads / Email signups
```

### UTM Parameter Standard

```
utm_source=google|meta|linkedin|twitter
utm_medium=cpc|paid-social|display|video
utm_campaign={campaign_name}
utm_content={ad_name_or_variant}
utm_term={keyword} (Google only)
```

Naming convention: `platform_objective_audience_creative`
Example: `meta_conversions_lal1pct_ugc-testimonial-v2`

### Post-Click Tracking Setup

1. **Google Ads:** Install Google tag + enhanced conversions
2. **Meta:** Pixel + Conversions API (server-side) — CAPI is essential post-iOS 14.5
3. **LinkedIn:** Insight Tag + offline conversion uploads for long sales cycles
4. **GA4:** Link to Google Ads, import conversions, set up audiences
5. **CRM integration:** Pass GCLID/FBCLID to CRM for closed-loop attribution

### Privacy & Signal Loss (post-iOS, cookie deprecation, consent)

The 2021 iOS App Tracking Transparency era was just the start; by 2026 the binding constraints are server-side data quality, consent enforcement, and platform modeling — not the pixel alone.

**Meta:**
- **Conversions API (CAPI) is mandatory, not optional** — run it alongside the pixel (or via the **Conversions API Gateway**, Meta's self-hosted server-side relay) so server events backstop browser signal loss. Deduplicate with a shared `event_id` on both pixel and CAPI events, or you'll double-count.
- **Event Match Quality (EMQ)** is the number that matters now — pass hashed email, phone, name, IP, `fbc`/`fbp`, and external ID. Aim for an EMQ of **6.0+/10** per event; low EMQ is the #1 cause of "CAPI didn't help."
- **Aggregated Event Measurement (AEM):** the old 8-events-per-domain cap and manual priority ranking are gone; Meta now processes all eligible events automatically. The lever today is event schema consistency (same `event_id`, value, currency across Pixel and CAPI) rather than event ranking.
- **Value optimization & VBO** need clean revenue values on the Purchase event; without them you can't bid to ROAS.
- **Advantage+** placements/audiences and **Advantage+ sales campaigns** (formerly Advantage+ Shopping, renamed Feb 2025; setup is now a streamlined flow with an Advantage+ "on" state) lean on modeled + broad signals, so feed them strong server-side conversions and a good product catalog rather than over-narrowing the audience.

**Google:**
- **Enhanced Conversions** (hashed first-party data) + **Consent Mode v2** (required in the EEA/UK to keep modeling and personalization) recover signal as third-party cookies erode. Without Consent Mode v2, EEA conversion data and remarketing degrade sharply.
- Server-side tagging (sGTM) improves durability and data control.

**All platforms:**
- **First-party data** (email/CRM lists, server-side events, logged-in IDs) is now your most valuable targeting and matching asset.
- **Modeled reporting:** Platform-reported conversions include modeled/estimated conversions — they are *estimates*, not deterministic counts. Expect **20-40% underreporting** of true incremental impact on Meta when only browser-side. Validate with **geo holdout / conversion-lift / incrementality tests**, not last-click dashboards.

---

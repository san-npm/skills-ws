---
name: marketing-analytics
description: "Marketing measurement on GA4/GTM: event taxonomy, ecommerce dataLayer, key events, Consent Mode v2, server-side tagging/Measurement Protocol, UTMs, 2026 attribution, BigQuery SQL, dashboards. Use when setting up GA4/GTM, UTMs, key-event/conversion tracking, attribution, dashboards, funnel/cohort analysis, BigQuery exports, or consent compliance."
---
# Marketing Analytics

A standalone implementation guide for instrumenting, validating, and analyzing marketing measurement on the modern Google stack (GA4 + Google Tag Manager + server-side tagging + BigQuery), plus the UTM, attribution, and governance discipline that keeps the data trustworthy. For paid-channel optimization see the `paid-ads` skill; for lifecycle/email metrics see `email-sequence`; for activation/retention metrics see `product-led-growth`.

> **2026 context.** GA4 is the only Google Analytics product (Universal Analytics was shut off July 2023). Three things below changed recently and trip people up: (1) GA4 retired first-click/linear/time-decay/position-based attribution in **Nov 2023**, and an **Apr 2026** restructure pushed reporting further toward data-driven and changed default windows; (2) **Consent Mode v2** (four signals) is required for EEA traffic via a Google-certified CMP, and from **June 15 2026** the GA4 *Google Signals* toggle no longer governs Google Ads data; Consent Mode (`ad_storage`) becomes the authority for what reaches Ads; (3) data-driven attribution silently falls back to last-click below roughly **400 conversions for a given key event** (within the lookback window), not the old ~1,000 thinking. The attribution models page (https://support.google.com/analytics/answer/10596866) documents the current model list; the DDA data requirements and 2026 changes are documented separately in Analytics Help, so confirm the current threshold there before quoting it to a client.

---

## Reference guide

Read only the references needed for the current request:

- **1. GA4 Setup**: [references/1-ga4-setup.md](references/1-ga4-setup.md)
- **2. Ecommerce & gtag/dataLayer payloads**: [references/2-ecommerce-gtag-datalayer-payloads.md](references/2-ecommerce-gtag-datalayer-payloads.md)
- **3. Google Tag Manager (web) implementation**: [references/3-google-tag-manager-web-implementation.md](references/3-google-tag-manager-web-implementation.md)
- **4. Consent Mode v2 (required for EEA, and best practice everywhere)**: [references/4-consent-mode-v2-required-for-eea-and-best-practice-everywhere.md](references/4-consent-mode-v2-required-for-eea-and-best-practice-everywhere.md)
- **5. Server-side tagging & Measurement Protocol**: [references/5-server-side-tagging-measurement-protocol.md](references/5-server-side-tagging-measurement-protocol.md)
- **6. BigQuery export — your unsampled source of truth**: [references/6-bigquery-export-your-unsampled-source-of-truth.md](references/6-bigquery-export-your-unsampled-source-of-truth.md)
- **7. UTM strategy**: [references/7-utm-strategy.md](references/7-utm-strategy.md)
- **8. Attribution (GA4, 2026)**: [references/8-attribution-ga4-2026.md](references/8-attribution-ga4-2026.md)
- **9. KPI dashboards**: [references/9-kpi-dashboards.md](references/9-kpi-dashboards.md)
- **10. Measurement governance (keep the data trustworthy)**: [references/10-measurement-governance-keep-the-data-trustworthy.md](references/10-measurement-governance-keep-the-data-trustworthy.md)
- **11. QA / debug checklist (run before declaring tracking "live")**: [references/11-qa-debug-checklist-run-before-declaring-tracking-live.md](references/11-qa-debug-checklist-run-before-declaring-tracking-live.md)
- **Cross-references**: [references/cross-references.md](references/cross-references.md)

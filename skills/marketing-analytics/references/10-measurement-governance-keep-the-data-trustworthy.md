## 10. Measurement governance (keep the data trustworthy)

1. **Naming is a contract.** Event names, parameter names, and UTM values come from a single documented spec (a "tracking plan"). New events get added to the plan and reviewed *before* they ship — ad-hoc events with inconsistent names are the root cause of most "the data is wrong" complaints.
2. **One source of truth per metric.** Decide where each number lives (GA4 UI vs BigQuery vs the ad platform) and put it in the dashboard description. Revenue reconciles to the billing system / `stripe-billing`-style source, not GA4, which is a measurement estimate.
3. **PII is prohibited** in GA4 parameters, user properties, and any field sent to Google — no emails, names, phone numbers, raw IPs, or precise addresses. Hash identifiers; redact server-side before MP/sGTM forwarding (§5).
4. **Identity stitching has limits.** `user_id` joins sessions for **logged-in** users only; pre-login and cross-device-without-login traffic is stitched by GA4 modeling/`user_pseudo_id` and is approximate. Don't promise deterministic cross-device journeys you can't deliver.
5. **Consent first.** Denied-by-default for EEA, certified CMP, all four Consent Mode v2 signals wired (§4). Audit that tags are actually blocked pre-consent in GTM Preview. Note that consent gaps make absolute counts under-report; modeling partially fills them.
6. **Change management.** Don't change the reporting time zone, currency, attribution model, or channel groupings casually — each creates a discontinuity. Log such changes (GA4 supports property annotations) and annotate dashboards so analysts don't read a config change as a real trend.
7. **Dashboard ownership.** Every dashboard has a named owner and a review cadence; orphaned dashboards drift and get silently distrusted.

---

## Contents

- 4. Consent Mode v2 (required for EEA, and best practice everywhere)
- 4.1 Default + update (gtag) — set the default first, synchronously

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

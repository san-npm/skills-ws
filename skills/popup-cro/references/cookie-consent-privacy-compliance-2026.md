## Contents

- Cookie Consent & Privacy Compliance (2026)
- Consent Matrix — what each regime requires before you fire popups/pixels
- GPC (Global Privacy Control) — required, not optional
- Email capture is NOT exempt from consent
- Compliant lead-form copy & structure
- Consent Mode & cookieless / privacy-preserving measurement (2024–2026)
- Cookie Consent + Marketing Popup Coordination
- Implementation Pattern

## Cookie Consent & Privacy Compliance (2026)

> **Not legal advice.** Privacy law varies by jurisdiction and changes often. Validate your specific banner, consent records, and email-capture flow with privacy counsel and your DPO before launch. This section reflects the regime as of Jun 2026.

### Consent Matrix — what each regime requires before you fire popups/pixels

| Regime | Model | Before non-essential cookies/tracking | Marketing email capture |
|--------|-------|----------------------------------------|--------------------------|
| **GDPR (EU/EEA)** | Opt-in | Explicit, freely-given, granular consent. No pre-checked boxes, no "consent walls" that force acceptance. "Reject all" must be as easy as "Accept all" (equal prominence, same number of clicks — enforced by EU DPAs and EDPB). Store proof of consent. | Lawful basis required (usually consent or, narrowly, soft opt-in for existing customers' similar products). Privacy notice + named controller at point of capture. |
| **ePrivacy Directive (EU)** | Opt-in | Consent required before storing/reading ANY non-essential cookie or using device storage (localStorage, fingerprinting, pixels) — independent of whether data is "personal." | Soft opt-in allowed in some member states for existing customers only. |
| **UK GDPR + PECR** | Opt-in | Same opt-in standard as EU. ICO actively enforces "reject all" parity and cookie-wall rules. | Soft opt-in for existing customers buying similar goods/services; otherwise consent. |
| **CPRA/CCPA (California)** | Opt-out | May set cookies, but must honor **"Do Not Sell or Share My Personal Information"** (the CPRA-era label — *not* the old "Do Not Sell") and respect **Global Privacy Control (GPC)** as a valid opt-out signal automatically. "Sharing" includes cross-context behavioral/targeted advertising, so most ad pixels count. Provide a **"Limit the Use of My Sensitive Personal Information"** link if you process SPI. | Notice at collection required; opt-out of sale/share applies if email is shared with ad partners. |
| **Other US states** (e.g. VA/CO/CT/UT and the 15+ states live by 2026) | Opt-out | Most require honoring opt-out of targeted advertising and a universal opt-out signal (GPC); several require opt-**in** for sensitive data. Treat GPC as mandatory across US traffic. | Notice + opt-out of targeted-ad sharing. |
| **Brazil (LGPD), Canada (CASL/PIPEDA), etc.** | Mixed | LGPD ~ GDPR-style consent. CASL requires express (or limited implied) consent for commercial email. | Jurisdiction-specific — geo-gate or apply strictest applicable standard. |

### GPC (Global Privacy Control) — required, not optional

Under CPRA and most newer US state laws, an opt-out preference signal (GPC) sent by the browser **must be treated as a valid opt-out of sale/share** without any user action in your banner. Detect and honor it:

```javascript
// Treat GPC as an opt-out signal before loading ad/sharing pixels
const gpcOptOut = navigator.globalPrivacyControl === true;
if (gpcOptOut) {
  // Do NOT load ad-tech that "sells/shares" data; suppress targeting pixels.
  // You may still set strictly-necessary + first-party functional cookies.
  disableAdvertisingTags();
}
```

### Email capture is NOT exempt from consent

> **Correction to a common myth:** collecting an email via a popup is a direct user action, but that does **not** exempt marketing email from privacy law. Sending marketing email still requires a **lawful basis** (consent, or a narrow "soft opt-in" for existing customers buying similar products in EU/UK), a **privacy notice** at the point of capture, and — under CAN-SPAM/CASL/GDPR — a working unsubscribe. Where you intend to use the email for marketing, get a **separate, unchecked opt-in** and keep proof of it.

### Compliant lead-form copy & structure

```
HEADLINE: Get 15% off your first order
FORM:
  [ Email input ]
  [ ] Yes, email me offers and news. (UNCHECKED by default — required in EU/UK)
  [ Claim My Discount ]
MICROCOPY (below button, small):
  We'll email you a code now. By subscribing you agree to our
  Privacy Policy [link]. Unsubscribe anytime. We never sell your data.
```

Rules:
- **Unchecked** marketing-consent checkbox wherever consent is the lawful basis (EU/EEA/UK, and safest default globally). Pre-ticked boxes are invalid (CJEU *Planet49*).
- **Link the privacy notice** at the point of capture; name who you are.
- **Separate the transaction from the subscription.** "Email me the code" (service) ≠ "subscribe me to marketing" (consent) — let the user opt into each.
- **Double opt-in** is best practice for deliverability and is effectively required to prove consent in strict regimes; trigger a confirmation email before adding to marketing lists.
- **Data minimization:** ask for email only unless a field is genuinely needed. Don't collect phone/DOB "just in case."
- **Honor unsubscribe + suppression** immediately; never re-import unsubscribed contacts.

### Consent Mode & cookieless / privacy-preserving measurement (2024–2026)

Ad and analytics platforms now expect a **consent signal** rather than just a cookie. Wire your banner into it and design for a cookieless baseline:

- **Google Consent Mode v2** (required to use Google Ads audiences/remarketing in the EEA): set `ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization` to `denied` by default, then update on consent. With consent denied, Google sends **cookieless pings** for modeled conversions.

```javascript
// Default DENIED until the user consents (Consent Mode v2)
gtag('consent', 'default', {
  ad_storage: 'denied',
  analytics_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
});
// On "Accept" in your banner:
function grantConsent() {
  gtag('consent', 'update', {
    ad_storage: 'granted',
    analytics_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
  });
}
```

- For popup measurement that survives consent denial, prefer **first-party, server-side, and aggregate/modeled** signals over third-party cookies: server-side tagging, first-party event logging keyed to a first-party ID, or privacy-preserving analytics (e.g. cookieless/EU-hosted tools). Treat third-party-cookie data as a declining, consent-gated bonus — not the source of truth.
- Always check vendor docs for the current required parameters; APIs here change frequently. Verify Consent Mode fields at the Google Tag/Ads consent docs before shipping.

### Cookie Consent + Marketing Popup Coordination

```
PAGE LOAD:
├── Show cookie consent banner/popup FIRST
├── Wait for user response
│   ├── Accepted all → Enable tracking, allow marketing popups
│   ├── Accepted necessary only → No tracking, still show popups
│   │   (but don't track popup interactions)
│   └── No response → Don't fire tracking pixels in popups
│
├── AFTER cookie consent resolved:
│   └── Apply normal popup trigger logic (time, scroll, exit intent)
│
└── NEVER show cookie consent AND marketing popup simultaneously
```

### Implementation Pattern

```javascript
// Check consent before showing tracked popups
function showPopup(popupId) {
  const popup = getPopupConfig(popupId);

  // Always show the popup itself
  renderPopup(popup);

  // Only track if consent given
  if (hasTrackingConsent()) {
    trackEvent('popup_shown', { id: popupId });
  }
}

function onPopupSubmit(popupId, email, marketingConsent) {
  // The email submission itself is a direct user action — but you still need a
  // lawful basis + privacy notice to use it (see Compliance section above).
  // Only add to a MARKETING list if the user ticked the opt-in.
  submitTransactionalEmail(email);        // e.g. send the discount code (service)
  if (marketingConsent) {
    subscribeToMarketingList(email);      // separate, explicit opt-in
  }

  // Analytics on the conversion event is "tracking" — gate it on tracking consent.
  if (hasTrackingConsent()) {
    trackEvent('popup_converted', { id: popupId });
  }
}
```

---

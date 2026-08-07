## 🔐 Consent-Safe Analytics (read before shipping any tracking)

CRO instrumentation is **personal-data processing**. In the EU/UK, the **ePrivacy Directive** requires *prior, informed, opt-in consent* before non-essential storage/reads (analytics cookies, `localStorage`, fingerprinting); **GDPR** governs the resulting data; California's **CPRA** grants opt-out + "Do Not Sell/Share" (honor **Global Privacy Control**). Practical rules for every snippet below:

- **Gate on a CMP.** Don't fire analytics/heatmap collection until a Consent Management Platform reports consent for the analytics purpose. With GA4, use **Consent Mode v2** (`ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization`) so events are withheld/cookieless until granted.
- **Minimize.** Never send raw text the user typed, full URLs with query tokens, emails, or precise coordinates that could re-identify. Send element selectors/ids and *bucketed* values. Truncate IPs; don't log `User-Agent` verbatim.
- **No durable IDs without consent.** Use a per-session random id (regenerated each session), not a persistent cross-site identifier. Hash any necessary identifier server-side with a rotating salt.
- **Sample.** You don't need 100% of traffic for heatmaps — sample (e.g., 10–25%) to cut data volume, cost, and privacy surface.
- **Retention & rights.** Set short retention (GA4 caps event data at 14 months; choose the shortest that's useful). Be able to honor access/delete requests; document processing in your privacy policy and DPA.
- **Respect signals.** Skip non-essential tracking when `navigator.globalPrivacyControl === true` or `navigator.doNotTrack === '1'`.

```javascript
// Single source of truth other snippets call before collecting anything.
function analyticsAllowed() {
  if (navigator.globalPrivacyControl === true) return false; // GPC opt-out
  // Replace with your CMP's API (OneTrust, Cookiebot, Osano, Klaro, etc.):
  return window.__consent?.analytics === true;
}
// Per-session, non-persistent id — NOT a cross-site tracker.
function sessionId() {
  let id = sessionStorage.getItem('sid');
  if (!id) { id = crypto.randomUUID(); sessionStorage.setItem('sid', id); }
  return id;
}
const SAMPLE_RATE = 0.2;                       // 20% of sessions
const SAMPLED = Math.random() < SAMPLE_RATE;
```

## Contents

- Segmented Popups by Traffic Source
- Strategy
- Popup Content by Source

## Segmented Popups by Traffic Source

### Strategy

Show different popups based on where the visitor came from:

```javascript
function getPopupBySource() {
  const urlParams = new URLSearchParams(window.location.search);
  const source = urlParams.get('utm_source');
  const referrer = document.referrer;

  // Paid traffic — they've seen an ad, reinforce the offer
  if (source === 'google' || source === 'meta') {
    return 'popup-paid-offer'; // Match the ad's promise
  }

  // Organic search — they're researching, offer education
  if (referrer.includes('google.com') || referrer.includes('bing.com')) {
    return 'popup-content-upgrade'; // Related guide or checklist
  }

  // Social media — they're browsing, use social proof
  // Note: X traffic usually arrives with a t.co referrer (twitter.com kept as legacy fallback)
  if (referrer.includes('x.com') || referrer.includes('t.co') || referrer.includes('twitter.com') || referrer.includes('linkedin.com')) {
    return 'popup-social-proof'; // "Join X others" angle
  }

  // Referral traffic — trust is transferred, go direct
  if (referrer && !referrer.includes(window.location.hostname)) {
    return 'popup-welcome-offer';
  }

  // Direct / returning visitor
  return 'popup-default';
}
```

### Popup Content by Source

| Source | Popup Type | Messaging Angle |
|--------|-----------|-----------------|
| Google Ads | Offer reinforcement | Mirror ad copy, repeat offer |
| Meta Ads | Social proof + offer | "Join X others", discount |
| Organic Search | Content upgrade | "Get the complete guide" |
| Social Media | Community-focused | "Join our community of X" |
| Email | Personalized | "Welcome back, [Name]" |
| Referral | Trust transfer | "Recommended by [source]" |
| Direct/Returning | Loyalty or new offer | "What's new" or "Welcome back" |
| Product Hunt | Launch special | Exclusive deal for PH visitors |

---

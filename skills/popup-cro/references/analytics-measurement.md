## Contents

- Analytics & Measurement
- Key Metrics to Track
- Tracking Implementation

## Analytics & Measurement

### Key Metrics to Track

> "Rough range" below = directional heuristic, not a target. Benchmark against your own historical numbers and segment by device/source.

| Metric | How to Calculate | Rough range |
|--------|-----------------|-----------|
| Impression rate | Popups shown / page views | Depends on triggers |
| Conversion rate | Submissions / impressions | 2-5% (email), 5-15% (click) |
| Close rate | Dismissals / impressions | 70-90% (normal) |
| Impact on bounce rate | Compare bounce rate with/without popup | Should not increase >5% |
| Revenue per popup impression | Revenue attributed / impressions | Track over time |
| Email quality | Open rate of popup-captured emails | Often ~within 80% of other opt-in sources; compare to *your* baselines |

### Tracking Implementation

```javascript
// Track popup events in GA4
function trackPopupEvent(action, popupId, label) {
  gtag('event', 'popup_' + action, {
    popup_id: popupId,
    popup_label: label,
    page_path: window.location.pathname,
    traffic_source: getTrafficSource()
  });
}

// Events to track:
trackPopupEvent('impression', 'exit-discount', 'shown');
trackPopupEvent('close', 'exit-discount', 'dismissed');
trackPopupEvent('conversion', 'exit-discount', 'email_submitted');
trackPopupEvent('cta_click', 'exit-discount', 'claim_discount');
```

---

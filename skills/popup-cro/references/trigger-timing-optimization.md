## Contents

- Trigger Timing Optimization
- Time-Based Triggers
- Scroll-Depth Triggers
- Combined Triggers (Most Effective)

## Trigger Timing Optimization

### Time-Based Triggers

| Delay | Best For | Why |
|-------|----------|-----|
| 0-3 seconds | Returning visitors with known intent | They know the site |
| 5-10 seconds | Promotional offers, announcements | Enough time to register the page |
| 15-30 seconds | Lead magnets, newsletter signup | User is engaged with content |
| 45-60 seconds | Complex offers, course signups | Deep engagement proven |
| 60+ seconds | Surveys, feedback requests | Only for highly engaged visitors |

**Rule of thumb:** If your average time on page is X seconds, trigger at 30-50% of X.

### Scroll-Depth Triggers

```
BLOG POST / CONTENT PAGE:
├── 25% scroll → Too early (still scanning)
├── 50% scroll → Good for content upgrades ✓
├── 75% scroll → Best for newsletter signup ✓
└── 90% scroll → Good for related content / next CTA ✓

LANDING PAGE:
├── After hero section → Inline CTA (not popup)
├── After social proof section → Slide-in offer
├── After pricing section → Exit intent
└── Footer area → Sticky bottom CTA

ECOMMERCE PRODUCT PAGE:
├── Below product images → Don't interrupt browsing
├── Below reviews → Popup: discount or free shipping
├── Exit intent → Cart save or discount offer
```

### Combined Triggers (Most Effective)

```javascript
// Show popup when: 30+ seconds on page AND scrolled 50%+
let timeReached = false;
let scrollReached = false;
let combinedShown = false;

function fireOnce() {
  if (!combinedShown) {
    combinedShown = true;
    showPopup();
  }
}

setTimeout(() => {
  timeReached = true;
  if (scrollReached) fireOnce();
}, 30000);

window.addEventListener('scroll', () => {
  const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
  if (scrollPercent >= 50) {
    scrollReached = true;
    if (timeReached) fireOnce();
  }
});
```

---

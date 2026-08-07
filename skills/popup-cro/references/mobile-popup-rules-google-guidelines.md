## Contents

- Mobile Popup Rules (Google Guidelines)
- What Google Penalizes (Intrusive Interstitials)
- What's Generally Allowed — with caveats
- Mobile-Safe Popup Guidelines
- Mobile Popup CSS Pattern

## Mobile Popup Rules (Google Guidelines)

> The "intrusive interstitial" signal specifically targets the experience when a user **arrives on a page from mobile search**. It's one input among many in Google's broader page-experience assessment — it won't single-handedly tank a strong page, but it can blunt rankings and it hurts real UX/conversions regardless of SEO. There is no public "delay = safe" threshold; judge by how much content the interstitial obscures and when.

### What Google Penalizes (Intrusive Interstitials)

The signal targets popups seen by a user landing from search that:

- **Cover the main content** immediately on arrival or right after a small scroll
- **Standalone interstitials** the user must dismiss before they can read the content
- **Above-the-fold layouts** where the content is pushed down by an interstitial-like section

### What's Generally Allowed — with caveats

✅ **Legally-required notices** — cookie consent, or age verification where it is **actually required** for that content/jurisdiction (alcohol, gambling, adult content). These get latitude *only* if proportionate and not used as a pretext to wall off content.
✅ **Login/paywall walls** for genuinely gated/private content.
✅ **Banners** using a "reasonable amount of screen space" that are easily dismissible.
✅ **Popups triggered by an explicit user action** (e.g. the user taps "Get the discount").

⚠️ **Engagement-delayed popups are NOT automatically safe.** A full-screen overlay that fires after 10s or a 50% scroll still obscures content and can both harm UX/INP and risk the interstitial signal — especially for users who arrived from search. Delay reduces *false triggers*, not the obscuring problem. For search-landing pages, prefer a **dismissible banner or small bottom slide-in** over any content-covering overlay; reserve full overlays for return visits, in-app, or user-initiated flows.

> **Age verification ≠ "always OK".** It is required only for specific regulated content. Don't gate ordinary pages behind an age gate as a popup workaround — that reads as an interstitial and adds friction with no legal cover.

### Mobile-Safe Popup Guidelines

```
DO:
├── Use banners (top or bottom) — max 15-20% of screen height
├── Use slide-ins from bottom — small, dismissible
├── Trigger after meaningful engagement (30s+ or 50%+ scroll)
├── Make close button large and obvious (min 44x44px tap target)
├── Ensure popup is fully responsive
└── Test on actual mobile devices

DON'T:
├── Show full-screen overlay on page load
├── Use popups that are hard to dismiss on mobile
├── Cover content before user has scrolled
├── Use tiny close buttons (frustrating on touch)
├── Show popup immediately on mobile landing pages from search
├── Inject a layout-shifting popup without reserved space (hurts CLS)
└── Stack multiple popups
```

**Core Web Vitals impact:** popups touch every CWV metric. (1) **CLS** — a popup that pushes content reflows the page; render it as a fixed/absolute overlay so it doesn't shift layout, or reserve its space. (2) **INP** — heavy popup JS (especially anything that blocks the main thread on first interaction) degrades responsiveness; lazy-load popup code and defer non-critical work. (3) **LCP** — never let popup assets compete with the hero image; load popup images only after the trigger. Measure popup-on vs popup-off in field data (CrUX/RUM), not just lab tools.

### Mobile Popup CSS Pattern

```css
/* Mobile-safe bottom slide-in */
.mobile-popup {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 40vh; /* Never cover more than 40% of screen */
  background: white;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -4px 20px rgba(0,0,0,0.15);
  padding: 20px;
  z-index: 9999;
  transform: translateY(100%);
  transition: transform 0.3s ease-out;
}

.mobile-popup.visible {
  transform: translateY(0);
}

.mobile-popup .close-btn {
  min-width: 44px;
  min-height: 44px; /* Minimum tap target per WCAG */
  position: absolute;
  top: 12px;
  right: 12px;
}
```

---

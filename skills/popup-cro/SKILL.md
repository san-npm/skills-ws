---
name: popup-cro
description: "Popup, modal, slide-in, and banner conversion optimization — exit intent, lead capture, cookie consent, mobile-friendly (Google interstitial-safe). Use when user mentions popup, modal, overlay, slide-in, exit intent, lead-capture, or announcement banner."
---

# Popup CRO — Expert Playbook

## When to Use This Skill

- Creating or optimizing popups, modals, slide-ins, or banners
- Implementing exit intent detection
- Designing lead capture popups
- Setting up announcement or promotion banners
- A/B testing popup variations
- Fixing mobile popup issues (Google interstitial penalties)
- Cookie consent popup integration

---

## Popup Types & When to Use Each

> The conversion ranges below are **rough industry heuristics, not guarantees** — actual rates swing widely by industry, offer strength, traffic quality, and audience temperature. Use them to set rough expectations, then measure your own baseline.

| Type | Trigger | Best For | Typical Conv. Range* |
|------|---------|----------|-------------------|
| Exit Intent Modal | Mouse leaves viewport | Lead capture, cart save | 2-5% |
| Timed Modal | After X seconds on page | Newsletter signup, offers | 1-3% |
| Scroll-Triggered | After scrolling X% | Content upgrades, lead magnets | 2-4% |
| Slide-In | Scroll/time, less intrusive | Blog CTAs, subtle offers | 1-3% |
| Full-Screen Overlay | Immediate or timed | Major announcements, launches | 3-8% |
| Top/Bottom Banner | Persistent on page | Promotions, shipping thresholds | 0.5-2% |
| Inline/Embedded | Always visible in content | Content upgrades, contextual | 1-3% |
| Click-Triggered | User clicks a link/button | Intentional opt-in, details | 5-15% |
| Two-Step Opt-In | Click → then form appears | Higher-quality leads | 3-8% |

<sub>*Rough ranges from public CRO benchmarks; treat as directional. Your numbers depend on offer, industry, device, and traffic source.</sub>

---

## Exit Intent — Mechanics & Implementation

### How Exit Intent Works

```
Desktop: Track mouse cursor position
├── Cursor moves toward top of viewport (y < 10px)
├── Cursor velocity is upward (moving toward close/back button)
└── Trigger popup before cursor leaves the page

Mobile: No cursor — use alternative signals
├── Back button press (history API)
├── Scroll up rapidly (intent to leave)
├── Tab switch (visibility API)
└── Idle timeout (no interaction for X seconds)
```

### JavaScript Implementation

```javascript
// --- Small cookie helpers used throughout this skill ---
function setCookie(name, value, days) {
  const expires = days
    ? '; expires=' + new Date(Date.now() + days * 864e5).toUTCString()
    : ''; // omit `days` => session cookie (cleared when browser closes)
  document.cookie =
    `${name}=${encodeURIComponent(value)}${expires}; path=/; SameSite=Lax`;
}
function getCookie(name) {
  return document.cookie.split('; ').reduce((acc, c) => {
    const [k, v] = c.split('=');
    return k === name ? decodeURIComponent(v) : acc;
  }, '');
}
// `showPopup(id)` is your renderer — see the Cookie Consent section for a
// consent-aware implementation that gates analytics on tracking consent.

// Desktop exit intent
let exitIntentShown = false;

document.addEventListener('mouseout', (e) => {
  if (exitIntentShown) return;

  // Only trigger when cursor leaves through top of page
  if (e.clientY < 10 && e.relatedTarget === null) {
    exitIntentShown = true;
    showPopup('exit-intent');

    // Suppress repeats. The `exitIntentShown` flag already covers THIS page view;
    // the cookie controls how long until exit intent may fire again across visits.
    // Use 1 day for an aggressive cap, up to 7 (see "Exit Intent Best Practices").
    setCookie('exit_intent_shown', Date.now().toString(), 1); // 1-day re-show cap
  }
});

// Mobile exit intent alternatives
let lastScrollY = 0;
let scrollUpCount = 0;

window.addEventListener('scroll', () => {
  const currentY = window.scrollY;

  if (currentY < lastScrollY && currentY > 300) {
    scrollUpCount++;
    if (scrollUpCount > 3 && !exitIntentShown) {
      exitIntentShown = true;
      showPopup('exit-intent');
    }
  } else {
    scrollUpCount = 0;
  }

  lastScrollY = currentY;
});

// Visibility change (tab switch)
document.addEventListener('visibilitychange', () => {
  if (document.hidden && !exitIntentShown) {
    // User switched tabs — show on return
    document.addEventListener('visibilitychange', function onReturn() {
      if (!document.hidden) {
        showPopup('exit-intent');
        exitIntentShown = true;
        document.removeEventListener('visibilitychange', onReturn);
      }
    });
  }
});
```

### Exit Intent Best Practices

- Only fire **once per session** — never spam
- **Delay activation** by 5-10 seconds after page load (prevent false triggers)
- **Don't show** to users who already converted
- On mobile, prefer **scroll-up detection** or **idle timeout** over hacky back-button interception
- **Cookie duration:** 1-7 days between exit intent shows

---

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

## Frequency Capping Strategy

### Rules

| Scenario | Cap | Cookie Duration |
|----------|-----|-----------------|
| User dismissed popup | Don't show again for 7-30 days | 7-30 day cookie |
| User converted (signed up) | Never show that popup again | Permanent cookie or user flag |
| User saw but didn't interact | Show again in 3-7 days | 3-7 day cookie |
| Exit intent fired | Once per session, max 1/week | Session + 7-day cookie |
| Announcement banner | Until dismissed | Session or permanent |
| Different popup types | Max 1 popup per page view | Page-level flag |

### Implementation

```javascript
function shouldShowPopup(popupId) {
  // Check if user already converted
  if (getCookie('converted_' + popupId)) return false;

  // Check frequency cap
  const lastShown = getCookie('popup_shown_' + popupId);
  if (lastShown) {
    const daysSince = (Date.now() - parseInt(lastShown)) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) return false; // 7-day cap
  }

  // Check if any popup shown on this page already
  if (window.__popupShownThisPage) return false;

  return true;
}

function onPopupShown(popupId) {
  setCookie('popup_shown_' + popupId, Date.now().toString(), 30);
  window.__popupShownThisPage = true;
}

function onPopupConverted(popupId) {
  setCookie('converted_' + popupId, 'true', 365);
}
```

### Priority System

When multiple popups could fire, use priority:

```
Priority 1: Cart abandonment (revenue impact)
Priority 2: Exit intent with offer (lead capture)
Priority 3: Content upgrade (contextual value)
Priority 4: Newsletter signup (general)
Priority 5: Announcement banner (informational)
Priority 6: Cookie/consent banner (compliance — show first, before any marketing popup;
            must be proportionate and not block content as a pretext)
```

---

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

## Lead Magnet Popup Templates (12)

### 1. The Content Upgrade

```
TRIGGER: 50% scroll on blog post
HEADLINE: Want the complete [topic] checklist?
BODY: Get the 23-point checklist mentioned in this article —
      plus 5 bonus strategies not covered here.
CTA: [Send Me the Checklist]
FORM: Email only
```

### 2. The Discount / First Purchase

```
TRIGGER: 10 seconds on site (new visitors)
HEADLINE: Get 15% off your first order
BODY: Join 50,000+ customers. Enter your email for an
      exclusive discount code.
CTA: [Claim My Discount]
FORM: Email only
```

### 3. The Free Tool / Calculator

```
TRIGGER: Exit intent
HEADLINE: Before you go — try our free [ROI/Savings/Score] calculator
BODY: See exactly how much [Product] could save you.
      Takes 60 seconds. No signup required.
CTA: [Calculate My Savings]
FORM: No form — link to tool (capture email inside tool)
```

### 4. The Webinar / Event

```
TRIGGER: 30 seconds on relevant page
HEADLINE: Live Workshop: [Compelling Topic]
BODY: Join [Speaker] on [Date] for a [duration] deep-dive into
      [topic]. Includes Q&A and a free [bonus].
CTA: [Reserve My Spot]
FORM: Name + Email
```

### 5. The Quiz / Assessment

```
TRIGGER: 15 seconds on page
HEADLINE: What's your [marketing/fitness/business] score?
BODY: Take our 2-minute assessment and get a personalized
      action plan. 10,000+ people have taken it.
CTA: [Take the Quiz]
FORM: No form — quiz captures email at results stage
```

### 6. The Template / Swipe File

```
TRIGGER: 50% scroll on related blog post
HEADLINE: Steal our [email/ad/landing page] templates
BODY: The exact templates we used to [achieve result].
      Copy, paste, customize.
CTA: [Get the Templates]
FORM: Email only
```

### 7. The Early Access / Waitlist

```
TRIGGER: Time or scroll on product page
HEADLINE: Be first to try [New Feature/Product]
BODY: We're launching [thing] next month. Early access members
      get [benefit]. Limited spots.
CTA: [Join the Waitlist]
FORM: Email only
```

### 8. The Free Trial Extension

```
TRIGGER: Exit intent (trial users only)
HEADLINE: Need more time? Here's 7 extra days.
BODY: We noticed you haven't finished setting up.
      Extend your trial — no credit card needed.
CTA: [Extend My Trial]
FORM: No form — button action
```

### 9. The Newsletter Value Prop

```
TRIGGER: 60 seconds on blog
HEADLINE: Get insights like this every Tuesday
BODY: Join [X]K [role]s who read our weekly newsletter.
      One email. Best [industry] insights. No spam.
CTA: [Subscribe]
FORM: Email only
```

### 10. The Exit Offer

```
TRIGGER: Exit intent on pricing/checkout page
HEADLINE: Wait — before you go
BODY: Chat with us for 5 minutes. We'll help you find the
      right plan (and maybe a discount).
CTA: [Chat Now] [No Thanks]
FORM: No form — opens chat widget
```

### 11. The Social Proof Slide-In

```
TRIGGER: 30 seconds on page
TYPE: Small slide-in (bottom-left or bottom-right)
CONTENT: "[Name] from [City] just signed up 3 minutes ago"
         or "[X] people are viewing this right now"
FORM: None — builds urgency, no capture
```

### 12. The Spin-to-Win (Ecommerce)

```
TRIGGER: Exit intent (new visitors, ecommerce)
HEADLINE: Spin for a chance to win!
BODY: Enter your email to spin the wheel.
      Every spin wins something.
PRIZES: 5% off (40%), 10% off (30%), 15% off (15%),
        Free shipping (10%), 20% off (5%)
CTA: [Spin the Wheel]
FORM: Email required to spin
NOTE: Often converts well (commonly cited ~5-12%, but highly
      variable) — yet attracts discount-seekers and can erode margin
      and brand. Measure margin impact, not just opt-in rate.
```

---

## Announcement Banners

### Types

```
TOP BAR (sticky, above navigation):
├── New feature launch
├── Upcoming event / webinar
├── Sale / promotion with deadline
├── Important update / status
└── Shipping threshold ("Free shipping over $50")

BOTTOM BAR (sticky, above footer):
├── Cookie consent
├── App download prompt
├── Chat / support availability
└── Persistent offer

INLINE BANNER (within page content):
├── Contextual upsell
├── Related product suggestion
└── Feature callout
```

### Announcement Banner Best Practices

- **Height:** 40-60px max (don't eat viewport)
- **Dismissible:** Always include a close button
- **Contrast:** High contrast with the site — it should stand out
- **One message:** Don't cram multiple messages into one banner
- **Urgency:** Include deadline if applicable ("Ends Friday" > "Limited time")
- **Link:** Always make the banner clickable or include a CTA link
- **Mobile:** Ensure text doesn't wrap to 3+ lines — shorten copy

### Banner CSS Pattern

```css
.announcement-banner {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: #1a1a2e; /* Dark, high contrast */
  color: white;
  text-align: center;
  padding: 10px 40px 10px 16px; /* Right padding for close button */
  font-size: 14px;
  line-height: 1.4;
}

.announcement-banner a {
  color: #ffd700;
  text-decoration: underline;
  font-weight: 600;
}

.announcement-banner .close {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  padding: 8px;
  min-width: 44px;
  min-height: 44px;
}
```

---

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

## A/B Testing Popups

### What to Test (Priority Order)

1. **Offer** — What you're giving (highest impact on conversion)
2. **Trigger** — When/how the popup appears
3. **Headline** — The hook
4. **Design** — Layout, colors, imagery
5. **Copy** — Body text and CTA
6. **Form fields** — Number and type of fields
7. **Timing** — Seconds delay or scroll percentage

### Test Framework

```
TEST 1: Offer (run first — everything else depends on this)
├── A: 10% discount
├── B: Free shipping
└── C: Content upgrade (guide/checklist)
Winner → Use in all subsequent tests

TEST 2: Trigger timing
├── A: 5 seconds
├── B: 15 seconds
└── C: 50% scroll
Winner → Use going forward

TEST 3: Headline
├── A: Benefit-focused ("Get 10% off your first order")
├── B: Curiosity-focused ("Don't miss this")
└── C: Social proof ("Join 50K subscribers")
Winner → Use going forward

TEST 4: Design
├── A: Minimal (text + form)
├── B: Image-rich (product photo or mockup)
└── C: Full-screen takeover vs modal
```

### Statistical Significance

- **Sample size depends on baseline + effect size** — there is no universal "1,000 impressions" number. Lower baseline rates and smaller lifts need far more traffic. Use the table below.
- **Minimum conversions:** aim for ~100+ conversions per variant (50 is a bare floor for a rough read) before trusting a result.
- **Duration:** run at least 1–2 full weeks to capture weekday/weekend and full purchase cycles, even if significance hits sooner.
- **Confidence level:** 95% (α = 0.05) minimum; pick power = 80% when sizing.
- **Don't peek / no early stopping** on a fixed-horizon test — it inflates false positives. Set the duration and required N up front, or use a sequential/Bayesian method designed for continuous monitoring.

**Required sample size per variant** (2-sided, 95% confidence, 80% power), to detect a *relative* lift over a baseline conversion rate:

| Baseline conv. rate | Detect +10% rel. | +20% rel. | +50% rel. |
|---------------------|------------------|-----------|-----------|
| 1% | ~155,000 / variant | ~40,000 | ~7,000 |
| 2% | ~77,000 | ~20,000 | ~3,400 |
| 5% | ~30,000 | ~7,600 | ~1,300 |
| 10% | ~14,000 | ~3,600 | ~620 |

Reading it: a popup at a **2% baseline** that you hope to lift to **2.4% (+20% relative)** needs **~20,000 impressions per variant** — not 1,000. (Approximate; use a proper calculator — e.g. Evan Miller's "Sample Size" or your testing tool's built-in — for exact figures and for absolute-lift inputs.) If the math says you can't reach N in a reasonable window, test a **bigger swing** (offer, not button color), test on **higher-traffic pages**, or accept a **directional** read and re-test later.

### Tools for A/B Testing Popups

> Pricing and free-tier limits change constantly — **verify current pricing on the vendor's site before recommending** (as of Jun 2026). Choose on fit, not headline price.

| Tool | Best fit | Choose it when |
|------|----------|----------------|
| OptinMonster | WordPress / general web | You want deep trigger + display-rules control without building it; WP-first stack |
| BDOW! (formerly Sumo) | Simple / small sites | You need a fast, low-effort setup and a usable free tier |
| Privy / Justuno / OptiMonk | Ecommerce (Shopify) | You need cart-value triggers, spin-to-win, and email/SMS list sync to a store |
| ConvertFlow | SaaS / personalization | You need on-site personalization, multi-step funnels, and CRM-aware targeting |
| Unbounce / Instapage | Landing pages + popups | Popups live alongside built landing pages and you want one builder |
| Klaviyo / Mailchimp (built-in forms) | Already on that ESP | You want capture + flows in one tool and don't need advanced display rules |
| Custom (JS) | Full control | You need exact behavior, no third-party script weight, and own consent/CWV handling |

**Tool-fit criteria, in priority order:** (1) does it integrate with your ESP/CRM and consent platform; (2) display-rule granularity (trigger × segment × frequency cap); (3) built-in A/B testing + significance reporting; (4) script weight / performance (async, lazy-loaded — see Core Web Vitals note); (5) Consent Mode / GPC awareness; (6) price for your traffic volume.

---

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

## Popup Copy Formulas

### Formula 1: Value + Specificity

```
HEADLINE: Get [specific deliverable]
BODY: [What it is] + [who it's for] + [key benefit]
CTA: [Action verb] + [what they get]

Example:
HEADLINE: Get the 47-Point Launch Checklist
BODY: Everything you need to launch your SaaS product.
      Used by 2,000+ founders.
CTA: [Download the Checklist]
```

### Formula 2: Question + Answer

```
HEADLINE: [Question about their pain point]?
BODY: [Acknowledge pain] + [solution teaser] + [proof]
CTA: [Get the solution]

Example:
HEADLINE: Struggling to get more email subscribers?
BODY: Our free guide reveals 15 proven tactics that grew our
      list from 0 to 50K in 12 months.
CTA: [Get the Free Guide]
```

### Formula 3: Social Proof Lead

```
HEADLINE: Join [number]+ [people like them]
BODY: Get [what they'll receive] every [frequency].
      [One specific benefit].
CTA: [Join / Subscribe / Get Access]

Example:
HEADLINE: Join 25,000+ marketers
BODY: Get one actionable growth tactic every Tuesday morning.
      No fluff. Unsubscribe anytime.
CTA: [Subscribe Free]
```

### Formula 4: FOMO / Urgency

```
HEADLINE: [Offer] — [Time constraint]
BODY: [What they get] + [what makes this urgent] + [normal price vs offer]
CTA: [Claim / Get / Start]

Example:
HEADLINE: 40% Off Annual Plans — 48 Hours Left
BODY: Lock in startup pricing before it's gone forever.
      Normally $49/mo → now $29/mo for life.
CTA: [Claim My Discount]
```

### Formula 5: Two-Step Yes Ladder

```
STEP 1 (No form visible):
HEADLINE: Want to [achieve desirable outcome]?
CTA: [Yes, show me how] / [No thanks, I don't want [outcome]]

STEP 2 (After clicking yes):
HEADLINE: Great! Where should we send it?
FORM: [Email field] + [Send It]

Why it works: Micro-commitment. Clicking "yes" creates psychological
consistency — they're more likely to complete the form.
```

---

## Design Patterns

### Effective Popup Design Principles

1. **One goal per popup** — Don't ask for email AND follow on Twitter
2. **Contrast with page** — Popup should visually pop (overlay darkens background)
3. **Minimal fields** — Email only converts 2-3x better than email + name
4. **Large CTA button** — Full-width on mobile, prominent color
5. **Clear close option** — Respect the user. Easy-to-find X or "No thanks"
6. **Visual hierarchy** — Headline → Supporting text → Form → CTA → Close
7. **Directional cues** — Arrow or image pointing toward form/CTA
8. **Whitespace** — Don't cram. Let the popup breathe.

### Layout Patterns

```
PATTERN A: Left image, right form (desktop)
┌─────────────────────────────────┐
│ [Image/     │ Headline          │
│  Mockup]    │ Short body text   │
│             │ [Email input    ] │
│             │ [  CTA Button   ] │
│             │ "No thanks" link  │
└─────────────────────────────────┘

PATTERN B: Stacked (mobile-first)
┌─────────────────┐
│    Headline      │
│  Short body text │
│ [Email input   ] │
│ [ CTA Button   ] │
│  "No thanks"     │
└─────────────────┘

PATTERN C: Full-screen takeover
┌─────────────────────────────────┐
│                                 │
│         Headline                │
│      Body text (short)          │
│                                 │
│     [Email          ]           │
│     [   CTA Button  ]          │
│                                 │
│       "No thanks"               │
│                                 │
└─────────────────────────────────┘

PATTERN D: Bottom slide-in (least intrusive)
                    ┌──────────────┐
                    │ Headline     │
                    │ [Email] [Go] │
Page content        │  ✕ close     │
                    └──────────────┘
```

### Color Psychology for CTAs

| Color | Feeling | Best For |
|-------|---------|----------|
| Green | Go, positive, safe | Signups, free actions |
| Orange | Urgency, energy | Limited offers, ecommerce |
| Blue | Trust, professional | B2B, SaaS |
| Red | Urgency, stop | Flash sales, deadlines |
| Purple | Premium, creative | Luxury, design tools |
| Black | Bold, premium | High-end products |

**Key rule:** CTA color must contrast sharply with popup background. Don't use blue CTA on blue popup.

---

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

## Common Mistakes

1. **Content-covering popup on mobile search landings** — risks Google's intrusive-interstitial signal and hurts UX/INP. Note delaying it doesn't make it "safe" (it still obscures content); prefer a dismissible banner or small slide-in for search traffic. See Mobile Popup Rules.
2. **No frequency cap** — Showing the same popup every page view = instant annoyance.
3. **Too many form fields** — Email only. Name is optional. Phone number kills conversion.
4. **Generic offer** — a vague "Subscribe to our newsletter" typically converts far worse than a specific lead magnet (often a multiple lower in CRO case studies; magnitude varies — test your own). Give a concrete reason to opt in.
5. **Tiny close button** — If users can't dismiss easily, they leave the site entirely.
6. **Same popup for everyone** — Segment by source, behavior, and customer status.
7. **No A/B testing** — Even small changes (headline, CTA color) can 2x conversion rate.
8. **Popup + cookie banner stacking** — Never show both simultaneously.
9. **No success state** — After submission, show confirmation + set expectations.
10. **Ignoring page speed** — Heavy popup scripts (especially images) slow the page. Lazy-load popup assets.

---

## Quick-Start Implementation

### Week 1: Foundation
1. Choose a tool by **fit, not headline price** (see "Tools for A/B Testing Popups" — match your ESP/CRM, consent platform, and traffic volume; custom JS if you need full control)
2. Create one exit-intent popup with a specific lead magnet
3. Set frequency cap (once per 7 days)
4. Add to high-traffic pages only
5. Set up conversion tracking

### Week 2: Expand
1. Add scroll-triggered slide-in for blog posts
2. Create announcement banner for current promotion
3. Segment: different popup for new vs returning visitors
4. Test on mobile — ensure compliance with Google guidelines

### Week 3: Optimize
1. A/B test headline (2 variants)
2. Review conversion data — kill underperformers
3. Test timing (5s vs 15s vs 50% scroll)
4. Add source-based segmentation

### Week 4+: Scale
1. A/B test offers (discount vs content vs tool)
2. Add popups to more pages
3. Create page-specific content upgrades
4. Build popup → email sequence integration
5. Review and iterate monthly

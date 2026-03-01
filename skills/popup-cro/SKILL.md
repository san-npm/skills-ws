---
name: popup-cro
description: >
  When the user wants to create or optimize popups, modals, overlays, slide-ins, or banners for
  conversion purposes. Also use when the user mentions 'exit intent,' 'popup conversions,' 'modal
  optimization,' 'lead capture popup,' 'email popup,' 'announcement banner,' or 'overlay.' For
  forms outside of popups, see form-cro. For general page conversion optimization, see page-cro.
version: 2.0.0
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

| Type | Trigger | Best For | Avg Conversion Rate |
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
// Desktop exit intent
let exitIntentShown = false;

document.addEventListener('mouseout', (e) => {
  if (exitIntentShown) return;

  // Only trigger when cursor leaves through top of page
  if (e.clientY < 10 && e.relatedTarget === null) {
    exitIntentShown = true;
    showPopup('exit-intent');

    // Set cookie to prevent repeat on this session
    setCookie('exit_intent_shown', 'true', 1); // 1 day
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

setTimeout(() => {
  timeReached = true;
  if (scrollReached) showPopup();
}, 30000);

window.addEventListener('scroll', () => {
  const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
  if (scrollPercent >= 50) {
    scrollReached = true;
    if (timeReached) showPopup();
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
Priority 6: Cookie consent (compliance — always show regardless)
```

---

## Mobile Popup Rules (Google Guidelines)

### What Google Penalizes (Intrusive Interstitials)

Google's page experience signals penalize popups that:

- **Cover most of the page** immediately or before scrolling
- **Standalone interstitials** users must dismiss before accessing content
- **Above-the-fold layouts** where content is pushed below an interstitial

### What's Allowed

✅ **Cookie consent / age verification** — legally required, always OK
✅ **Login walls** for paywalled content (Google knows about these)
✅ **Banners** that use a "reasonable amount of screen space" and are easily dismissible
✅ **Popups triggered by user action** (click-triggered)
✅ **Popups after sufficient engagement** (scroll/time delay)

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
└── Stack multiple popups
```

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
NOTE: Converts at 5-12% but attracts discount shoppers.
      Use strategically.
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

## Cookie Consent Integration

### Requirements

- **GDPR (EU):** Explicit opt-in before non-essential cookies. No pre-checked boxes.
- **CCPA (California):** Opt-out model. Can set cookies but must offer "Do Not Sell" option.
- **ePrivacy:** Consent required for tracking cookies across EU.

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

function onPopupSubmit(popupId, email) {
  // Email collection doesn't require tracking consent
  // (it's a direct user action, not passive tracking)
  submitEmail(email);

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

- **Minimum sample size:** 1,000 popup impressions per variant
- **Minimum conversions:** 50+ per variant for reliable results
- **Duration:** Run tests for at least 7 days (captures weekday/weekend variation)
- **Confidence level:** 95% minimum before declaring a winner
- **Don't peek:** Set test duration upfront and don't call it early

### Tools for A/B Testing Popups

| Tool | Best For | Price |
|------|----------|-------|
| OptinMonster | WordPress, full-featured | $16+/mo |
| Sumo | Simple, free tier | Free to $49/mo |
| Privy | Ecommerce / Shopify | Free to $30+/mo |
| ConvertFlow | SaaS, personalization | $29+/mo |
| Unbounce Smart Builder | Landing pages + popups | $99+/mo |
| Custom (JS) | Full control | Free (dev time) |

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
  if (referrer.includes('twitter.com') || referrer.includes('linkedin.com')) {
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

| Metric | How to Calculate | Benchmark |
|--------|-----------------|-----------|
| Impression rate | Popups shown / page views | Depends on triggers |
| Conversion rate | Submissions / impressions | 2-5% (email), 5-15% (click) |
| Close rate | Dismissals / impressions | 70-90% (normal) |
| Impact on bounce rate | Compare bounce rate with/without popup | Should not increase >5% |
| Revenue per popup impression | Revenue attributed / impressions | Track over time |
| Email quality | Open rate of popup-captured emails | Should be within 80% of other sources |

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

1. **Popup on page load for mobile** — Google penalizes this. Delay or use banners.
2. **No frequency cap** — Showing the same popup every page view = instant annoyance.
3. **Too many form fields** — Email only. Name is optional. Phone number kills conversion.
4. **Generic offer** — "Subscribe to our newsletter" converts 80% less than a specific lead magnet.
5. **Tiny close button** — If users can't dismiss easily, they leave the site entirely.
6. **Same popup for everyone** — Segment by source, behavior, and customer status.
7. **No A/B testing** — Even small changes (headline, CTA color) can 2x conversion rate.
8. **Popup + cookie banner stacking** — Never show both simultaneously.
9. **No success state** — After submission, show confirmation + set expectations.
10. **Ignoring page speed** — Heavy popup scripts (especially images) slow the page. Lazy-load popup assets.

---

## Quick-Start Implementation

### Week 1: Foundation
1. Choose tool (OptinMonster, Sumo, custom JS)
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

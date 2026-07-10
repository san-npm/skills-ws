---
name: page-cro
description: "Landing page CRO — 100-point audit checklist, heatmap analysis, statistical testing, conversion optimization. Use when auditing or optimizing a landing/marketing page. For popups see `popup-cro`; for signup flows see `signup-flow-cro`."
---

# Landing Page CRO Optimization Framework

> Expert-level conversion rate optimization for landing pages with data-driven methodologies, statistically valid experimentation, consent-safe analytics, and accessible, framework-agnostic implementation.

## How to run a CRO engagement (don't start with the checklist)

The 100-point audit below is a **first-pass diagnostic**, not the work itself. A real CRO program is a loop:

1. **Instrument & baseline** — confirm conversion tracking is correct, get 2–4 weeks of clean data, know your current CVR, revenue-per-visitor (RPV), and bounce. Never optimize a page you can't measure.
2. **Diagnose** — combine quant (GA4 funnels, scroll/click heatmaps) with qual (session replays, 5-second tests, user interviews, on-page surveys). The checklist scores the page; diagnosis finds *why* it leaks.
3. **Hypothesize** — write each idea as: *"Because [evidence], we believe [change] will cause [metric] to move for [segment]. We'll know from [primary metric]."* No hypothesis, no test.
4. **Prioritize** — score every idea by **PIE** (Potential, Importance, Ease) or **ICE** (Impact, Confidence, Ease), 1–10 each, rank by average. See the prioritization rubric below.
5. **Experiment** — run a powered A/B test (sample size + duration computed up front; see the experimentation section). Most "wins" that aren't powered are noise.
6. **Analyze & ship** — check SRM, primary metric, and guardrails before declaring a winner. Ship winners, document losers, feed learnings back to step 2.

**Expected effect sizes (set expectations honestly):** mature pages move 2–10% relative per winning test; a brand-new page or a hero/offer rework can move 20–50%+. Anyone promising "+127% from a button color" is selling, not testing — the example testimonials in this doc are illustrative placeholders, not benchmarks.

Sibling skills: popups/exit-intent/cookie-consent UX → `popup-cro`; multi-step signup/onboarding funnels → `signup-flow-cro`.

## 🎯 100-Point CRO Audit Framework

**Scoring & verdict.** Each item lists its point value. Tally the six sections (25+25+15+15+10+10 = 100). Interpret: **85-100** strong, ship/iterate on margins; **70-84** solid, fix the flagged items and test; **50-69** material leaks, prioritize fixes before paid traffic; **< 50** rebuild the page. Score by **evidence, not vibes**. For each item record: pass/fail, the evidence (screenshot, Lighthouse/CrUX number, heatmap, replay), and a PIE/ICE score so fixes rank by impact, not order of discovery.

### Above-The-Fold Checklist (25 Points)

**Hero Section Critical Elements**
- [ ] **Value proposition clarity** (3 points): 7-second rule test passed
- [ ] **Headline power** (3 points): Specific, benefit-driven, emotional trigger
- [ ] **Subheadline support** (2 points): Reinforces and elaborates on headline
- [ ] **CTA visibility** (3 points): Contrasting color, clear action verb, above fold
- [ ] **Hero image relevance** (2 points): Supports value prop, shows product in use
- [ ] **Social proof placement** (3 points): Logo wall, testimonial, or usage stats
- [ ] **Load time optimization** (3 points): <2s LCP, optimized images
- [ ] **Mobile hero optimization** (3 points): Stacked layout, thumb-friendly CTA, primary CTA reachable without scroll on a 360×640 viewport
- [ ] **Navigation clarity** (2 points): Minimal, focused, supports conversion goal
- [ ] **Trust signals** (1 point): Verifiable security/payment badges, certifications, guarantees (see the trust-badge caveat below — never use a self-asserted "GDPR compliant" badge)

> **LCP target note:** the Google "good" field threshold is **LCP ≤ 2.5s at p75**. Treat `< 2.0s` as an internal *stretch* target for above-the-fold heroes, not the pass/fail line. Score this item against the official 2.5s threshold (see Core Web Vitals section); award the point only if **field** (CrUX/RUM) data — not just a lab Lighthouse run — clears it.

```html
<!-- Hero Section Template -->
<section class="hero" data-cro-test="hero-variant-a">
  <div class="container">
    <div class="hero-content">
      <h1 class="hero-headline" data-cro-element="headline">
        <!-- Headline Pattern: [Outcome] for [Target] in [Timeframe] -->
        Double Your Sales in 30 Days with Our Proven CRO System
      </h1>
      <p class="hero-subheadline" data-cro-element="subheadline">
        <!-- Elaborate with proof point or methodology -->
        Join 2,000+ businesses using our 5-step framework to optimize conversions
      </p>
      <button class="cta-primary" data-cro-element="primary-cta">
        <!-- Action + Outcome + No-Risk -->
        Start Free Trial → No Credit Card
      </button>
      <div class="social-proof" data-cro-element="social-proof">
        <!-- Logo wall or testimonial snippet -->
        <span>Trusted by:</span>
        <img src="logos.png" alt="Customer logos" />
      </div>
    </div>
    <div class="hero-visual" data-cro-element="hero-image">
      <!-- Product screenshot, demo video, or lifestyle image -->
    </div>
  </div>
</section>
```

**Mobile-First Above-Fold Optimization**

Avoid `min-height: 100vh` on mobile heroes: on iOS/Android the dynamic browser chrome makes `100vh` taller than the visible area, pushing your subheadline and CTA below the fold. Use the **dynamic viewport unit `dvh`** (with a `vh` fallback for old browsers), and prefer a **content-first** height (`min-height: auto` or a capped value) so proof and CTA stay visible.

```css
/* Mobile Hero Optimization */
.hero {
  /* Fallback for browsers without dynamic viewport units (pre-2023) */
  min-height: 100vh;
  /* svh = smallest viewport (chrome shown) → guarantees CTA visible;
     dvh = dynamic, follows chrome show/hide. Cap so content never gets buried. */
  min-height: min(100svh, 720px);
  padding: 80px 20px 40px;
}

.hero-headline {
  font-size: clamp(28px, 8vw, 48px); /* Responsive scaling */
  line-height: 1.2;
  margin-bottom: 16px;
  font-weight: 700;
}

.cta-primary {
  width: 100%; /* Full-width on mobile */
  min-height: 56px; /* Thumb-friendly touch target */
  margin: 24px 0;
  border-radius: 8px;
  font-size: 18px;
  font-weight: 600;
}

@media (min-width: 768px) {
  .cta-primary {
    width: auto;
    padding: 16px 32px;
  }
}
```

### Content & Messaging (25 Points)

**Value Proposition Framework**
- [ ] **Problem-solution fit** (4 points): Clear pain point identification
- [ ] **Unique selling proposition** (4 points): Differentiation from competitors
- [ ] **Benefit hierarchy** (3 points): Primary, secondary, tertiary benefits clear
- [ ] **Feature-benefit translation** (3 points): Features converted to outcomes
- [ ] **Emotional resonance** (2 points): Speaks to the user's real motivation — relief from a genuine pain, aspiration, belonging, or status — *truthfully*. Award the point only if every emotional claim is backed by something real you deliver.
- [ ] **Objection handling** (3 points): Common concerns proactively addressed
- [ ] **Scannability** (2 points): F-pattern reading, bullet points, headers
- [ ] **Reading level** (2 points): 8th grade or lower readability score
- [ ] **Action-oriented language** (1 point): Active voice, power words
- [ ] **Urgency without manipulation** (1 point): Genuine scarcity or time sensitivity

> **Persuasion vs. dark patterns (read before writing any "trigger" copy).** Optimizing for conversion is not a license to manipulate. Dark patterns are increasingly **illegal**, not just unethical: the EU GDPR/EDPB deceptive-design guidance, the **EU Digital Services Act** (bans dark patterns on covered platforms), the **California CPRA** (consent obtained via dark patterns is invalid), and the **US FTC** (enforcement on fake urgency, drip pricing, hidden subscriptions, "negative option" traps) all apply. They also lose money long-term via refunds, chargebacks, churn, and brand damage.
>
> | Legitimate persuasion (use) | Dark pattern (never) |
> |---|---|
> | Real scarcity ("12 onboarding slots this month") | Fake/looping countdowns; "only 2 left" on unlimited digital goods |
> | Honest social proof (real, attributable testimonials) | Fabricated reviews, invented user counts, fake "X people viewing" |
> | Clear default + easy opt-out | Pre-ticked consent, confirmshaming ("No, I don't want to save money") |
> | Risk reversal you actually honor | "Free trial" that's hard to cancel or auto-charges silently |
> | One prominent primary CTA | Disguised ads, hidden "decline" links, trick-question wording |
>
> Rule of thumb: if the tactic only works because the user *misunderstands* something, it's a dark pattern. Fix the truth, not the trick.

```javascript
// Value Proposition Testing Framework
const valuePropositionTests = {
  headline: [
    "Save Time + Money + Effort", // Generic
    "Cut Research Time by 90%", // Specific benefit
    "From 8 Hours to 45 Minutes", // Before/after
    "The Last Tool You'll Need" // Finality
  ],
  
  subheadline: [
    "Feature list explanation", // Weak
    "Social proof reinforcement", // Medium  
    "Risk reversal statement", // Strong
    "Methodology preview" // Educational
  ]
};

// Implement systematic testing
function runValuePropTest(variant) {
  gtag('event', 'value_prop_test', {
    variant: variant,
    element: 'headline',
    timestamp: Date.now()
  });
}
```

### Social Proof & Trust (15 Points)

**Trust Signal Hierarchy**
1. **Customer testimonials** (4 points): Video > Photo + name > Text only
2. **Usage statistics** (3 points): Users, transactions, years in business
3. **Media mentions** (2 points): Logos of publications that covered you
4. **Customer logos** (2 points): Recognizable brands using your service
5. **Certifications** (2 points): Industry credentials, security badges
6. **Guarantees** (2 points): Money-back, satisfaction, security

```html
<!-- Social Proof Component Library -->
<div class="social-proof-section" data-cro-element="social-proof">
  <!-- Testimonial Carousel.
       PLACEHOLDERS ONLY — fill with a REAL, attributable customer (with their
       written permission) and the actual result they reported. Never invent a
       name, title, company, or number (see the dark-patterns table above). -->
  <div class="testimonial-carousel">
    <div class="testimonial" data-social-proof="video-testimonial">
      <video poster="testimonial-thumb.jpg" controls>
        <source src="customer-testimonial.mp4" type="video/mp4">
      </video>
      <cite>
        <strong>[Real customer name], [Real title] at [Real company]</strong>
        <span>[Verbatim outcome they actually reported]</span>
      </cite>
    </div>
  </div>

  <!-- Usage Statistics — show only numbers you can substantiate; round honestly,
       never inflate. Invented user/revenue counts are a dark pattern (and FTC-actionable). -->
  <div class="stats-bar" data-social-proof="usage-stats">
    <div class="stat">
      <span class="stat-number">[#] customers</span>
      <span class="stat-label">Happy customers</span>
    </div>
    <div class="stat">
      <span class="stat-number">$[#]</span>
      <span class="stat-label">Revenue generated for clients</span>
    </div>
  </div>

  <!-- Security & Trust Badges -->
  <!-- Use VERIFIABLE badges only. A self-drawn "GDPR compliant" image is meaningless
       (there is no GDPR certification badge) and can be misleading. Prefer badges that
       link to a real attestation/report, plus your actual policy pages. -->
  <div class="trust-badges" data-social-proof="trust-signals">
    <!-- Payment trust: real, recognizable processor marks served by the processor -->
    <img src="/badges/stripe-secure.svg" alt="Payments secured by Stripe" />
    <!-- Audited compliance that links to proof, not a decorative claim -->
    <a href="/security/soc2-report"><img src="/badges/soc2.svg" alt="SOC 2 Type II report" /></a>
    <!-- Honest, specific guarantee you actually honor -->
    <img src="/badges/money-back.svg" alt="30-day money-back guarantee" />
  </div>
  <!-- For data-protection trust, link to real artifacts instead of a fake badge: -->
  <p class="compliance-links">
    <a href="/privacy">Privacy Policy</a> ·
    <a href="/dpa">Data Processing Agreement</a> ·
    <a href="/subprocessors">Subprocessors</a> ·
    <a href="/security">Security &amp; data rights</a>
  </p>
</div>
```

> **Trust-badge caveat.** Badges only build trust if they're *true and verifiable*. There is no official "GDPR compliant" badge — GDPR is a regulation, not a certification — so a self-asserted GDPR/"privacy" image asserts nothing and can mislead. Demonstrate data-protection posture the way buyers actually vet it: a lawful basis stated in your privacy policy, a published DPA and subprocessor list, working data-subject-rights (access/delete) flows, and audited attestations (SOC 2, ISO 27001) that link to the report or auditor. Payment/security marks (Stripe, PayPal, Norton/DigiCert) build trust only when served/verifiable, not as a static decorative PNG.

**Social Proof Placement Strategy**
```css
/* Strategic Trust Signal Positioning */
.social-proof-hero { /* Immediate credibility */
  margin-top: 24px;
}

.social-proof-mid-page { /* Momentum building */
  margin: 60px 0;
  text-align: center;
}

.social-proof-pre-cta { /* Final objection handling */
  margin-bottom: 40px;
}

.trust-badges-footer { /* Persistent security */
  position: sticky;
  bottom: 0;
  padding: 8px 0;
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(10px);
}
```

### CTA Optimization (15 Points)

**Call-to-Action Best Practices**
- [ ] **Primary CTA prominence** (3 points): Single, clear, contrasting primary action
- [ ] **CTA copy optimization** (3 points): First-person, action + value ("Get my free audit"); urgency only when a deadline is *genuine*
- [ ] **Button design** (2 points): Size, color, spacing optimized for clicks
- [ ] **CTA placement** (2 points): Multiple strategic placements without confusion
- [ ] **Micro-copy support** (2 points): Risk-reduction text near CTA
- [ ] **Loading states** (1 point): Clear feedback during form submission
- [ ] **Accessibility & mobile** (2 points): Real `<button>`/`<a>` element, visible `:focus-visible` ring, ≥ 4.5:1 text contrast, ≥ 44×44 px touch target, ≥ 24 px gap from adjacent tap targets

```html
<!-- CTA Component Framework -->
<div class="cta-container" data-cro-element="primary-cta">
  <button class="btn-primary" 
          data-cta-variant="benefit-focused"
          onclick="trackCTAClick('primary', 'hero')">
    <!-- Formula: Action + Outcome + Risk Reducer -->
    Get My Free Analysis → 30-Day Guarantee
  </button>
  
  <!-- Micro-copy for objection handling -->
  <p class="cta-micro-copy">
    ✓ No credit card required ✓ Setup in 2 minutes ✓ Cancel anytime
  </p>
  
  <!-- Secondary CTA for different intent levels -->
  <button class="btn-secondary" data-cta-variant="low-commitment">
    Watch 2-Minute Demo
  </button>
</div>
```

**CTA A/B Testing Framework**

Test **one dimension at a time** as complete variant objects (copy *or* color *or* size), or run a deliberate multivariate test — never index three different-length arrays with the same number (the classic bug: 5 copy options but only 4 colors / 3 sizes → `undefined` styles for variants 4–5). Below, each variant is a self-contained object, and assignment is **sticky per user** (so a returning visitor sees the same variant) rather than re-randomized on every render.

```javascript
// Each variant is COMPLETE and self-contained — no cross-array indexing.
// Test copy in isolation here; clone the pattern for a color- or size-only test.
const ctaCopyVariants = [
  { id: 'control',  copy: 'Start Free Trial' },                 // baseline
  { id: 'access',   copy: 'Get Instant Access' },               // immediacy
  { id: 'spot',     copy: 'Claim Your Spot' },                  // exclusivity
  { id: 'outcome',  copy: 'Get My Free Audit' },                // first-person + value
];

const ctaStyle = { bg: '#1f6feb', text: '#ffffff', padding: '16px 32px', fontSize: '18px' };

// Sticky, evenly-weighted assignment. Persist so the user always sees the same arm.
// Persisting the variant id is non-essential storage under ePrivacy: gate it on CMP
// consent (see the consent-safe analytics section), or keep assignment server-side/edge
// (cookie set with consent) to avoid client storage entirely.
function assignCtaVariant(variants, storageKey = 'cta_exp') {
  // Durable ID only with consent; otherwise per-session stickiness via sessionStorage.
  const store = analyticsAllowed() ? localStorage : sessionStorage;
  let id = store.getItem(storageKey);
  let v = variants.find(x => x.id === id);
  if (!v) {
    v = variants[Math.floor(Math.random() * variants.length)];
    store.setItem(storageKey, v.id);
  }
  return v;
}

function renderCta(el) {
  const v = assignCtaVariant(ctaCopyVariants);
  el.textContent = v.copy;
  Object.assign(el.style, {
    background: ctaStyle.bg, color: ctaStyle.text,
    padding: ctaStyle.padding, fontSize: ctaStyle.fontSize,
  });
  el.dataset.exp = 'cta_copy';
  el.dataset.variant = v.id;   // <- log THIS id on exposure + conversion
  return v.id;
}
```

> **Multivariate caveat.** Want to test copy × color × size together? That's a full-factorial MVT (4×4×3 = 48 cells) and needs *far* more traffic than an A/B test — sample size scales with the number of cells, and you must control the family-wise error rate (e.g., Holm–Bonferroni) across comparisons. Unless you have very high traffic, test sequentially or use a fractional design. **Whatever you assign, log the exact `variant` id on both exposure and conversion** so the analysis joins cleanly.

### Form Optimization (10 Points)

**Form Conversion Best Practices**
- [ ] **Field reduction** (2 points): Minimum viable fields only — every field costs conversions; collect the rest later via progressive profiling (see `signup-flow-cro`)
- [ ] **Progressive disclosure** (2 points): Conditional field display
- [ ] **Accessible validation** (2 points): Programmatic `<label>` per input, inline errors tied via `aria-describedby`, `aria-invalid` on failure, focus moved to the first error, errors stated in text (not color alone)
- [ ] **Autofill & keyboards** (1 point): Correct `type`/`autocomplete`/`inputmode` so browsers autofill and mobile shows the right keyboard
- [ ] **Mobile form UX** (2 points): ≥ 16px inputs (prevents iOS zoom), large tap targets
- [ ] **Privacy & consent** (1 point): Specific data-use statement + link to privacy policy; explicit, unticked consent checkbox where a lawful basis requires it (marketing opt-in under GDPR/ePrivacy) — never pre-ticked

```html
<!-- Optimized Lead Generation Form -->
<form class="lead-form" data-cro-element="lead-form">
  <div class="form-header">
    <h3>Get Your Free CRO Audit</h3>
    <p>Enter your website below for instant analysis</p>
  </div>
  
  <div class="form-fields">
    <!-- Single-field start for maximum conversion -->
    <div class="field-group" data-step="1">
      <label for="website">Your Website URL</label>
      <input type="url" 
             id="website" 
             placeholder="https://yoursite.com"
             autocomplete="url"
             required>
      <button type="button" class="btn-next" onclick="expandForm()">
        Analyze My Site →
      </button>
    </div>
    
    <!-- Progressive disclosure for additional fields -->
    <div class="field-group hidden" data-step="2">
      <label for="email">Email Address</label>
      <input type="email"
             id="email"
             placeholder="you@company.com"
             autocomplete="email"
             inputmode="email"
             aria-describedby="email-err"
             required>
      <!-- Inline error: tied via aria-describedby, set aria-invalid on fail, move focus here -->
      <span id="email-err" class="field-error" role="alert" hidden>
        Please enter a valid work email.
      </span>

      <label for="traffic">Monthly Traffic</label>
      <select id="traffic" autocomplete="off">
        <option>Under 10K</option>
        <option>10K - 50K</option>
        <option>50K - 100K</option>
        <option>100K+</option>
      </select>

      <!-- Explicit, UNticked consent only where a lawful basis requires it (e.g. marketing). -->
      <label class="consent">
        <input type="checkbox" name="marketing_consent" value="yes">
        Email me CRO tips. (Optional — we'll send your audit either way.)
      </label>

      <button type="submit" class="btn-submit">
        Send My Free Audit
      </button>
    </div>
  </div>

  <!-- Specific, truthful data-use statement + real policy link beats a vague padlock emoji. -->
  <p class="privacy-note">
    We use your email only to deliver the audit and (if you opt in) tips.
    No third-party sharing. <a href="/privacy">Privacy Policy</a> · unsubscribe anytime.
  </p>
</form>
```

### Page Speed & Technical (10 Points)

**Core Web Vitals Optimization** (thresholds are pass at the **p75** of *field* data)
- [ ] **Largest Contentful Paint (LCP)** (3 points): ≤ 2.5s — main content visible
- [ ] **Interaction to Next Paint (INP)** (2 points): ≤ 200ms — responsiveness across *all* interactions
- [ ] **Cumulative Layout Shift (CLS)** (2 points): ≤ 0.1 — visual stability
- [ ] **Image optimization** (1 point): AVIF/WebP, responsive `srcset`, `width`/`height` set (prevents CLS), lazy-load below-fold only
- [ ] **Critical CSS inline** (1 point): Above-fold styles inlined
- [ ] **JavaScript optimization** (1 point): Async/defer, code splitting, minimize long tasks (the #1 INP lever)

> **INP replaced FID.** First Input Delay was retired as a Core Web Vital in **March 2024**; **Interaction to Next Paint (INP)** is the official responsiveness metric. INP measures the full latency (input delay + processing + presentation) of *every* interaction across the visit, not just the first — so a fast FID page can still fail INP if click handlers run long tasks. Lower INP by breaking up long JS tasks (`scheduler.yield()` / `setTimeout` chunking), deferring non-critical work, and shrinking hydration.
>
> | Metric | Good (p75) | Needs improvement | Poor |
> |---|---|---|---|
> | LCP | ≤ 2.5s | ≤ 4.0s | > 4.0s |
> | INP | ≤ 200ms | ≤ 500ms | > 500ms |
> | CLS | ≤ 0.1 | ≤ 0.25 | > 0.25 |
>
> **Field vs. lab — score on field data.** Lab tools (Lighthouse, PageSpeed Insights lab run, WebPageTest) are reproducible but synthetic and **cannot measure INP** (no real interactions). What actually affects rankings/UX is **field** data at p75: Chrome UX Report (CrUX), the `web-vitals` JS library (RUM), or PSI's "field data" panel. Use lab to debug regressions; use field to pass/fail this section. Thresholds current as of Jun 2026 — verify at https://web.dev/articles/vitals.

```html
<!-- Performance Optimization Implementation -->
<head>
  <!-- Critical CSS inlined for faster rendering -->
  <style>
    /* Critical above-the-fold styles only */
    .hero{display:flex;min-height:min(100svh,720px);align-items:center;}
    .btn-primary{background:#1f6feb;color:#fff;padding:16px 32px;}
  </style>
  
  <!-- Preload critical resources -->
  <link rel="preload" href="/fonts/Inter-Regular.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/hero-image.webp" as="image">
  
  <!-- Non-critical CSS loaded asynchronously -->
  <link rel="preload" href="/styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
</head>

<body>
  <!-- Hero image with optimization -->
  <img src="/hero-image.webp" 
       alt="CRO Dashboard Preview"
       width="600" 
       height="400"
       loading="eager"
       decoding="sync">
  
  <!-- Lazy load below-fold images -->
  <img src="/testimonial-photo.webp" 
       alt="Customer testimonial"
       loading="lazy"
       decoding="async">
       
  <!-- Async JavaScript loading -->
  <script src="/analytics.js" async></script>
  <script src="/form-validation.js" defer></script>
</body>
```

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

## 📊 Heatmap Interpretation Guide

### Click Heatmap Analysis

**High-Value Click Patterns**
1. **CTA engagement**: Primary buttons should show intense click density
2. **Navigation patterns**: Identify unexpected click areas indicating user confusion
3. **Dead zone identification**: Areas with zero clicks that consume prime real estate
4. **Mobile vs desktop**: Different interaction patterns requiring separate optimization

```javascript
// Consent-gated, sampled, PII-minimized click collection.
function trackHeatmapData() {
  if (!analyticsAllowed() || !SAMPLED) return;   // gate + sample
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-cro-element], a, button') || e.target;
    // Bucket coordinates into a coarse grid so we can't re-identify a precise gesture.
    const col = Math.floor((e.clientX / window.innerWidth) * 20);   // 20-col grid
    const row = Math.floor((e.clientY / window.innerHeight) * 40);  // 40-row grid
    gtag('event', 'heatmap_click', {
      // identifiers / coarse position only — never raw text the user typed
      cro_el: el.getAttribute?.('data-cro-element') || el.tagName.toLowerCase(),
      el_id: el.id || undefined,
      grid: `${col}:${row}`,
      vw: window.innerWidth,            // viewport size for desktop/mobile split
      vh: window.innerHeight,
      sid: sessionId(),                 // per-session, non-persistent
    });
  }, { passive: true });
}
```

### Scroll Heatmap Insights

**Scroll Depth Analysis Framework**
- **25% scroll**: Headline and hero effectiveness
- **50% scroll**: Content engagement and value demonstration
- **75% scroll**: Social proof and objection handling success
- **100% scroll**: Complete page engagement, form placement effectiveness

```javascript
// Consent-gated scroll depth, throttled, no leaky globals.
function trackScrollDepth() {
  if (!analyticsAllowed() || !SAMPLED) return;
  const milestones = [25, 50, 75, 100];
  const fired = new Set();               // local state, resets per page load
  let ticking = false;

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {        // throttle: at most one calc per frame
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const pct = scrollable > 0
        ? Math.round((window.scrollY / scrollable) * 100) : 100;
      for (const m of milestones) {
        if (pct >= m && !fired.has(m)) {
          fired.add(m);
          gtag('event', 'scroll_depth', { depth: m, sid: sessionId() });
        }
      }
      if (fired.size === milestones.length) {
        window.removeEventListener('scroll', onScroll);   // done; stop listening
      }
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
}
```

## 🧪 Experimentation: Statistically Valid A/B Testing

A "win" is only real if the test was **powered up front**, **not peeked at**, and **passed its guardrails**. Most reported CRO wins fail because someone stopped the test the moment p dipped below 0.05.

### Pre-registration (decide before launch)
- **Primary metric** (one — usually CVR or RPV). Secondary/guardrail metrics are explicitly secondary.
- **Hypothesis** and expected direction.
- **MDE** (minimum detectable effect you care about, *relative*), **α** (false-positive rate, usually 0.05), **power** (1−β, usually 0.80), one- vs two-sided (default **two-sided**).
- **Fixed sample size & end date** computed from the above. You stop at that point, not before — unless using a proper sequential method (below).
- **Allocation** (e.g., 50/50) and **unit of randomization** (visitor, sticky across sessions — never page-view, or returning users contaminate arms).

### Sample-size calculator (correct: z-scores derived from α and power)
```javascript
// Inverse standard normal CDF (Acklam's rational approximation, ~1e-9 accuracy).
function normInv(p) {
  if (p <= 0 || p >= 1) throw new RangeError('p must be in (0,1)');
  const a=[-3.969683028665376e+01,2.209460984245205e+02,-2.759285104469687e+02,1.383577518672690e+02,-3.066479806614716e+01,2.506628277459239e+00];
  const b=[-5.447609879822406e+01,1.615858368580409e+02,-1.556989798598866e+02,6.680131188771972e+01,-1.328068155288572e+01];
  const c=[-7.784894002430293e-03,-3.223964580411365e-01,-2.400758277161838e+00,-2.549732539343734e+00,4.374664141464968e+00,2.938163982698783e+00];
  const d=[7.784695709041462e-03,3.224671290700398e-01,2.445134137142996e+00,3.754408661907416e+00];
  const pl=0.02425, ph=1-pl; let q,r;
  if (p<pl){q=Math.sqrt(-2*Math.log(p));return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
  if (p<=ph){q=p-0.5;r=q*q;return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);}
  q=Math.sqrt(-2*Math.log(1-p));return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
}

/**
 * Per-variant sample size for a two-proportion test (pooled-variance approximation).
 * @param baseline absolute baseline CVR, e.g. 0.03 for 3%
 * @param mde      RELATIVE lift to detect, e.g. 0.10 for +10% (→ 3.0% to 3.3%)
 * @param alpha    significance level (default 0.05)
 * @param power    1 - beta (default 0.80)
 * @param twoSided two-sided test? (default true)
 */
function sampleSizePerVariant(baseline, mde, alpha = 0.05, power = 0.80, twoSided = true) {
  const p1 = baseline;
  const p2 = baseline * (1 + mde);          // treatment rate under the MDE
  const zA = normInv(1 - alpha / (twoSided ? 2 : 1));   // derived from alpha, NOT hardcoded
  const zB = normInv(power);                            // derived from power, NOT hardcoded
  const pBar = (p1 + p2) / 2;
  const delta = Math.abs(p2 - p1);
  const n = (zA * Math.sqrt(2 * pBar * (1 - pBar)) + zB * Math.sqrt(p1*(1-p1) + p2*(1-p2)))**2 / delta**2;
  return Math.ceil(n);
}

// 3% baseline, detect a +10% relative lift, 95% / 80%:
const nPerArm = sampleSizePerVariant(0.03, 0.10, 0.05, 0.80);
console.log(`Need ~${nPerArm.toLocaleString()} per variant`); // ~53,000 — small lifts are expensive
```
For revenue/AOV (continuous, often skewed) the proportion formula does **not** apply — use a t-test/Mann–Whitney sizing on the metric's mean and variance, or a calculator that accepts σ. Reach for a vetted tool when unsure: Evan Miller's "Sample Size" calc, `statsmodels` (`NormalIndPower`, `tt_ind_solve_power`), R's `pwr`, or your platform's built-in (Optimizely/VWO/GrowthBook).

### Duration: cover whole business cycles
```javascript
function testDurationDays(nPerArm, dailyVisitorsPerArm) {
  // dailyVisitorsPerArm already reflects the traffic split across arms.
  const days = Math.ceil(nPerArm / dailyVisitorsPerArm);
  // Run in FULL weeks to absorb day-of-week effects, min 1 cycle (typically 14 days),
  // and stop on a week boundary so weekday/weekend mix is balanced across arms.
  const minDays = 14;
  return Math.max(Math.ceil(days / 7) * 7, minDays);
}
```
Run at least one full purchase/business cycle (often ≥ 2 weeks). Beware the **novelty effect** (returning users react to *any* change at first — let it wash out) and **seasonality** (don't straddle a holiday or a campaign spike).

### Sample Ratio Mismatch (SRM) — check this first, every time
If you allocated 50/50 but observed counts diverge, your randomization, redirect, or bot filtering is broken and **the whole test is invalid** — debug before reading results.
```javascript
// Chi-square SRM check; flag if p < 0.01 for a 50/50 split.
function srmCheck(countA, countB, expectedA = 0.5) {
  const n = countA + countB;
  const eA = n * expectedA, eB = n * (1 - expectedA);
  const chi2 = (countA-eA)**2/eA + (countB-eB)**2/eB;     // 1 dof
  // survival of chi-square(1): p = erfc( sqrt(chi2/2) )
  const erfc = (x) => { const t=1/(1+0.3275911*x);
    return (((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x); };
  const p = erfc(Math.sqrt(chi2 / 2));
  return { chi2: +chi2.toFixed(3), p: +p.toFixed(4), srm: p < 0.01 };
}
// srmCheck(10050, 9950) → {p: 0.48, srm: false}  ok, expected sampling noise
// srmCheck(10200,  9800) → {p: 0.005, srm: true}  INVALID — 51/49 at n=20k is too skewed to be chance
```

### No peeking — or use a method built for it
Repeatedly checking a fixed-horizon test and stopping at the first p<0.05 inflates the false-positive rate to **30%+**. Options:
- **Fixed-horizon (default):** decide N and end date up front; look once, at the end. Simple and correct.
- **Sequential / always-valid:** if you must monitor continuously, use a method designed for it — **mSPRT / always-valid p-values** (Optimizely Stats Engine), **group-sequential** with alpha-spending (O'Brien–Fleming / Pocock boundaries), or **Bayesian** continuous monitoring. Don't bolt continuous peeking onto a fixed-horizon t-test.

### Frequentist vs. Bayesian
| | Frequentist (t/z, p-value, CI) | Bayesian (posterior, P(B>A), expected loss) |
|---|---|---|
| Output | "p=0.03; reject null" | "92% probability B beats A; expected loss 0.1%" |
| Peeking | Invalid unless sequential | Valid to monitor (with care) |
| Stakeholder story | Harder | More intuitive |
| Tooling | statsmodels, R `pwr`, VWO | GrowthBook, Dynamic Yield, `PyMC` |
Either is fine if used correctly. Pick one per program and don't switch mid-test to whichever looks better (that's just peeking with extra steps).

### Multiple comparisons
Testing many variants or many metrics multiplies false positives. Control it: pre-designate **one** primary metric; for k variants vs. control use **Dunnett's** test; for arbitrary families use **Holm–Bonferroni** (less conservative than plain Bonferroni) or Benjamini–Hochberg FDR. Secondary metrics are hypothesis-generating, not ship-deciding.

### Guardrail metrics (don't win the battle, lose the war)
A CTA change can lift clicks while tanking revenue, refunds, or trust. Always watch, and require *no significant regression* on, guardrails such as: **revenue-per-visitor**, **AOV**, refund/chargeback rate, **bounce/exit**, downstream **activation/retention**, support tickets, page latency (a heavy variant can regress INP), and accessibility complaints. Ship only when the primary metric wins **and** no guardrail regresses.

### Reading results — ship/iterate/kill
- **Winner:** primary metric significant in the right direction, no SRM, no guardrail regression, ran ≥ full cycle → ship; monitor post-launch (effects often shrink vs. test).
- **Flat:** CI includes zero → likely underpowered or a weak idea. Don't ship; learn and form a bigger-swing hypothesis.
- **Loser:** ship the control, document *why* it lost (often more valuable than a win).
- Report the **effect size + confidence/credible interval**, never a bare p-value. "+8% CVR (95% CI +2% to +14%)" beats "p<0.05".

## 🎨 Hero Section Pattern Library

### Pattern 1: Problem-Solution Hero
```html
<section class="hero hero-problem-solution">
  <div class="container">
    <div class="hero-content">
      <!-- Problem hook -->
      <h1 class="hero-headline">
        Tired of Landing Pages That Don't Convert?
      </h1>
      
      <!-- Solution introduction. Use a TRUE, specific proof point — not a generic
           "double your X in 30 days" promise you can't guarantee for every visitor. -->
      <p class="hero-subheadline">
        Our 100-point CRO framework — used by [# real clients] to find and fix
        their biggest conversion leaks.
      </p>
      
      <!-- Outcome-focused CTA -->
      <button class="cta-primary">
        Get My Free CRO Audit
      </button>
      
      <!-- Immediate social proof. Show a REAL, recent, attributable result, framed
           as one client's outcome — never a fabricated or "typical" headline number
           (a "+127%" hero stat is selling, not testing; see the expectations note up top). -->
      <div class="result-preview">
        <span>Recent client result:</span>
        <strong>[Actual measured lift, e.g. "+18% trial signups (95% CI +6%–+30%)"]</strong>
      </div>
    </div>
  </div>
</section>
```

### Pattern 2: Outcome-Driven Hero
```html
<section class="hero hero-outcome-driven">
  <div class="container">
    <div class="hero-split">
      <div class="hero-content">
        <!-- Specific outcome promise -->
        <h1 class="hero-headline">
          Generate $10K More Revenue This Month
        </h1>
        
        <!-- Method preview -->
        <p class="hero-subheadline">
          Using our proven 5-step conversion optimization system 
          that's worked for 2,000+ businesses.
        </p>
        
        <!-- Risk-free trial -->
        <button class="cta-primary">
          Start 30-Day Free Trial
        </button>
        
        <!-- Guarantee statement -->
        <p class="guarantee">
          💰 Money-back guarantee if you don't see results
        </p>
      </div>
      
      <!-- Visual proof -->
      <div class="hero-visual">
        <img src="revenue-chart.png" alt="Revenue increase chart" />
      </div>
    </div>
  </div>
</section>
```

## 🏷️ Pricing Page CRO Strategies

### Pricing Table Optimization

```html
<!-- Three-Tier Pricing with Psychological Anchoring -->
<div class="pricing-table" data-cro-element="pricing">
  <!-- Decoy option (high price anchor) -->
  <div class="pricing-card pricing-basic">
    <h3>Basic</h3>
    <div class="price">$99<span>/month</span></div>
    <ul class="features">
      <li>5 pages analyzed</li>
      <li>Basic recommendations</li>
      <li>Email support</li>
    </ul>
    <button class="btn-secondary">Get Started</button>
  </div>
  
  <!-- Most popular (target option) -->
  <div class="pricing-card pricing-pro featured">
    <div class="popular-badge">Most Popular</div>
    <h3>Professional</h3>
    <div class="price">
      <span class="price-strike">$299</span>
      $199<span>/month</span>
    </div>
    <ul class="features">
      <li>✓ Unlimited page analysis</li>
      <li>✓ Custom recommendations</li>
      <li>✓ A/B testing setup</li>
      <li>✓ Priority support</li>
      <li>✓ Monthly strategy calls</li>
    </ul>
    <button class="btn-primary">Start Free Trial</button>
    <p class="guarantee">30-day money-back guarantee</p>
  </div>
  
  <!-- Premium option (establishes value) -->
  <div class="pricing-card pricing-enterprise">
    <h3>Enterprise</h3>
    <div class="price">$499<span>/month</span></div>
    <ul class="features">
      <li>Everything in Pro</li>
      <li>Dedicated CRO manager</li>
      <li>Weekly optimization reviews</li>
      <li>Custom integrations</li>
    </ul>
    <button class="btn-secondary">Contact Sales</button>
  </div>
</div>
```

### Urgency & Scarcity Ethics Framework

**Ethical Urgency Tactics**
1. **Limited-time bonuses**: Real deadlines for additional value
2. **Seasonal relevance**: Holiday sales, end-of-quarter budget cycles
3. **Capacity constraints**: Genuine service limitations
4. **Price increase notifications**: Advance warning of legitimate price changes

```html
<!-- Ethical Urgency Implementation.
     The deadline is set SERVER-SIDE to a REAL campaign end and rendered, never hardcoded
     in the client and never reset when it passes. Use a future ISO timestamp from your CMS. -->
<div class="urgency-banner ethical" data-expires="{{ promo.endsAtISO }}">
  <div class="urgency-content">
    <span class="urgency-label">{{ promo.label }}</span>
    <p>{{ promo.offer }}</p> <!-- e.g. "Get 3 months free when you start before the date below" -->
    <div class="countdown" data-countdown="{{ promo.endsAtISO }}" aria-live="polite">
      <!-- JS fills these from data-countdown; when it hits zero, HIDE the offer (don't loop). -->
      <span class="countdown-days">--</span> days
      <span class="countdown-hours">--</span> hours left
    </div>
  </div>
</div>
```
```javascript
// Honest countdown: drives from a real future timestamp and removes the offer at expiry.
function startCountdown(el) {
  const end = Date.parse(el.dataset.countdown);
  if (Number.isNaN(end)) return;
  const tick = () => {
    const ms = end - Date.now();
    if (ms <= 0) {                                   // genuinely expired: take the offer down
      el.closest('.urgency-banner')?.remove();       // NEVER reset to fake "15 days" again
      return clearInterval(timer);
    }
    el.querySelector('.countdown-days').textContent  = Math.floor(ms / 86400000);
    el.querySelector('.countdown-hours').textContent = Math.floor((ms % 86400000) / 3600000);
  };
  const timer = setInterval(tick, 60000); tick();
}
document.querySelectorAll('.countdown[data-countdown]').forEach(startCountdown);
```
```html
<!-- Capacity-Based Scarcity — only if the number is TRUE and tied to real capacity. -->
<div class="capacity-notice">
  <p>⚡ Only {{ onboarding.slotsLeft }} onboarding slots left this month</p>
  <small>We cap new clients to protect delivery quality.</small>
</div>
```

**Unethical Practices to Avoid**
- ❌ Fake countdown timers that reset
- ❌ Artificial scarcity with unlimited inventory  
- ❌ False claims about pricing or availability
- ❌ High-pressure tactics without genuine time constraints

## 📱 Mobile CRO Optimization

### Mobile-Specific Conversion Factors

```css
/* Mobile CRO CSS Framework */
@media (max-width: 768px) {
  /* Thumb-friendly touch targets */
  .btn-primary {
    min-height: 44px;
    min-width: 44px;
    font-size: 16px;
    padding: 12px 24px;
    border-radius: 8px;
    margin: 16px 0;
  }
  
  /* Simplified navigation */
  .main-nav {
    display: none; /* Hidden on mobile to reduce distraction */
  }
  
  /* Single-column layout */
  .hero-split {
    flex-direction: column;
  }
  
  /* Larger form inputs */
  .form-input {
    font-size: 16px; /* Prevents zoom on iOS */
    padding: 16px;
    border-radius: 8px;
    border: 2px solid #e1e5e9;
  }
  
  /* Sticky CTA for mobile */
  .cta-sticky {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 16px;
    background: #ffffff;
    box-shadow: 0 -4px 12px rgba(0,0,0,0.1);
    z-index: 1000;
  }
}
```

## 🔄 Continuous Optimization Process

### CRO Testing Calendar Template

```javascript
// Monthly CRO testing schedule
const croTestingCalendar = {
  week1: {
    focus: "Above-the-fold optimization",
    tests: ["Headline variations", "Hero image A/B", "CTA button color"],
    metrics: ["Bounce rate", "Scroll depth", "CTA clicks"]
  },
  
  week2: {
    focus: "Content and messaging",
    tests: ["Value proposition variants", "Social proof placement", "Feature vs benefit copy"],
    metrics: ["Time on page", "Scroll completion", "Form starts"]
  },
  
  week3: {
    focus: "Form and conversion flow",
    tests: ["Form field reduction", "Progressive disclosure", "Trust signal placement"],
    metrics: ["Form completion rate", "Form abandonment", "Conversion rate"]
  },
  
  week4: {
    focus: "Analysis and iteration",
    tests: ["Winner implementation", "Combo tests", "Mobile-specific variants"],
    metrics: ["Overall conversion rate", "Revenue per visitor", "Customer LTV"]
  }
};
```

## 🧮 Prioritizing fixes (PIE / ICE)

Score every audit finding and test idea so you work on impact, not whatever you noticed first.

**PIE** — best for ranking *pages/areas to test*:
| Factor | Question | Score 1–10 |
|---|---|---|
| **P**otential | How much improvement headroom? (low CVR, high bounce, weak page) | |
| **I**mportance | How valuable is this traffic? (volume × intent × $) | |
| **E**ase | How hard to implement the test? (dev, design, approvals) | |

Rank by the **average** of the three. **ICE** (Impact, Confidence, Ease) is the same idea for ranking *individual ideas* — Confidence captures how strong your evidence is.

```javascript
const ideas = [
  { name: 'Rewrite hero offer',    impact: 9, confidence: 6, ease: 5 },
  { name: 'Add SOC 2 trust row',   impact: 5, confidence: 7, ease: 9 },
  { name: 'Cut form 5→2 fields',   impact: 8, confidence: 8, ease: 7 },
];
const ranked = ideas
  .map(i => ({ ...i, ice: +((i.impact + i.confidence + i.ease) / 3).toFixed(1) }))
  .sort((a, b) => b.ice - a.ice);
// → "Cut form 5→2 fields" (7.7) tops "Add SOC 2 row" (7.0) > "Rewrite hero" (6.7)
```
Bias toward **high-confidence, high-ease wins first** (build momentum + traffic for the riskier big swings). Keep a backlog; re-score as evidence changes.

## 🧩 Framework / stack implementation notes

The HTML/CSS/JS above is illustrative. Apply the *principles* (semantic markup, one primary CTA, inline critical CSS, deferred JS, consent-gated analytics) in your stack:

- **Static HTML / Astro / 11ty:** inline critical CSS in `<head>`, `defer` scripts, ship AVIF/WebP with explicit `width`/`height`. Easiest path to great Core Web Vitals.
- **React / Next.js:** prefer **Server Components / SSR or SSG** for hero + above-the-fold so LCP isn't blocked on hydration; lazy-load below-fold with `next/dynamic`; use `next/image` (auto AVIF/WebP, sizing → no CLS) and `next/font` (no layout shift). Hydration is the usual **INP** culprit — minimize client JS, split bundles, and stream. Run experiments with an edge-decided variant cookie (`middleware`) to avoid a flash of the control.
- **Shopify:** edit the theme via Liquid sections/blocks; you usually can't fully inline critical CSS — instead trim apps (each injects render-blocking JS), use the theme's responsive `image_url`/`image_tag` filters, and prefer **native A/B** in Shopify or an app like Intelligems/Visually over a redirect test (redirects hurt LCP and can cause flicker).
- **Webflow / Framer / Unbounce / Instapage:** keep the DOM lean (these can over-nest divs and bloat CSS), compress images in-platform, limit embeds/interactions, and use the platform's built-in A/B (Optimize-style) rather than client-side flicker hacks.
- **Experimentation platforms (2026):** server-side/edge assignment beats client-side redirects for speed and anti-flicker. Options include **GrowthBook** (open-source, feature-flag + stats), **Optimizely**, **VWO**, **AB Tasty**, Shopify-native, or your own flag service. Whatever you use, fire a single exposure event with the variant id and join it to conversion server-side.
- **Analytics:** GA4 (with **Consent Mode v2**) for funnels/events; PostHog or Matomo if you want self-hosted/cookieless-friendly; Microsoft Clarity (free) or Hotjar for heatmaps/replays — all still **consent-gated** per the privacy section, with replay **input masking** on.

## ♿ Accessibility = conversion (WCAG 2.2 AA)

Inaccessible pages exclude paying users and, in many markets, create legal exposure. Bake these in (most are also CRO wins):

- **Semantics:** real `<button>` for actions, `<a href>` for navigation — never a clickable `<div>` (breaks keyboard + screen readers). One `<h1>`; logical heading order.
- **Keyboard:** every interactive element reachable and operable by keyboard in a sensible tab order; visible **`:focus-visible`** indicator (don't `outline:none` without a replacement).
- **Contrast:** text ≥ **4.5:1** (≥ 3:1 for ≥ 24px/bold large text); UI/icon/focus indicators ≥ **3:1**. Check your CTA color against its background — "high-contrast button" and "accessible button" are the same requirement.
- **Forms:** programmatic `<label>` for every field; errors in **text** (not color alone), linked via `aria-describedby`, with `aria-invalid`; move focus to the first error on submit.
- **Targets (WCAG 2.2):** interactive targets ≥ **24×24 px** (aim 44×44 for mobile primary CTAs), with adequate spacing.
- **Motion:** honor `@media (prefers-reduced-motion: reduce)` — disable autoplay/parallax/large animations; auto-rotating carousels need pause controls.
- **Media:** `alt` text on meaningful images (empty `alt=""` for decorative); captions on video testimonials; don't autoplay audio.
- **Verify:** automated (axe DevTools, Lighthouse a11y) catches ~30–40%; add a keyboard-only pass and a screen-reader spot check (VoiceOver/NVDA).

```css
/* Accessible, conversion-friendly primary CTA */
.btn-primary { background:#1f6feb; color:#fff; min-height:44px; padding:16px 32px;
  border:0; border-radius:8px; font-size:18px; font-weight:600; cursor:pointer; }
.btn-primary:focus-visible { outline:3px solid #0b3d91; outline-offset:2px; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration:.001ms !important; transition-duration:.001ms !important; }
}
```

---

This framework is a **loop, not a one-shot audit**: instrument → diagnose → hypothesize → prioritize (PIE/ICE) → run a *powered* experiment with SRM + guardrail checks → ship/learn → repeat. Optimize honestly (no dark patterns), measure on field data, and gate every tracker behind consent. For popups/exit-intent/cookie-consent UX see `popup-cro`; for multi-step signup and onboarding funnels see `signup-flow-cro`.
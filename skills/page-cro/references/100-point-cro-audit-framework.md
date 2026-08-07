## Contents

- 🎯 100-Point CRO Audit Framework
- Above-The-Fold Checklist (25 Points)
- Content & Messaging (25 Points)
- Social Proof & Trust (15 Points)
- CTA Optimization (15 Points)
- Form Optimization (10 Points)
- Page Speed & Technical (10 Points)

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

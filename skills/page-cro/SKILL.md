---
name: page-cro
description: Landing page CRO audit framework with 100-point checklist, heatmap analysis, statistical testing, and conversion optimization strategies
version: 2.0.0
---

# Landing Page CRO Optimization Framework

> Expert-level conversion rate optimization for landing pages with data-driven methodologies, statistical rigor, and actionable implementation strategies.

## 🎯 100-Point CRO Audit Framework

### Above-The-Fold Checklist (25 Points)

**Hero Section Critical Elements**
- [ ] **Value proposition clarity** (3 points): 7-second rule test passed
- [ ] **Headline power** (3 points): Specific, benefit-driven, emotional trigger
- [ ] **Subheadline support** (2 points): Reinforces and elaborates on headline
- [ ] **CTA visibility** (3 points): Contrasting color, clear action verb, above fold
- [ ] **Hero image relevance** (2 points): Supports value prop, shows product in use
- [ ] **Social proof placement** (3 points): Logo wall, testimonial, or usage stats
- [ ] **Load time optimization** (3 points): <2s LCP, optimized images
- [ ] **Mobile hero optimization** (3 points): Stacked layout, thumb-friendly CTA
- [ ] **Navigation clarity** (2 points): Minimal, focused, supports conversion goal
- [ ] **Trust signals** (1 point): Security badges, certifications, guarantees

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
```css
/* Mobile Hero Optimization */
.hero {
  min-height: 100vh; /* Full viewport engagement */
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
- [ ] **Emotional triggers** (2 points): Fear, greed, vanity, pride, sloth addressed
- [ ] **Objection handling** (3 points): Common concerns proactively addressed
- [ ] **Scannability** (2 points): F-pattern reading, bullet points, headers
- [ ] **Reading level** (2 points): 8th grade or lower readability score
- [ ] **Action-oriented language** (1 point): Active voice, power words
- [ ] **Urgency without manipulation** (1 point): Genuine scarcity or time sensitivity

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
1. **Customer testimonials** (Video > Photo + name > Text only)
2. **Usage statistics** (Users, transactions, years in business)
3. **Media mentions** (Logos of publications that covered you)
4. **Customer logos** (Recognizable brands using your service)
5. **Certifications** (Industry credentials, security badges)
6. **Guarantees** (Money-back, satisfaction, security)

```html
<!-- Social Proof Component Library -->
<div class="social-proof-section" data-cro-element="social-proof">
  <!-- Testimonial Carousel -->
  <div class="testimonial-carousel">
    <div class="testimonial" data-social-proof="video-testimonial">
      <video poster="testimonial-thumb.jpg" controls>
        <source src="customer-testimonial.mp4" type="video/mp4">
      </video>
      <cite>
        <strong>Sarah Chen, CMO at TechCorp</strong>
        <span>Increased conversions 127% in 60 days</span>
      </cite>
    </div>
  </div>

  <!-- Usage Statistics -->
  <div class="stats-bar" data-social-proof="usage-stats">
    <div class="stat">
      <span class="stat-number">10,000+</span>
      <span class="stat-label">Happy customers</span>
    </div>
    <div class="stat">
      <span class="stat-number">$2M+</span>
      <span class="stat-label">Revenue generated</span>
    </div>
  </div>

  <!-- Security & Trust Badges -->
  <div class="trust-badges" data-social-proof="trust-signals">
    <img src="ssl-secure.svg" alt="SSL Secured" />
    <img src="gdpr-compliant.svg" alt="GDPR Compliant" />
    <img src="money-back.svg" alt="30-day money back guarantee" />
  </div>
</div>
```

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
- [ ] **CTA copy optimization** (3 points): Action verb + benefit + urgency
- [ ] **Button design** (2 points): Size, color, spacing optimized for clicks
- [ ] **CTA placement** (2 points): Multiple strategic placements without confusion
- [ ] **Micro-copy support** (2 points): Risk reduction text near CTA
- [ ] **Loading states** (1 point): Clear feedback during form submission
- [ ] **Mobile optimization** (2 points): Thumb-friendly size and placement

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
```javascript
// CTA Testing Variants
const ctaVariants = {
  copy: [
    "Sign Up Free", // Generic
    "Start Free Trial", // Process-focused  
    "Get Instant Access", // Immediate gratification
    "Claim Your Spot", // Exclusivity
    "Double Your Sales", // Outcome-focused
  ],
  
  colors: [
    { bg: '#ff6b35', text: '#ffffff' }, // Orange (urgency)
    { bg: '#28a745', text: '#ffffff' }, // Green (go/success)
    { bg: '#007bff', text: '#ffffff' }, // Blue (trust)
    { bg: '#6f42c1', text: '#ffffff' }  // Purple (premium)
  ],
  
  sizes: [
    { padding: '12px 24px', fontSize: '16px' }, // Standard
    { padding: '16px 32px', fontSize: '18px' }, // Large
    { padding: '20px 40px', fontSize: '20px' }  // XL
  ]
};

function assignCTAVariant() {
  const variant = Math.floor(Math.random() * ctaVariants.copy.length);
  return {
    copy: ctaVariants.copy[variant],
    style: ctaVariants.colors[variant],
    size: ctaVariants.sizes[variant]
  };
}
```

### Form Optimization (10 Points)

**Form Conversion Best Practices**
- [ ] **Field reduction** (2 points): Minimum viable fields only
- [ ] **Progressive disclosure** (2 points): Conditional field display
- [ ] **Input validation** (2 points): Real-time, helpful error messages
- [ ] **Autofill optimization** (1 point): Proper input attributes
- [ ] **Mobile form UX** (2 points): Large inputs, proper keyboards
- [ ] **Privacy messaging** (1 point): Clear data usage explanation

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
             required>
      
      <label for="traffic">Monthly Traffic</label>
      <select id="traffic" autocomplete="off">
        <option>Under 10K</option>
        <option>10K - 50K</option>
        <option>50K - 100K</option>
        <option>100K+</option>
      </select>
      
      <button type="submit" class="btn-submit">
        Send My Free Audit
      </button>
    </div>
  </div>
  
  <p class="privacy-note">
    🔒 We never share your data. Unsubscribe anytime.
  </p>
</form>
```

### Page Speed & Technical (10 Points)

**Core Web Vitals Optimization**
- [ ] **Largest Contentful Paint** (3 points): <2.5s loading time
- [ ] **First Input Delay** (2 points): <100ms interaction responsiveness  
- [ ] **Cumulative Layout Shift** (2 points): <0.1 visual stability score
- [ ] **Image optimization** (1 point): WebP format, lazy loading, responsive
- [ ] **Critical CSS inline** (1 point): Above-fold styles inlined
- [ ] **JavaScript optimization** (1 point): Async/defer, code splitting

```html
<!-- Performance Optimization Implementation -->
<head>
  <!-- Critical CSS inlined for faster rendering -->
  <style>
    /* Critical above-the-fold styles only */
    .hero{display:flex;min-height:100vh;align-items:center;}
    .btn-primary{background:#ff6b35;color:#fff;padding:16px 32px;}
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

## 📊 Heatmap Interpretation Guide

### Click Heatmap Analysis

**High-Value Click Patterns**
1. **CTA engagement**: Primary buttons should show intense click density
2. **Navigation patterns**: Identify unexpected click areas indicating user confusion
3. **Dead zone identification**: Areas with zero clicks that consume prime real estate
4. **Mobile vs desktop**: Different interaction patterns requiring separate optimization

```javascript
// Heatmap Data Collection
function trackHeatmapData() {
  document.addEventListener('click', function(e) {
    const data = {
      x: e.clientX,
      y: e.clientY,
      element: e.target.tagName,
      className: e.target.className,
      timestamp: Date.now(),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
    
    // Send to analytics
    gtag('event', 'heatmap_click', data);
  });
}
```

### Scroll Heatmap Insights

**Scroll Depth Analysis Framework**
- **25% scroll**: Headline and hero effectiveness
- **50% scroll**: Content engagement and value demonstration
- **75% scroll**: Social proof and objection handling success
- **100% scroll**: Complete page engagement, form placement effectiveness

```javascript
// Scroll depth tracking
function trackScrollDepth() {
  let maxScroll = 0;
  const scrollMilestones = [25, 50, 75, 100];
  
  window.addEventListener('scroll', function() {
    const scrollPercent = Math.round(
      (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
    );
    
    if (scrollPercent > maxScroll) {
      maxScroll = scrollPercent;
      
      scrollMilestones.forEach(milestone => {
        if (scrollPercent >= milestone && !window[`milestone_${milestone}`]) {
          window[`milestone_${milestone}`] = true;
          gtag('event', 'scroll_depth', {
            depth: milestone,
            element_visible: getVisibleElements()
          });
        }
      });
    }
  });
}
```

## 🧪 Statistical Significance Framework

### A/B Testing Methodology

**Sample Size Calculation**
```javascript
// Statistical significance calculator
function calculateSampleSize(baseline, mde, alpha = 0.05, power = 0.8) {
  const z_alpha = 1.96; // 95% confidence
  const z_beta = 0.84;  // 80% power
  
  const pooled_p = baseline;
  const delta = mde * baseline; // Minimum detectable effect
  
  const n = Math.ceil(
    (2 * pooled_p * (1 - pooled_p) * Math.pow(z_alpha + z_beta, 2)) 
    / Math.pow(delta, 2)
  );
  
  return n;
}

// Usage example
const requiredSample = calculateSampleSize(
  0.03,   // 3% baseline conversion rate
  0.20,   // 20% relative improvement (MDE)
  0.05,   // 5% significance level
  0.80    // 80% statistical power
);
console.log(`Required sample size per variant: ${requiredSample}`);
```

**Test Duration Planning**
```javascript
function calculateTestDuration(sampleSize, dailyTraffic, variants = 2) {
  const totalSampleNeeded = sampleSize * variants;
  const daysRequired = Math.ceil(totalSampleNeeded / dailyTraffic);
  
  // Account for day-of-week effects (minimum 1 full week)
  const minimumDays = 7;
  
  return Math.max(daysRequired, minimumDays);
}
```

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
      
      <!-- Solution introduction -->
      <p class="hero-subheadline">
        Our 100-point CRO framework has helped 500+ businesses 
        double their conversion rates in 30 days.
      </p>
      
      <!-- Outcome-focused CTA -->
      <button class="cta-primary">
        Get My Free CRO Audit
      </button>
      
      <!-- Immediate social proof -->
      <div class="result-preview">
        <span>Latest client result:</span>
        <strong>+127% conversion increase</strong>
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
<!-- Ethical Urgency Implementation -->
<div class="urgency-banner ethical" data-expires="2024-12-31">
  <div class="urgency-content">
    <span class="urgency-label">Year-End Bonus</span>
    <p>Get 3 months free when you start before December 31st</p>
    <div class="countdown" data-countdown="2024-12-31T23:59:59">
      <span class="countdown-days">15</span> days
      <span class="countdown-hours">07</span> hours left
    </div>
  </div>
</div>

<!-- Capacity-Based Scarcity -->
<div class="capacity-notice">
  <p>⚡ Only 12 spots remaining for January onboarding</p>
  <small>We limit new clients to ensure quality service</small>
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

This comprehensive landing page CRO framework provides a systematic approach to conversion optimization with measurable, data-driven methodologies. Each element is designed to be immediately actionable with specific implementation guidelines and testing strategies.
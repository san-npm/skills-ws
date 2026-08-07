## Contents

- 🧪 20+ A/B Testing Ideas
- Form Design Tests
- Social Login Tests
- Trust & Security Tests
- Progressive Profiling Tests
- Mobile-Specific Tests
- Incentive & Motivation Tests
- Error Handling Tests
- Onboarding Handoff Tests
- Advanced Segmentation Tests
- CRO experiment workflow (instrument → measure → decide)

## 🧪 20+ A/B Testing Ideas

### Form Design Tests

1. **Single vs Multi-Step Flow**
   - Test completion rates across user segments
   - Measure time to completion
   - Analyze drop-off points

2. **Field Order Variations**
   - Email first vs name first
   - Password placement (early vs late)
   - Optional fields at end vs throughout

3. **Label vs Placeholder Text**
   - Traditional labels above fields
   - Floating labels inside fields
   - Placeholder-only (accessibility concern)

4. **Required Field Indicators**
   - Red asterisks (*)
   - "Required" text
   - Optional field marking instead
   - No indicators (minimal design)

5. **Button Copy Variations**
   ```html
   <!-- Test variations -->
   <button>Sign Up</button>
   <button>Create Account</button>
   <button>Join Free</button>
   <button>Get Started</button>
   <button>Start Free Trial</button>
   <button>Join 50,000+ Users</button>
   ```

### Social Login Tests

6. **Social Provider Order**
   - Google first vs LinkedIn first (B2B)
   - Alphabetical vs usage-based ordering
   - Single prominent option vs equal treatment

7. **Social Login Placement**
   - Above form vs below form
   - Separate page vs integrated
   - Modal popup vs inline

8. **Social Button Design**
   - Provider logos vs text only
   - Individual buttons vs dropdown selector
   - Button size and spacing variations

### Trust & Security Tests

9. **Trust Signal Placement**
   - Security badges near password field
   - Customer logos above form
   - Testimonials on signup page

10. **Privacy Messaging**
    ```html
    <!-- Test variations -->
    <p>🔒 Your data is secure</p>
    <p>We never spam or share your info</p>
    <p>Join securely - we protect your privacy</p>
    <p>100% secure signup</p>
    ```

11. **Password Requirements Display**
    - Hide until focused
    - Always visible
    - Progressive disclosure as user types
    - Simplified requirements

### Progressive Profiling Tests

12. **Data Collection Timing**
    - Immediate (in signup form)
    - Post-signup modal
    - During first session
    - After feature use

13. **Progressive Form Triggers**
    - Time-based (after 5 minutes)
    - Action-based (after 3 page views)
    - Engagement-based (after interaction)
    - Value-based (after seeing benefit)

### Mobile-Specific Tests

14. **Mobile Form Layout**
    - Stacked fields vs side-by-side
    - Sticky submit button vs inline
    - Full-screen form vs modal

15. **Mobile Input Optimization**
    - Input size and spacing
    - Keyboard type optimization
    - Auto-zoom prevention techniques

### Incentive & Motivation Tests

16. **Signup Incentives**
    - Free trial emphasis
    - Bonus features for early signup
    - Limited-time offers
    - Social proof (user count)

17. **Value Proposition Placement**
    - Above form vs integrated
    - Benefits list vs single statement
    - Customer outcome focus

### Error Handling Tests

18. **Error Message Style**
    - Inline vs summary at top
    - Red error text vs neutral
    - Constructive vs punitive tone

19. **Validation Timing**
    - Real-time as user types
    - On field blur (loss of focus)
    - On form submit only
    - Progressive validation

### Onboarding Handoff Tests

20. **Post-Signup Experience**
    - Immediate dashboard access
    - Guided onboarding flow
    - Email verification first
    - Welcome video/tour

21. **Success Messaging**
    ```html
    <!-- Test variations -->
    <h2>Welcome aboard!</h2>
    <h2>Account created successfully</h2>
    <h2>You're all set!</h2>
    <h2>Let's get started</h2>
    ```

### Advanced Segmentation Tests

22. **Audience-Specific Forms**
    - B2B vs B2C optimized fields
    - Mobile vs desktop experiences
    - Traffic source customization
    - Geographic variations

**Assignment must be deterministic, not `Math.random()`.** Random client-side
bucketing re-rolls on every reload and differs across a user's devices,
corrupting the experiment (and inflating sample-ratio mismatch). Bucket by
hashing a *stable* id (a logged-in user id, or a first-party experiment cookie
set server-side) so the same visitor always lands in the same variant. For
anything that touches revenue or pricing, do assignment on the **server** and
pass the variant down; the client snippet below is for presentational tests
on anonymous traffic.

```javascript
// Deterministic variant assignment. Same (experiment, userId) => same bucket,
// stable across reloads and devices. Honors integer weights.
function hashToUnitInterval(str) {
  // FNV-1a 32-bit -> [0,1). Deterministic, no crypto needed for bucketing.
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 0xffffffff;
}

// `userId` should be a STABLE id: logged-in id, or a first-party cookie value
// that you also know server-side (so server + client agree -> no SRM).
function assignVariant(experiment, userId, variants) {
  const total = variants.reduce((s, v) => s + (v.weight || 1), 0);
  const point = hashToUnitInterval(`${experiment}:${userId}`) * total;
  let cumulative = 0;
  for (const v of variants) {
    cumulative += v.weight || 1;
    if (point < cumulative) return v;
  }
  return variants[0];
}

// A/B test runner for presentational signup tests.
class SignupFlowTester {
  constructor() {
    this.userId = this.getStableId();   // first-party, persistent
    this.active = new Map();
  }

  // Stable anonymous id in a first-party cookie (server can read the same
  // value). Falls back to localStorage if cookies are blocked.
  getStableId() {
    const KEY = 'exp_uid';
    const fromCookie = document.cookie.split('; ')
      .find((c) => c.startsWith(`${KEY}=`))?.split('=')[1];
    if (fromCookie) return fromCookie;
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) ||
           String(Date.now()) + Math.random().toString(36).slice(2);
      localStorage.setItem(KEY, id);
      document.cookie = `${KEY}=${id}; Max-Age=31536000; Path=/; SameSite=Lax`;
    }
    return id;
  }

  // Only run on the eligible audience; everyone else sees control and is
  // EXCLUDED from analysis (don't dilute with ineligible users).
  run(experiment, variants, isEligible = () => true) {
    if (!isEligible(this.userId)) return variants[0];
    const variant = assignVariant(experiment, this.userId, variants);
    this.active.set(experiment, { variant, startedAt: Date.now() });
    this.exposure(experiment, variant.name);
    return variant;
  }

  // Fire exposure exactly once, only when the user actually SEES the variant.
  exposure(experiment, variant) {
    if (typeof gtag === 'function') {
      gtag('event', 'experiment_exposure', { experiment, variant, anon_id: this.userId });
    }
  }

  conversion(experiment, type, value = 1) {
    const t = this.active.get(experiment);
    if (!t || typeof gtag !== 'function') return;
    gtag('event', 'signup_conversion', {
      experiment,
      variant: t.variant.name,
      conversion_type: type,
      value,
      time_to_conversion_ms: Date.now() - t.startedAt,
    });
  }

  // Example: copy test, eligible to everyone.
  runButtonCopyTest() {
    const variant = this.run('button_copy', [
      { name: 'control', copy: 'Create account', weight: 1 },
      { name: 'value', copy: 'Start free trial', weight: 1 },
    ]);
    const btn = document.querySelector('.btn-signup .btn-text') ||
                document.querySelector('.btn-signup');
    if (btn) btn.textContent = variant.copy;
  }
}
```

### CRO experiment workflow (instrument → measure → decide)

Templates are worthless without a disciplined process. Run every signup test
through these steps:

**1. Instrument the funnel.** Define a stable event taxonomy *before* testing
so every variant emits the same events:

| Event | When | Key properties |
|-------|------|----------------|
| `signup_view` | Signup form rendered | `flow_type`, `device`, `source`, `anon_id` |
| `signup_field_focus` | First focus per field | `field`, `step` |
| `signup_field_error` | Validation error shown | `field`, `error_type` |
| `signup_step_complete` | Multi-step: step finished | `step`, `time_on_step_ms` |
| `signup_submit` | Submit attempted | `method` (password/google/passkey…) |
| `signup_account_created` | Account persisted | `method`, `email_verified` |
| `email_verified` | Verification confirmed | `time_to_verify_ms` |
| `activated` | First meaningful action (your North Star) | `feature` |

**2. Define the metrics.** Primary = the step you're optimizing
(e.g. `signup_account_created / signup_view`). Always carry **guardrails**:
activation rate, verified-email rate, support tickets, and (for paid) trial→paid.
A signup-completion win that drops activation is a loss.

**3. Baseline + segment.** Pull 2–4 weeks of baseline by **device**, **traffic
source**, and **B2B vs B2C** — never optimize on a blended average; mobile and
desktop signup behave differently enough to mask each other.

**4. Power the test (sample size / MDE).** Decide the minimum detectable
effect you care about, then compute n *before* launching:

```javascript
// Per-variant sample size for a two-proportion test (approx, two-sided).
// alpha=0.05 (z≈1.96), power=0.80 (z≈0.84).
function sampleSizePerVariant(baselineRate, relativeMDE) {
  const p1 = baselineRate;
  const p2 = baselineRate * (1 + relativeMDE);
  const pBar = (p1 + p2) / 2;
  const z = 1.96, zb = 0.84;
  const num = (z * Math.sqrt(2 * pBar * (1 - pBar)) +
               zb * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2;
  return Math.ceil(num / ((p2 - p1) ** 2));
}
// e.g. 20% baseline, want to detect a 5% relative lift:
// sampleSizePerVariant(0.20, 0.05) -> ~25k per arm. Estimate runtime from
// your weekly eligible traffic, and commit to that duration up front.
```

**5. Run the checks while live.**
- **SRM (sample-ratio mismatch):** if you split 50/50 but observed counts
  diverge (chi-square p < 0.01), assignment or logging is broken — **stop and
  fix**, don't interpret results. (A common cause is the `Math.random()`
  pattern this skill just replaced.)
- **Bot/internal filtering:** exclude known bots, internal IPs, and QA
  accounts from both assignment and analysis.
- **Consent:** users who declined analytics consent shouldn't be force-bucketed
  into measured experiments; respect the same legal basis as profiling.

**6. Stopping rule (no peeking).** Fix the duration/sample in advance and read
results once at the end. If you must monitor continuously, use a method built
for it (sequential testing / always-valid p-values or a Bayesian model) — a
fixed-horizon test peeked at daily massively inflates false positives.

**7. Decision template.** Record for every test:

```
Experiment:        signup_button_copy
Hypothesis:        "Start free trial" lifts completion for paid-intent traffic
Primary metric:    account_created / signup_view
MDE / n / runtime: +5% rel / 25k per arm / ~14 days
Result:            control 20.1% vs variant 21.4%; +6.5% rel, 95% CI [+1.2%, +12%]
Guardrails:        activation flat (ns), verified-email flat (ns)  ✅
SRM:               p=0.42 (pass)
Decision:          SHIP to all paid-intent traffic; backlog a follow-up on mobile
```

A negative or flat result is still a win — it bought certainty. Roll the
loser back and document why so it isn't re-tested blindly.

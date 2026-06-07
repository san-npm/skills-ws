---
name: signup-flow-cro
description: "Signup flow CRO — single vs multi-step analysis, social/passkey login impact, progressive profiling, friction audit, and 20+ A/B test ideas. Use when designing or optimizing signup, onboarding form, or registration funnel. For general pages see `page-cro`; for popups see `popup-cro`."
---

# Signup Flow CRO Optimization Framework

> Conversion optimization methodology for signup flows: low-friction form
> design, modern authentication (passkeys/WebAuthn + social with safe
> fallbacks), NIST-aligned password UX, privacy-respecting progressive
> profiling, and statistically disciplined A/B testing. Code samples are
> illustrative starting points — validate any uplift on your own funnel.

> **On the numbers in this skill:** social-proof counts like "Join 50,000+
> Users" in the templates are PLACEHOLDERS. Only display a count you can
> substantiate — inflated or fabricated figures are both an ethics problem and,
> in some jurisdictions, a deceptive-advertising one. Swap in your real number
> or remove the claim. This skill ships **no** universal conversion benchmarks;
> see "Do NOT ship a universal social-login number" below for why.

## 🚀 Single vs Multi-Step Analysis Framework

### Single-Step Signup Analysis

**Advantages of Single-Step Forms**
- ✅ Lower perceived friction (visual simplicity)
- ✅ Higher completion rates for motivated users
- ✅ Faster time to completion
- ✅ Better mobile experience
- ✅ Easier A/B testing and analytics

**Disadvantages of Single-Step Forms**
- ❌ Overwhelming for complex signups
- ❌ Higher abandonment at validation errors
- ❌ No progressive commitment building
- ❌ Poor error handling experience
- ❌ Difficult to optimize individual fields

```html
<!-- Single-Step Signup Form Template -->
<form class="signup-form single-step" data-flow-type="single-step">
  <div class="form-header">
    <h2>Join 50,000+ Users</h2>
    <p>Start your free trial today</p>
  </div>
  
  <div class="form-fields">
    <!-- Account-essential fields ONLY. Every required field costs
         conversion: collect the minimum needed to create the account
         (typically just email + password) and defer everything else to
         progressive profiling or social autofill. Do NOT make name
         required here — it is rarely needed at the account-creation step
         and contradicts a low-friction signup. -->
    <input type="email"
           name="email"
           placeholder="Email Address"
           autocomplete="email"
           inputmode="email"
           required>

    <!-- Length-first password. No maxlength, no composition rules, no
         pattern attribute (see "Password UX" below for the rationale). -->
    <input type="password"
           name="password"
           placeholder="Create Password (12+ characters)"
           autocomplete="new-password"
           minlength="12"
           required>

    <!-- OPTIONAL, clearly labeled, never blocks submit. Collect a single
         display name only if your product genuinely needs it now. -->
    <input type="text"
           name="firstName"
           placeholder="First name (optional)"
           autocomplete="given-name">

    <!-- B2B-only: company is OPTIONAL at signup; enrich post-signup from
         the email domain or progressive profiling instead. -->
    <input type="text"
           name="company"
           placeholder="Company (optional)"
           autocomplete="organization">
  </div>

  <!-- Trust signals -->
  <div class="form-trust">
    <label class="checkbox-wrapper">
      <input type="checkbox" name="acceptTerms" required>
      <span class="checkmark"></span>
      I agree to the <a href="/terms">Terms</a> and
      <a href="/privacy">Privacy Policy</a>
    </label>

    <!-- Make any privacy claim TRUE and specific. "We never share" is a
         legal commitment; only state what your privacy policy actually
         says. A vague "your data is secure" badge adds no trust and can
         expose you. Prefer a concrete, verifiable signal. -->
    <p class="privacy-note">
      🔒 No spam. Unsubscribe anytime. See our
      <a href="/privacy">Privacy Policy</a>.
    </p>
  </div>
  
  <button type="submit" class="btn-signup">
    Start Free Trial → No Credit Card
  </button>
  
  <!-- Social signup options -->
  <div class="social-signup">
    <div class="divider">
      <span>or continue with</span>
    </div>
    
    <div class="social-buttons">
      <!-- Handlers wired to the canonical initiateSocialLogin() defined in
           "Social Login Implementation Best Practices" below. -->
      <button type="button" class="btn-social google" onclick="initiateSocialLogin('google')">
        <img src="/google-icon.svg" alt="">
        Continue with Google
      </button>

      <button type="button" class="btn-social microsoft" onclick="initiateSocialLogin('microsoft')">
        <img src="/microsoft-icon.svg" alt="">
        Continue with Microsoft
      </button>
    </div>
  </div>
</form>
```

### Multi-Step Signup Analysis

**Advantages of Multi-Step Forms**
- ✅ Progressive commitment building
- ✅ Better user guidance and help
- ✅ Easier error handling per step
- ✅ Opportunity for value reinforcement
- ✅ Better analytics per step

**Disadvantages of Multi-Step Forms**
- ❌ Higher perceived friction
- ❌ Risk of abandonment between steps
- ❌ More complex implementation
- ❌ Requires step-by-step optimization
- ❌ Potential mobile navigation issues

```html
<!-- Multi-Step Signup Flow -->
<div class="signup-flow multi-step" data-flow-type="multi-step">
  <!-- Progress indicator -->
  <div class="progress-bar">
    <div class="progress-step active" data-step="1">
      <span class="step-number">1</span>
      <span class="step-label">Account</span>
    </div>
    <div class="progress-step" data-step="2">
      <span class="step-number">2</span>
      <span class="step-label">Profile</span>
    </div>
    <div class="progress-step" data-step="3">
      <span class="step-number">3</span>
      <span class="step-label">Preferences</span>
    </div>
  </div>
  
  <!-- Step 1: Basic Account Information -->
  <div class="step-content active" data-step="1">
    <div class="step-header">
      <h2>Create Your Account</h2>
      <p>Quick setup - takes less than 2 minutes</p>
    </div>
    
    <form class="step-form">
      <input type="email"
             name="email"
             placeholder="Your email address"
             autocomplete="email"
             inputmode="email"
             required>

      <!-- Single password field + a show/hide toggle. Drop the
           "confirm password" field: with a reveal toggle and a paste-
           friendly input it adds friction without preventing typos, and
           password managers ignore it. -->
      <div class="password-field">
        <input type="password"
               name="password"
               placeholder="Choose a strong password (12+ characters)"
               autocomplete="new-password"
               minlength="12"
               required>
        <button type="button" class="toggle-password"
                aria-label="Show password"
                aria-pressed="false">Show</button>
      </div>

      <button type="button" class="btn-next" onclick="nextStep(2)">
        Continue →
      </button>
    </form>
    
    <!-- Social options prominent in step 1 -->
    <div class="social-signup">
      <div class="divider"><span>or</span></div>
      <button type="button" class="btn-social google" onclick="initiateSocialLogin('google')">
        <img src="/google-icon.svg" alt="">
        Sign up with Google
      </button>
    </div>
  </div>
  
  <!-- Step 2: Personal Information -->
  <div class="step-content" data-step="2">
    <div class="step-header">
      <h2>Tell Us About Yourself</h2>
      <p>Help us personalize your experience</p>
    </div>
    
    <form class="step-form">
      <!-- This is a POST-account step, so the account already exists; a
           user who abandons here is still signed up. Keep fields optional
           unless your core product flow truly requires them, and let the
           user "Skip for now". -->
      <div class="name-fields">
        <input type="text"
               name="firstName"
               placeholder="First name"
               autocomplete="given-name">

        <input type="text"
               name="lastName"
               placeholder="Last name"
               autocomplete="family-name">
      </div>

      <input type="text"
             name="company"
             placeholder="Company"
             autocomplete="organization">

      <select name="role" autocomplete="organization-title">
        <option value="">Your Role</option>
        <option value="founder">Founder/CEO</option>
        <option value="marketing">Marketing</option>
        <option value="sales">Sales</option>
        <option value="product">Product</option>
        <option value="other">Other</option>
      </select>
      
      <div class="step-navigation">
        <button type="button" class="btn-back" onclick="previousStep(1)">
          ← Back
        </button>
        <button type="button" class="btn-skip" onclick="nextStep(3)">
          Skip for now
        </button>
        <button type="button" class="btn-next" onclick="nextStep(3)">
          Continue →
        </button>
      </div>
    </form>
  </div>
  
  <!-- Step 3: Preferences & Goals -->
  <div class="step-content" data-step="3">
    <div class="step-header">
      <h2>What's Your Main Goal?</h2>
      <p>We'll customize your dashboard based on your needs</p>
    </div>
    
    <form class="step-form">
      <div class="goal-options">
        <label class="option-card">
          <input type="radio" name="goal" value="increase-conversions">
          <div class="card-content">
            <div class="card-icon">📈</div>
            <h4>Increase Conversions</h4>
            <p>Optimize landing pages and forms</p>
          </div>
        </label>
        
        <label class="option-card">
          <input type="radio" name="goal" value="reduce-churn">
          <div class="card-content">
            <div class="card-icon">🔒</div>
            <h4>Reduce Churn</h4>
            <p>Improve user retention and engagement</p>
          </div>
        </label>
        
        <label class="option-card">
          <input type="radio" name="goal" value="grow-revenue">
          <div class="card-content">
            <div class="card-icon">💰</div>
            <h4>Grow Revenue</h4>
            <p>Optimize pricing and upsells</p>
          </div>
        </label>
      </div>
      
      <div class="step-navigation">
        <button type="button" class="btn-back" onclick="previousStep(2)">
          ← Back
        </button>
        <button type="submit" class="btn-complete">
          Complete Setup →
        </button>
      </div>
    </form>
  </div>
</div>
```

### Decision Matrix: Single vs Multi-Step

This is a **starting heuristic, not a verdict** — it produces a hypothesis
you then validate with a real A/B test (see the experiment workflow below).
The weights are illustrative defaults; tune them to your data.

```javascript
// Signup Flow Decision Heuristic — fully self-contained.
// Returns a recommendation + the explicit reasoning trail so the output
// is auditable. Treat the result as the variant to test, not ground truth.
function determineOptimalFlow(userContext) {
  const factors = {
    requiredFieldCount: userContext.requiredFields?.length ?? 0,
    audience: userContext.audience,          // 'B2B' | 'B2C'
    primaryDevice: userContext.device,       // 'mobile' | 'desktop'
    productValue: userContext.productValue,  // 'high' | 'low'
  };

  // Each rule contributes a signed weight. Positive => multi-step.
  const rules = [
    {
      when: factors.requiredFieldCount <= 4,
      weight: -2,
      because: 'Few required fields fit comfortably in one step',
    },
    {
      when: factors.requiredFieldCount >= 8,
      weight: +3,
      because: 'Many required fields are less daunting when chunked',
    },
    {
      when: factors.audience === 'B2B',
      weight: +2,
      because: 'B2B buyers tolerate qualification steps',
    },
    {
      when: factors.audience === 'B2C',
      weight: -1,
      because: 'B2C buyers expect instant, frictionless signup',
    },
    {
      when: factors.primaryDevice === 'mobile',
      weight: -2,
      because: 'Mobile favors a single short step over navigation',
    },
    {
      when: factors.productValue === 'high',
      weight: +1,
      because: 'High perceived value sustains more steps',
    },
  ];

  const applied = rules.filter((r) => r.when);
  const score = applied.reduce((sum, r) => sum + r.weight, 0);

  return {
    recommendation: score > 2 ? 'multi-step' : 'single-step',
    confidence: Math.abs(score) >= 3 ? 'high' : 'moderate',
    score,
    reasoning: applied.map((r) => `${r.weight > 0 ? '+' : ''}${r.weight}: ${r.because}`),
    nextStep: 'A/B test the recommended flow against the alternative before committing.',
  };
}

// Example:
// determineOptimalFlow({ requiredFields: ['email','password'], audience: 'B2C', device: 'mobile', productValue: 'low' })
//  -> { recommendation: 'single-step', confidence: 'high', score: -5, reasoning: [...] }
```

## 🔐 Social Login Impact Analysis

### Do NOT ship a universal "social login = +X%" number

There is **no credible, universal uplift figure** for social login, and any
specific percentage you see quoted ("+35% with Google") is almost always
unsourced vendor marketing. Real effects depend entirely on your audience,
the provider mix, the alternative you're comparing against, and whether the
social account email matches an existing account. Treat each of the claims
below as a **hypothesis to validate on your own funnel**, not a benchmark:

| Provider | Where it tends to help | Where it can hurt | What to actually measure |
|----------|------------------------|-------------------|--------------------------|
| Google | Broad consumer + Workspace SMB; near-universal account coverage | Privacy-averse segments; users with multiple Google accounts | Net signup completion **and** downstream activation/retention by method |
| Microsoft (Entra ID) | Enterprise/IT buyers, Office-centric orgs | Pure consumer audiences (low coverage) | Same, segmented by work vs personal email |
| Apple | iOS-heavy consumer apps; privacy-conscious users | Often returns a private relay email + no name on first consent | Bounce-back rate when you lack name/real email |
| LinkedIn | B2B where role/company is the value | Friction if you only need an email | Lead quality, not just completion |
| Facebook | Some legacy consumer apps | Declining trust; review provider deprecations before adding | Whether it still moves the needle vs Google alone |

How to source a real number: run the experiment in the **CRO experiment
workflow** later in this skill, segment by audience and device, and report
the uplift with a confidence interval. If you must cite external research,
date it and link it (e.g., "Baymard Institute checkout/auth studies, as of
2026 — verify at https://baymard.com/research"); never present a borrowed
average as your expected result.

> **Caveat — vanity vs value:** social login can raise top-of-funnel
> completion while *lowering* downstream quality (throwaway accounts, missing
> data, mismatched emails). Always pair the signup-completion metric with an
> activation or retention guardrail before declaring a win.

```javascript
// Social Login Analytics — self-contained and runnable.
// Use ONE shared instance (see initiateSocialLogin below); a fresh instance
// per click would reset the metrics. Timing is tracked per provider so
// overlapping attempts don't clobber a single shared start time.
class SocialLoginAnalytics {
  constructor() {
    this.providers = ['google', 'microsoft', 'apple', 'linkedin'];
    this.metrics = {
      attempts: {},
      successes: {},
      errors: {},
      conversions: {},
      timeToComplete: {},
    };
    this._startTimes = {}; // provider -> epoch ms
  }

  trackSocialAttempt(provider) {
    this.metrics.attempts[provider] = (this.metrics.attempts[provider] || 0) + 1;
    this._startTimes[provider] = Date.now();
    this._emit('social_signup_attempt', { provider });
  }

  trackSocialSuccess(provider, userData) {
    this.metrics.successes[provider] = (this.metrics.successes[provider] || 0) + 1;
    const startedAt = this._startTimes[provider] ?? Date.now();
    const completionTime = Date.now() - startedAt;
    this.metrics.timeToComplete[provider] = completionTime;
    this._emit('social_signup_success', {
      provider,
      completion_time_ms: completionTime,
      user_type: this.classifyUser(userData),
    });
  }

  trackSocialError(provider, error) {
    this.metrics.errors[provider] = (this.metrics.errors[provider] || 0) + 1;
    this._emit('social_signup_error', {
      provider,
      // Never log full error objects / tokens to analytics.
      reason: (error && error.code) || 'unknown',
    });
  }

  trackSocialConversion(provider, value) {
    this.metrics.conversions[provider] = (this.metrics.conversions[provider] || 0) + value;
    this._emit('social_signup_conversion', { provider, value, currency: 'USD' });
  }

  // Classify without storing PII: derive a coarse segment from the email
  // domain only. Free-mail => 'consumer', anything else => 'business'.
  classifyUser(userData = {}) {
    const email = (userData.email || '').toLowerCase();
    const domain = email.split('@')[1] || '';
    const freeMail = new Set([
      'gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com',
      'icloud.com', 'proton.me', 'privaterelay.appleid.com',
    ]);
    if (!domain) return 'unknown';
    return freeMail.has(domain) ? 'consumer' : 'business';
  }

  calculateConversionRate(provider) {
    const attempts = this.metrics.attempts[provider] || 0;
    const successes = this.metrics.successes[provider] || 0;
    return attempts > 0 ? Number(((successes / attempts) * 100).toFixed(2)) : 0;
  }

  generateReport() {
    return this.providers.map((provider) => ({
      provider,
      attempts: this.metrics.attempts[provider] || 0,
      successes: this.metrics.successes[provider] || 0,
      errors: this.metrics.errors[provider] || 0,
      conversions: this.metrics.conversions[provider] || 0,
      conversionRate: this.calculateConversionRate(provider),
      avgCompletionTimeMs: this.metrics.timeToComplete[provider] ?? null,
    }));
  }

  // Thin wrapper so this file runs even if no analytics lib is present.
  _emit(event, params) {
    if (typeof gtag === 'function') gtag('event', event, params);
    else console.debug('[analytics]', event, params);
  }
}

// IMPORTANT: instantiate once and reuse, e.g.
const socialAnalytics = new SocialLoginAnalytics();
```

### Social Login Implementation Best Practices

**Platform policy you must not skip:**

- **"Sign in with Apple" is mandatory on Apple platforms** if your iOS/iPadOS/
  watchOS/tvOS app offers *any* third-party or social sign-in (Google,
  Facebook, etc.) as a primary login. Omitting it is a common App Store
  rejection. Carve-outs exist (e.g. apps using only your own account system,
  certain education/enterprise SSO, B2B apps managed by an org). Confirm the
  current rule in Apple's Human Interface / App Review guidelines before
  shipping — verify at https://developer.apple.com/sign-in-with-apple/ (as of
  Jun 2026).
- **Apple often returns a private relay email and may omit the user's name
  after the first consent.** Capture the name/email Apple gives you *on the
  very first authorization* (you won't get the name again), store the stable
  `sub` as the user key, and never require a "real" email downstream.
- **OAuth/OIDC hygiene:** use Authorization Code + PKCE (not the implicit
  flow), validate `state` to stop CSRF, validate the ID-token `nonce`, and
  request the *minimum* scopes (usually just `openid email profile`). Asking
  for contacts/calendar at signup tanks consent rates.

```html
<!-- Optimized Social Login Component -->
<div class="social-login-section" data-signup-method="social">
  <!-- Primary recommendation -->
  <button class="btn-social primary google" 
          onclick="initiateSocialLogin('google')"
          data-provider="google">
    <div class="btn-content">
      <img src="/icons/google.svg" alt="Google" class="provider-icon">
      <span class="btn-text">Continue with Google</span>
      <span class="speed-indicator">30s</span>
    </div>
  </button>
  
  <!-- Secondary options -->
  <div class="social-options-secondary">
    <button class="btn-social microsoft" 
            onclick="initiateSocialLogin('microsoft')"
            data-provider="microsoft">
      <img src="/icons/microsoft.svg" alt="Microsoft">
      <span>Microsoft</span>
    </button>
    
    <button class="btn-social linkedin" 
            onclick="initiateSocialLogin('linkedin')"
            data-provider="linkedin">
      <img src="/icons/linkedin.svg" alt="LinkedIn">
      <span>LinkedIn</span>
    </button>
    
    <button class="btn-social apple" 
            onclick="initiateSocialLogin('apple')"
            data-provider="apple">
      <img src="/icons/apple.svg" alt="Apple">
      <span>Apple</span>
    </button>
  </div>
  
  <!-- Privacy assurance -->
  <p class="social-privacy">
    🔒 We'll never post to your social accounts
  </p>
</div>
```

```javascript
// Social Login Handler.
// NOTE: signInWith*() are your provider SDK adapters (Google Identity
// Services, MSAL, Sign in with Apple JS, etc.) and renderProfileCompletion()
// is your UI — both are app-specific and intentionally not implemented here.
// Each adapter must do the real OAuth Authorization Code + PKCE exchange on
// your SERVER and return a verified user; never trust client-side tokens.
// Reuses the shared `socialAnalytics` instance defined above.
async function initiateSocialLogin(provider) {
  socialAnalytics.trackSocialAttempt(provider);

  const adapters = {
    google: signInWithGoogle,
    microsoft: signInWithMicrosoft,
    linkedin: signInWithLinkedIn,
    apple: signInWithApple,
  };
  const adapter = adapters[provider];
  if (!adapter) throw new Error(`Unsupported provider: ${provider}`);

  try {
    const result = await adapter(); // resolves only after server verifies
    if (result?.success) {
      socialAnalytics.trackSocialSuccess(provider, result.user);
      await completeProfileWithSocialData(result.user, provider);
    } else {
      socialAnalytics.trackSocialError(provider, { code: 'not_completed' });
    }
  } catch (error) {
    // User-cancelled vs real failure: don't show a scary error for cancels.
    socialAnalytics.trackSocialError(provider, error);
    if (error?.code !== 'user_cancelled') showFallbackForm(); // your email/password form
  }
}

// Pre-fill the post-signup completion step with whatever the provider gave
// us. Treat EVERY field as optional — Apple may omit name and return a relay
// email; LinkedIn may not return an org. Only `sub`/`verified` are reliable.
async function completeProfileWithSocialData(user, provider) {
  const prefill = {
    email: user.email ?? '',          // may be an Apple private-relay address
    firstName: user.given_name ?? '',
    lastName: user.family_name ?? '',
    company: user.organization ?? '', // LinkedIn-ish, often absent
    emailVerified: user.email_verified === true,
    providerSub: user.sub,            // stable account key — store this
  };
  renderProfileCompletion(prefill, provider); // your UI
}
```

### Social Login A/B Testing Framework

```javascript
// Social Login A/B Tests
const socialLoginTests = {
  buttonOrder: [
    ['google', 'microsoft', 'linkedin'], // Test A: Google first
    ['microsoft', 'google', 'linkedin'], // Test B: Microsoft first
    ['linkedin', 'google', 'microsoft']  // Test C: LinkedIn first (B2B)
  ],
  
  buttonStyle: [
    'individual-buttons', // Each provider separate
    'dropdown-selector',  // Single dropdown
    'modal-overlay'       // Pop-up selection
  ],
  
  messaging: [
    'Continue with [Provider]',     // Standard
    'Sign up in seconds with [Provider]', // Speed focus
    'Skip the form - use [Provider]',      // Convenience focus
    'Join with your [Provider] account'    // Community focus
  ]
};

// Assignment is intentionally NOT done with Math.random() here — use the
// stable, server-aware bucketing helper from the CRO experiment workflow
// below (`assignVariant`), which is deterministic per user and survives
// reloads/devices. Test ONE dimension at a time unless you have the traffic
// for a factorial design; reusing one index across three dimensions (the old
// version) confounds the results.
function renderSocialLoginVariant(userId) {
  const orderVariant = assignVariant('social_button_order', userId, [
    { name: 'google_first', value: ['google', 'microsoft', 'linkedin'], weight: 1 },
    { name: 'linkedin_first', value: ['linkedin', 'google', 'microsoft'], weight: 1 },
  ]);

  renderSocialLoginSection({ buttonOrder: orderVariant.value });

  // Fire the SAME exposure event your analysis queries; include the user/
  // anonymous id so server and client agree on the bucket (prevents SRM).
  if (typeof gtag === 'function') {
    gtag('event', 'experiment_exposure', {
      experiment: 'social_button_order',
      variant: orderVariant.name,
      anon_id: userId,
    });
  }
}
```

## 🔑 Passkeys & WebAuthn (the 2026 default, not an afterthought)

By mid-2026 passkeys (FIDO2/WebAuthn discoverable credentials, synced via
iCloud Keychain, Google Password Manager, Windows Hello, and third-party
managers like 1Password/Bitwarden) are the **lowest-friction, phishing-
resistant** way to both create and re-enter an account. For CRO they matter
because the happy path is "Face ID / fingerprint → done": no password to
invent, no email round-trip, no SMS. Offer them — but always with a fallback,
because passkey support and user familiarity are still uneven.

### When passkeys help vs hurt conversion

| Helps | Hurts / needs care |
|-------|--------------------|
| Returning sign-in (autofill makes it one tap) | First-time creation on an unfamiliar device — explain it briefly |
| Mobile, biometric-equipped devices | Shared/kiosk machines (passkey gets saved to the wrong vault) |
| Security-sensitive products (kills phishing + credential stuffing) | Users who don't recognize the OS prompt and cancel — measure cancel rate |
| Reducing password-reset support load | Account recovery if the user loses every synced device — you MUST provide a recovery path |

### Conditional UI (autofill) — the highest-converting pattern

Conditional UI surfaces existing passkeys inside the normal email field's
autofill dropdown, so returning users sign in without choosing a "passkey"
button at all. Gate it on a capability check so unsupported browsers fall
back cleanly.

```javascript
// Feature-detect, then offer passkey autofill on the sign-in form.
async function maybeStartPasskeyAutofill(emailInput) {
  const supported =
    window.PublicKeyCredential &&
    PublicKeyCredential.isConditionalMediationAvailable &&
    (await PublicKeyCredential.isConditionalMediationAvailable());

  if (!supported) return; // graceful fallback: plain email + password/social

  // 1) Mark the field so the browser knows to offer passkeys via autofill.
  emailInput.setAttribute('autocomplete', 'username webauthn');

  // 2) Ask your server for a fresh authentication challenge (per-request,
  //    single-use, short-lived; stored server-side bound to the session).
  const options = await fetch('/api/webauthn/authenticate/options', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }).then((r) => r.json());

  try {
    const assertion = await navigator.credentials.get({
      mediation: 'conditional', // <- the magic: shows in autofill, no modal
      publicKey: {
        challenge: base64urlToBuffer(options.challenge),
        rpId: options.rpId,                 // your registrable domain
        userVerification: 'preferred',
        allowCredentials: [],               // empty => discoverable credentials
      },
    });
    // 3) Verify the assertion on the SERVER (signature, challenge, origin,
    //    rpIdHash, and the credential's signCount). Never trust the client.
    await fetch('/api/webauthn/authenticate/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(serializeAssertion(assertion)),
    });
    window.location.href = '/welcome';
  } catch (err) {
    if (err?.name !== 'AbortError') console.debug('passkey autofill skipped', err);
    // Do nothing on cancel — the email/password path is still right there.
  }
}
```

### Creating a passkey at signup (registration ceremony)

```javascript
// Call after the account exists (or alongside email capture). The challenge,
// user.id, rp.id and verification all live on YOUR server.
async function createPasskey() {
  if (!window.PublicKeyCredential) return offerPasswordInstead();

  const opts = await fetch('/api/webauthn/register/options', { method: 'POST' })
    .then((r) => r.json());

  try {
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: base64urlToBuffer(opts.challenge),
        rp: { id: opts.rpId, name: opts.rpName },
        user: {
          id: base64urlToBuffer(opts.userIdB64), // opaque, NOT the email
          name: opts.email,                       // shown in the OS UI
          displayName: opts.displayName || opts.email,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },   // ES256
          { type: 'public-key', alg: -257 }, // RS256 (broader compatibility)
        ],
        authenticatorSelection: {
          residentKey: 'required',          // discoverable => usernameless
          userVerification: 'preferred',
        },
        // excludeCredentials: list the user's existing creds (from server)
        //   to prevent duplicate registrations on the same authenticator.
        timeout: 60000,
      },
    });
    await fetch('/api/webauthn/register/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(serializeAttestation(cred)),
    });
  } catch (err) {
    // Most failures here are user cancellations — fall back, don't block.
    offerPasswordInstead();
  }
}
```

> Implementation note: use a maintained server library
> (`@simplewebauthn/server` + `@simplewebauthn/browser`, or your IdP's
> SDK such as Auth0/Clerk/WorkOS/Stytch) rather than hand-rolling CBOR/COSE
> parsing. The `base64urlToBuffer`/`serialize*` helpers above are provided by
> those browser libraries.

### Account recovery & device loss — non-negotiable

Passkeys sync within an OS ecosystem, but a user can still lose access (left
the ecosystem, no synced devices, corporate device wiped). Always provide a
recovery path or you will manufacture lockouts that look like churn:

- Let users register **multiple** passkeys (phone + laptop + security key).
- Keep at least one **independent** recovery factor: a verified email magic
  link, recovery codes shown once at setup, or social login as a fallback.
- Offer **cross-device sign-in** (the QR + Bluetooth "hybrid" flow) so a user
  on a new desktop can authenticate with their phone's passkey.
- For enterprise, allow an admin-mediated reset rather than self-service only.

### Passkey metrics to track

- Passkey **offer rate** (eligible sessions where you showed it) and
  **acceptance rate**.
- **Creation success vs cancel** at signup (high cancel ⇒ unclear prompt).
- **Conditional-UI sign-in success** vs password sign-in success.
- Share of returning logins via passkey (target: rising over time).
- Recovery-path usage and support tickets for lockouts.

## 📊 Progressive Profiling Strategy

> **Privacy/consent guardrail (read before collecting anything below).**
> Every field beyond what's strictly needed to provide the service is
> "additional" personal data. Under GDPR/UK-GDPR you need a **lawful basis**
> (usually legitimate interest or consent) and must honor **data
> minimization** and **purpose limitation**; under CPRA/US state laws you owe
> notice-at-collection and opt-out of "sharing/sale" for ad-tech use. Practical
> rules: (1) don't pre-check marketing consent — it must be a separate,
> unticked opt-in; (2) state *why* you're asking each item ("so we can
> recommend templates for your role"); (3) record consent + timestamp + the
> shown copy; (4) let users skip and edit later; (5) set a retention policy and
> delete what you stop using. This is general guidance, **not legal advice** —
> confirm your specifics with counsel/DPO.

### Data Collection Hierarchy

**Tier 1 - Essential (Step 1)**
- Email address (required for account)
- Password (security)
- First name (personalization)

**Tier 2 - Valuable (Step 2 or Post-signup)**
- Last name (full personalization)
- Company name (segmentation)
- Job title/role (targeting)

**Tier 3 - Enhancement (Onboarding/Usage)**
- Company size (market segmentation)
- Use case/goals (product customization)
- Industry (content personalization)
- Phone number (sales qualification)

```javascript
// Progressive Profiling Engine — self-contained and runnable. Every method it
// calls is defined here. The two integration seams are clearly marked:
//   - fetchEngagementSignals(): swap in your real analytics read.
//   - renderProgressiveForm(): swap in your real UI (the modal HTML below).
// Defaults are deliberately conservative so you only prompt engaged users.
class ProgressiveProfiler {
  constructor({ fetchEngagementSignals, renderProgressiveForm } = {}) {
    this.userProfile = {};
    this.collectorsQueue = [];
    this.completionTriggers = [
      'email_verified',
      'first_login',
      'feature_accessed',
      'time_threshold',
      'engagement_level',
    ];
    // Integration seams (optional). Provide your own; otherwise safe stubs run.
    this._fetchEngagementSignals = fetchEngagementSignals ||
      (async () => ({ engagementScore: 0, historicalCompletionRate: 0 }));
    this._renderProgressiveForm = renderProgressiveForm ||
      ((config) => console.debug('[progressive-profiler] render', config));
  }

  // Higher priority => prompt sooner. Delay is in milliseconds.
  calculateOptimalDelay(priority) {
    return { critical: 0, high: 5000, medium: 30000, low: 120000 }[priority] ?? 30000;
  }

  scheduleDataCollection(triggerEvent, dataPoints, priority = 'medium') {
    this.collectorsQueue.push({
      trigger: triggerEvent,
      dataPoints,
      priority,
      attempts: 0,
      maxAttempts: 3,
      delay: this.calculateOptimalDelay(priority),
    });
  }

  async onTriggerEvent(eventType, context) {
    const activeCollectors = this.collectorsQueue.filter(
      (c) => c.trigger === eventType && c.attempts < c.maxAttempts
    );

    for (const collector of activeCollectors) {
      const shouldCollect = await this.evaluateCollectionTiming(collector, context);
      if (shouldCollect) {
        this.presentDataCollectionForm(collector.dataPoints, collector.priority);
        collector.attempts++;
      }
    }
  }

  // Pull engagement + historical completion from YOUR analytics. The default
  // stub returns zeros so nothing is prompted until you wire this up.
  async calculateEngagementScore(userId) {
    const { engagementScore = 0 } = await this._fetchEngagementSignals(userId);
    return engagementScore; // expected 0..1
  }

  async getHistoricalCompletionRate(dataPoints) {
    const { historicalCompletionRate = 0 } =
      await this._fetchEngagementSignals(null, dataPoints);
    return historicalCompletionRate; // expected 0..1
  }

  async evaluateCollectionTiming(collector, context) {
    const engagementScore = await this.calculateEngagementScore(context.userId);
    const completionRate = await this.getHistoricalCompletionRate(collector.dataPoints);

    const sessionQuality = {
      timeOnSite: context.sessionDuration ?? 0,
      pageViews: context.pageViews ?? 0,
      interactions: context.interactions ?? 0,
    };

    // critical prompts bypass the engagement gate; everything else must clear it.
    if (collector.priority === 'critical') return true;
    return (
      engagementScore > 0.6 &&
      completionRate > 0.4 &&
      sessionQuality.timeOnSite > 300000 && // 5 minutes in ms
      sessionQuality.interactions > 3
    );
  }

  // Human-readable title derived from the fields requested (no PII).
  generateContextualTitle(dataPoints) {
    const labels = { company: 'company', role: 'role', companySize: 'team size',
      industry: 'industry', useCase: 'goals', phone: 'contact details' };
    const named = dataPoints.map((d) => labels[d] || d);
    return named.length
      ? `Tell us about your ${named.slice(0, 2).join(' and ')}`
      : 'Personalize your experience';
  }

  // Incentive copy scaled to how much you're asking; never a fake discount.
  selectIncentive(priority) {
    return {
      critical: 'Required to keep your account secure',
      high: 'Unlock personalized recommendations',
      medium: "We'll tailor your dashboard to your role",
      low: 'Optional — helps us improve your experience',
    }[priority] ?? 'Optional — you can skip this';
  }

  presentDataCollectionForm(dataPoints, priority) {
    const formConfig = {
      title: this.generateContextualTitle(dataPoints),
      fields: dataPoints,
      incentive: this.selectIncentive(priority),
      dismissible: priority !== 'critical', // never trap the user (see consent note)
      timing: priority === 'high' ? 'immediate' : 'delayed',
    };
    this.renderProgressiveForm(formConfig);
  }

  // Delegates to your UI (e.g. render the progressive modal template below).
  renderProgressiveForm(formConfig) {
    return this._renderProgressiveForm(formConfig);
  }
}

// Usage: inject your analytics + UI, then schedule collectors.
// const profiler = new ProgressiveProfiler({
//   fetchEngagementSignals: async (userId, dataPoints) => ({
//     engagementScore: await myAnalytics.engagement(userId),       // 0..1
//     historicalCompletionRate: await myAnalytics.completion(dataPoints), // 0..1
//   }),
//   renderProgressiveForm: (config) => mountModal(config),
// });
// profiler.scheduleDataCollection('feature_accessed', ['company', 'role'], 'high');
// await profiler.onTriggerEvent('feature_accessed', {
//   userId, sessionDuration: 360000, pageViews: 5, interactions: 6,
// });
```

### Progressive Form Templates

```html
<!-- Progressive Data Collection Modal -->
<div class="progressive-modal" data-priority="medium">
  <div class="modal-content">
    <div class="modal-header">
      <h3>Personalize Your Experience</h3>
      <p>Help us show you the most relevant content</p>
      <button class="modal-close" onclick="dismissProgressive('later')">×</button>
    </div>
    
    <form class="progressive-form">
      <!-- Dynamic field insertion based on data tier -->
      <div class="field-group" data-tier="2">
        <label for="company">Company Name</label>
        <input type="text" 
               id="company" 
               name="company"
               placeholder="Where do you work?"
               autocomplete="organization">
      </div>
      
      <div class="field-group" data-tier="2">
        <label for="role">Your Role</label>
        <select id="role" name="role" autocomplete="organization-title">
          <option value="">Select your role</option>
          <option value="founder">Founder/CEO</option>
          <option value="marketing">Marketing Manager</option>
          <option value="sales">Sales Manager</option>
          <option value="developer">Developer</option>
          <option value="other">Other</option>
        </select>
      </div>
      
      <div class="field-group" data-tier="3">
        <label for="company-size">Company Size</label>
        <div class="radio-group">
          <label><input type="radio" name="companySize" value="1-10"> 1-10 employees</label>
          <label><input type="radio" name="companySize" value="11-50"> 11-50 employees</label>
          <label><input type="radio" name="companySize" value="51-200"> 51-200 employees</label>
          <label><input type="radio" name="companySize" value="201+"> 201+ employees</label>
        </div>
      </div>
      
      <!-- Incentive messaging -->
      <div class="incentive-box">
        <div class="incentive-icon">🎯</div>
        <div class="incentive-text">
          <strong>Get personalized recommendations</strong>
          <span>We'll customize your dashboard based on your role</span>
        </div>
      </div>
      
      <div class="form-actions">
        <button type="submit" class="btn-primary">
          Personalize My Experience
        </button>
        <button type="button" class="btn-secondary" onclick="dismissProgressive('skip')">
          Skip for Now
        </button>
      </div>
    </form>
  </div>
</div>
```

## ✅ Friction Audit Checklist

### Form Field Analysis

**Field Optimization Checklist**
- [ ] **Account-creation fields minimized** (ideally just email + password; defer the rest to progressive profiling)
- [ ] **Name NOT required at account creation** unless the product genuinely needs it now
- [ ] **Optional fields clearly marked** (or removed)
- [ ] **No "confirm password" field** — use a show/hide toggle instead
- [ ] **Password is length-first** (≥12, no composition rules, no `maxlength`<64, paste allowed)
- [ ] **Breached-password screening server-side** (k-anonymity), not arbitrary complexity rules
- [ ] **Passkey/social offered with email+password fallback** ("Sign in with Apple" present on Apple platforms if any social login is offered)
- [ ] **Autocomplete attributes** correct (`email`, `new-password`, `one-time-code`)
- [ ] **Input types/`inputmode` optimized** (`email`, `tel`, `url`, numeric OTP)
- [ ] **Real `<label>` per field** (placeholders are not labels) + `aria-live` errors
- [ ] **Field validation immediate** on blur, constructive messages (not just "invalid")
- [ ] **Marketing consent is a separate, unticked opt-in** (not bundled with Terms)
- [ ] **Tab order logical**; touch targets ≥44–48px; inputs ≥16px font on mobile
- [ ] **Field grouping logical** (related fields together)

```html
<!-- Friction-Optimized Signup Form -->
<form class="low-friction-signup" novalidate>
  <!-- Essential fields only -->
  <div class="field-group essential">
    <label for="email" class="sr-only">Email Address</label>
    <input type="email" 
           id="email" 
           name="email"
           placeholder="your@email.com"
           autocomplete="email"
           required
           aria-describedby="email-help">
    <div id="email-help" class="field-help">
      We'll send your login link here
    </div>
    <div class="field-validation" id="email-validation"></div>
  </div>
  
  <!-- Password: length-first, paste allowed, show/hide toggle, no
       composition rules, no maxlength. -->
  <div class="field-group password-group">
    <label for="password">Password</label>
    <div class="password-field">
      <input type="password"
             id="password"
             name="password"
             placeholder="At least 12 characters"
             autocomplete="new-password"
             minlength="12"
             required
             aria-describedby="password-help">
      <button type="button" class="toggle-password"
              aria-label="Show password" aria-pressed="false">Show</button>
    </div>

    <!-- Strength meter measures real strength (length + uniqueness), not
         whether arbitrary character classes are present. -->
    <div class="password-strength" aria-live="polite">
      <div class="strength-meter">
        <div class="strength-fill" data-strength="0"></div>
      </div>
      <span class="strength-text">Password strength</span>
    </div>

    <div id="password-help" class="field-help">
      Use 12 or more characters. A passphrase of a few random words is great.
      You can paste from your password manager.
    </div>
  </div>
  
  <!-- Progressive enhancement: Only show if user engages -->
  <div class="field-group optional hidden" data-progressive="true">
    <label for="firstName">First Name (Optional)</label>
    <input type="text" 
           id="firstName" 
           name="firstName"
           placeholder="What should we call you?"
           autocomplete="given-name">
  </div>
  
  <!-- Simplified terms agreement -->
  <div class="terms-group">
    <label class="checkbox-label">
      <input type="checkbox" required aria-describedby="terms-help">
      <span class="checkbox-custom"></span>
      <span class="checkbox-text">
        I agree to the <a href="/terms" target="_blank">Terms</a> and <a href="/privacy" target="_blank">Privacy Policy</a>
      </span>
    </label>
    <div id="terms-help" class="field-help">
      Required to create your account
    </div>
  </div>
  
  <button type="submit" class="btn-signup" data-loading="false">
    <span class="btn-text">Create Account</span>
    <span class="btn-loading">Creating Account...</span>
  </button>
</form>
```

### Password UX Best Practices (modern, NIST SP 800-63B-aligned)

Modern guidance (NIST SP 800-63B; verify current rev at
https://pages.nist.gov/800-63-4/) inverts the old "make it complex" advice.
Composition rules (force an uppercase + a digit + a symbol) push users toward
predictable patterns like `Password1!` and *reduce* real security while
hurting completion. Do this instead:

- **Length first.** Require **≥ 12** characters (8 is a hard floor); allow
  long passphrases (support **≥ 64**). Set `minlength`, never `maxlength`
  below 64, and never a `pattern` that mandates character classes.
- **Allow everything.** Accept all Unicode and spaces; **allow paste** so
  password managers work. Never block paste.
- **Screen against breached/common passwords** instead of imposing
  composition rules — this is the single highest-value check.
- **No forced rotation** and **no security questions.** Only force a reset on
  evidence of compromise.
- **Show, don't confirm.** Offer a show/hide toggle; drop the
  "confirm password" field.
- **Offer passkeys/social as alternatives** (see sections above) so many
  users never create a password at all.

Breach screening must run **server-side**. The client should never download a
breach list or decide acceptance. Use the k-anonymity range API (send only
the first 5 chars of the SHA-1 hash; the service returns suffixes, you match
locally) so the full password/hash never leaves your server:

```javascript
// SERVER-side (Node 18+, global fetch + Web Crypto). Returns how many times
// the password appears in known breaches. 0 = not found. Uses the HIBP
// "range" API via k-anonymity: only a 5-char hash prefix is sent.
import { webcrypto as crypto } from 'node:crypto';

async function breachCount(password) {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-1', data);
  const sha1 = [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();

  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  // Add-Padding header obscures the count of returned hashes from the network.
  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: { 'Add-Padding': 'true' },
  });
  if (!res.ok) return 0; // fail OPEN on availability, but log + monitor it
  const body = await res.text();

  for (const line of body.split('\n')) {
    const [hashSuffix, count] = line.trim().split(':');
    if (hashSuffix === suffix) return parseInt(count, 10) || 0;
  }
  return 0;
}

// Usage in your /api/signup handler:
//   if (await breachCount(password) > 0) {
//     return reject('This password has appeared in a data breach. Pick another.');
//   }
```

The client-side helper below is purely for *encouragement* (a strength meter +
inline hints). It is fully self-contained — every method it calls is defined
here — and it never gates submission on composition. The authoritative checks
(length floor + breach screen) live on the server.

```javascript
// Password UX helper — encouragement only, NOT the source of truth.
class PasswordUX {
  constructor(passwordInput) {
    this.input = passwordInput;
    const group = passwordInput.closest('.field-group') || document;
    this.strengthMeter = group.querySelector('.strength-meter .strength-fill');
    this.strengthText = group.querySelector('.strength-text');
    this.requirementsEl = group.querySelector('#password-help');
    this.validationEl = group.querySelector('#password-validation');
    this.toggleBtn = group.querySelector('.toggle-password');
    this.init();
  }

  init() {
    this.input.addEventListener('input', (e) => {
      const pw = e.target.value;
      this.updateStrengthIndicator(this.scorePassword(pw));
      this.validateInRealTime(pw);
    });
    this.input.addEventListener('focus', () => this.showPasswordRequirements());
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => this.toggleVisibility());
    }
  }

  // Length-driven score. Each character beyond the 12 floor adds entropy;
  // a tiny bonus for variety, but variety is NOT required. No upper cap on
  // length. Returns 0-100.
  scorePassword(pw) {
    if (!pw) return { score: 0, level: 'weak' };
    let score = Math.min(70, Math.max(0, (pw.length - 4) * 6)); // length is king
    const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/]
      .filter((re) => re.test(pw)).length;
    score += (classes - 1) * 5;                  // small variety nudge, optional
    if (/^(.)\1+$/.test(pw)) score = 10;         // all same char
    if (this.isObviouslyCommon(pw)) score = 10;  // tiny local denylist only
    score = Math.max(0, Math.min(100, score));
    return { score, level: this.getStrengthLevel(score) };
  }

  getStrengthLevel(score) {
    if (score < 40) return 'weak';
    if (score < 60) return 'fair';
    if (score < 80) return 'good';
    return 'strong';
  }

  updateStrengthIndicator(strength) {
    if (!this.strengthMeter) return;
    const colors = { weak: '#ff4757', fair: '#ffa502', good: '#26de81', strong: '#2ed573' };
    this.strengthMeter.style.width = `${strength.score}%`;
    this.strengthMeter.style.backgroundColor = colors[strength.level];
    if (this.strengthText) {
      const label = strength.level[0].toUpperCase() + strength.level.slice(1);
      this.strengthText.textContent = `${label} password`;
    }
  }

  validateInRealTime(pw) {
    if (!this.validationEl) return;
    if (pw.length === 0) { this.validationEl.innerHTML = ''; return; }
    if (pw.length < 12) {
      this.showValidationMessage('A bit longer — aim for 12+ characters', 'warning');
    } else {
      // Final breach/uniqueness verdict happens on the server at submit;
      // here we just reassure once the length floor is met.
      this.showValidationMessage('Looks good — we’ll check it against known breaches', 'success');
    }
  }

  showValidationMessage(message, type) {
    if (!this.validationEl) return;
    this.validationEl.className = `field-validation ${type}`;
    this.validationEl.textContent = message;
  }

  showPasswordRequirements() {
    if (this.requirementsEl) {
      this.requirementsEl.textContent =
        'Use 12+ characters. A few random words make a strong, memorable password. Paste from a manager is fine.';
    }
  }

  // Tiny local denylist for instant feedback ONLY; the real breach screen is
  // the server-side k-anonymity check above. Do not rely on this list.
  isObviouslyCommon(pw) {
    const common = new Set([
      'password', 'password1', 'password123', '123456', '12345678',
      'qwerty', 'letmein', 'welcome', 'iloveyou', 'admin',
    ]);
    return common.has(pw.toLowerCase());
  }

  toggleVisibility() {
    const showing = this.input.type === 'text';
    this.input.type = showing ? 'password' : 'text';
    this.toggleBtn.textContent = showing ? 'Show' : 'Hide';
    this.toggleBtn.setAttribute('aria-pressed', String(!showing));
    this.toggleBtn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const passwordInput = document.getElementById('password');
  if (passwordInput) new PasswordUX(passwordInput);
});
```

### Email Verification Flow Optimization

```html
<!-- Email Verification Experience -->
<div class="verification-flow" data-step="email-sent">
  <div class="verification-content">
    <div class="verification-icon">
      <svg class="check-email-icon" viewBox="0 0 24 24">
        <path d="M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C2.89,4 20,4.89 20,4Z"/>
      </svg>
    </div>
    
    <h2>Check Your Email</h2>
    <p>We sent a verification link to <strong class="user-email">your@email.com</strong></p>
    
    <div class="verification-actions">
      <!-- Link straight to common webmail inboxes by the user's email
           domain. This is far more reliable than mobile mail-app deep links
           (which frequently dead-end). Native "Open Mail app" is left to the
           OS — most users already have the email open in another tab. -->
      <a class="btn-primary" id="open-inbox" target="_blank" rel="noopener">
        Open your inbox
      </a>

      <div class="secondary-actions">
        <button class="btn-link" id="resend-btn">
          Didn't get it? Resend
        </button>

        <button class="btn-link" onclick="changeEmail()">
          Change email address
        </button>
      </div>
    </div>

    <!-- Auto-check for verification -->
    <div class="auto-verification">
      <div class="spinner"></div>
      <span>Waiting for you to confirm…</span>
    </div>
  </div>
</div>
```

**Security & abuse rules baked into the handler below:**

- **Poll a session-scoped status endpoint, not the raw email.** The browser
  sends *no* email in the request body; the server reads it from the
  authenticated signup session/cookie. Posting the email on a timer leaks PII
  and enables enumeration. Send `credentials: 'include'` and a CSRF token.
- **Exponential backoff with jitter**, capped, with a hard stop — never a
  fixed 3s hammer.
- **Resend is rate-limited client- *and* server-side** with a visible
  cooldown; the server enforces the real limit per account/IP.
- **Identical, non-committal responses** for resend ("If that address needs
  confirmation, we’ve sent a link") so the endpoint can't be used to probe
  which emails exist.
- **Inbox link is built from the email domain**, not a fragile app deep link.

```javascript
// Email Verification UX Handler — session-scoped, backoff, no PII in requests.
class EmailVerificationFlow {
  constructor({ csrfToken } = {}) {
    this.csrfToken = csrfToken;            // mirror of the CSRF cookie
    this.timer = null;
    this.delay = 2000;                     // start at 2s
    this.maxDelay = 30000;                 // back off up to 30s
    this.maxDuration = 600000;             // give up after 10 min
    this.startedAt = Date.now();
    this.resendCooldownMs = 30000;
  }

  start() {
    this.schedule();
    this.wireUi();
  }

  schedule() {
    if (Date.now() - this.startedAt > this.maxDuration) return this.stop();
    const jitter = Math.random() * 500;
    this.timer = setTimeout(() => this.checkStatus(), this.delay + jitter);
  }

  async checkStatus() {
    try {
      // No body: the server identifies the pending signup from the session.
      const res = await fetch('/api/signup/verification-status', {
        method: 'GET',
        credentials: 'include',
        headers: { 'X-CSRF-Token': this.csrfToken || '' },
      });
      if (res.ok) {
        const { verified } = await res.json();
        if (verified) return this.onSuccess();
      }
    } catch (_) {
      // Swallow transient errors; we'll retry with a longer delay.
    }
    this.delay = Math.min(this.delay * 1.7, this.maxDelay); // exponential backoff
    this.schedule();
  }

  stop() { if (this.timer) clearTimeout(this.timer); this.timer = null; }

  onSuccess() {
    this.stop();
    const el = document.querySelector('.verification-content');
    if (el) {
      el.innerHTML = `
        <div class="verification-success">
          <div class="success-animation"><svg class="checkmark" viewBox="0 0 50 50">
            <circle class="checkmark-circle" cx="25" cy="25" r="25"/>
            <path class="checkmark-check" d="m16,25 6,6 12,-12"/>
          </svg></div>
          <h2>Email confirmed!</h2><p>Taking you in…</p>
        </div>`;
    }
    setTimeout(() => { window.location.href = '/welcome'; }, 1500);
  }

  wireUi() {
    const resendBtn = document.getElementById('resend-btn');
    if (resendBtn) resendBtn.addEventListener('click', () => this.resend(resendBtn));

    // Build the "Open your inbox" link from the domain shown on the page.
    const inbox = document.getElementById('open-inbox');
    const emailText = document.querySelector('.user-email')?.textContent || '';
    const domain = emailText.split('@')[1]?.toLowerCase();
    const webmail = {
      'gmail.com': 'https://mail.google.com/',
      'googlemail.com': 'https://mail.google.com/',
      'outlook.com': 'https://outlook.live.com/mail/',
      'hotmail.com': 'https://outlook.live.com/mail/',
      'live.com': 'https://outlook.live.com/mail/',
      'yahoo.com': 'https://mail.yahoo.com/',
      'icloud.com': 'https://www.icloud.com/mail/',
      'proton.me': 'https://mail.proton.me/',
    };
    if (inbox && domain && webmail[domain]) inbox.href = webmail[domain];
    else if (inbox) inbox.style.display = 'none'; // unknown host: hide, don't dead-end
  }

  async resend(btn) {
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = 'Sending…';
    try {
      // Again, no email in the body — server uses the session. Server MUST
      // also rate-limit and return the SAME message regardless of state.
      await fetch('/api/signup/resend-verification', {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRF-Token': this.csrfToken || '' },
      });
      btn.textContent = 'Sent — check your inbox';
    } catch (_) {
      btn.textContent = 'Try again shortly';
    }
    // Client-side cooldown (server enforces the authoritative limit).
    setTimeout(() => { btn.textContent = original; btn.disabled = false; }, this.resendCooldownMs);
  }
}

// const flow = new EmailVerificationFlow({ csrfToken: window.__CSRF__ });
// flow.start();
```

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

## 📱 Mobile Signup Optimization

### Mobile-First Design Principles

Set the viewport so iOS doesn't zoom on focus and so `100dvh`/safe areas work:

```html
<meta name="viewport"
      content="width=device-width, initial-scale=1, viewport-fit=cover">
```

```css
/* Mobile Signup Optimization */
.signup-form-mobile {
  /* Respect notches/rounded corners; viewport-fit=cover required above. */
  padding: 20px max(20px, env(safe-area-inset-right))
           20px max(20px, env(safe-area-inset-left));
  max-width: 100%;
}

/* Large, thumb-friendly inputs */
.signup-form-mobile input {
  min-height: 56px; /* iOS recommendation */
  font-size: 16px; /* Prevents zoom on iOS */
  border-radius: 8px;
  border: 2px solid #e1e5e9;
  padding: 0 16px;
  margin-bottom: 16px;
}

/* Enhanced focus states for mobile */
.signup-form-mobile input:focus {
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
  outline: none;
}

/* Sticky submit for long forms. Pad for the home indicator so the button
   isn't hidden behind it; sticky (not fixed) keeps it out of the way of the
   on-screen keyboard on modern mobile browsers. */
.signup-submit-sticky {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px 16px calc(16px + env(safe-area-inset-bottom));
  background: #ffffff;
  border-top: 1px solid #e1e5e9;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.signup-submit-sticky .btn {
  width: 100%;
  height: 50px;
  font-size: 18px;
  font-weight: 600;
}

/* Social login mobile optimization */
.social-buttons-mobile {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.social-buttons-mobile .btn-social {
  width: 100%;
  min-height: 48px; /* >=44-48px touch target (WCAG 2.5.5 / Apple HIG) */
  justify-content: center;
  font-size: 16px;
}
```

### Mobile signup checklist (the things that actually move mobile CR)

- **Inputs ≥ 16px font** (smaller triggers iOS auto-zoom) and **≥ 44–48px**
  touch targets.
- **Right keyboard + autofill per field:** `type="email"` +
  `inputmode="email"` + `autocomplete="email"`; `autocomplete="new-password"`
  on signup and `current-password` on login; `autocomplete="one-time-code"` +
  `inputmode="numeric"` on OTP inputs so iOS/Android offer the SMS code.
- **Test with real password managers** (iCloud Keychain, Google Password
  Manager, 1Password, Bitwarden): confirm they detect the email + password
  fields, can autofill, and that your single password field accepts a pasted/
  generated value. A "confirm password" field or a `pattern`/`maxlength` that
  rejects manager output is a top mobile drop-off cause.
- **Offer passkey conditional UI on mobile** (see the Passkeys section): on a
  biometric device the returning-user path becomes one tap from the email
  field's autofill.
- **Don't trap the keyboard:** avoid `position: fixed` elements that the
  keyboard covers; use `scrollIntoView()` on focus for the active field.
- **Accessibility:** every input has a real `<label>` (placeholders are not
  labels); errors use `aria-live="polite"`; the show/hide toggle and social
  buttons are reachable and announced; color is never the only error signal.
- **Test on actual devices/throttled networks**, not just a desktop emulator;
  measure first-input delay and time-to-interactive on the signup route.

This framework optimizes signup conversion through low-friction form design,
modern auth (passkeys/social with safe fallbacks), privacy-respecting
progressive profiling, and statistically disciplined experimentation. Pair it
with `page-cro` for the surrounding landing page, `popup-cro` for any signup
modals/exit-intent prompts, and `testing-strategy` for org-wide
experimentation process.
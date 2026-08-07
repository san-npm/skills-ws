## Contents

- 🔐 Social Login Impact Analysis
- Do NOT ship a universal "social login = +X%" number
- Social Login Implementation Best Practices
- Social Login A/B Testing Framework

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
// overlapping attempts don't clobber a single shared start time; note it
// stores only the LATEST completion time per provider, not an average.
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
      lastCompletionTimeMs: this.metrics.timeToComplete[provider] ?? null,
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

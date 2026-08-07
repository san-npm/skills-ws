## Contents

- ✅ Friction Audit Checklist
- Form Field Analysis
- Password UX Best Practices (modern, NIST SP 800-63B-aligned)
- Email Verification Flow Optimization

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
        <path d="M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z"/>
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

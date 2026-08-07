## Contents

- 📱 Mobile Signup Optimization
- Mobile-First Design Principles
- Mobile signup checklist (the things that actually move mobile CR)

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

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

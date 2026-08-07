## 3. Implementation defaults

- **Stack:** semantic HTML + Tailwind utility classes. Portable to JSX by swapping `class`→`className`. For a React/Next.js project, see `nextjs-stack`.
- **Mobile-first:** author base styles for mobile; layer `sm:`/`md:`/`lg:` up. ~60%+ of landing-page traffic is mobile — design the mobile hero first, not last.
- **Accessibility (target WCAG 2.2 AA):** one `<h1>`; logical heading order; `alt` on meaningful images (`alt=""` on decorative); visible `:focus-visible` rings; label every input; 4.5:1 text contrast (3:1 for large text/UI); buttons are `<button>`/`<a>`, never `<div onclick>`; respect `prefers-reduced-motion`.
- **Performance / Core Web Vitals (mid-2026 "good" thresholds, 75th-percentile real-user data):** **LCP < 2.5s**, **INP < 200ms** (INP replaced FID as a Core Web Vital in March 2024; do not cite FID), **CLS < 0.1**. Practices: give the hero image explicit `width`/`height` (kills CLS), `loading="lazy"` everything below the fold but **never** the LCP/hero image, `fetchpriority="high"` on the hero image, serve modern formats (AVIF/WebP) with `srcset`, preconnect to font origins and use `font-display: swap`, defer non-critical JS. Verify with PageSpeed Insights (pagespeed.web.dev); deeper budgets in `web-performance`.
- **Forms:** ask for the minimum (email-only out-converts long forms for most lead-gen); inline validation; honeypot or CAPTCHA for spam; show success state without a full reload where possible.

---

## 8. Pre-ship conversion QA checklist

Run before declaring the page done.

**Message & copy**
- [ ] H1 states what + for whom + payoff; readable in ~2s
- [ ] H1 message-matches the intended traffic source (ad/email/search)
- [ ] Benefits lead over features in hero/solution; features grid carries the spec detail
- [ ] Subhead clarifies the "how" or proof

**CTA**
- [ ] Exactly one primary action; secondary CTAs visually subordinate
- [ ] Primary CTA wording identical at hero and final CTA
- [ ] CTA repeats roughly every 1.5 viewports
- [ ] Button labels name value/next step (no bare "Submit")

**Proof (and honesty)**
- [ ] Every logo/quote/name/photo/metric/rating is REAL and approved, or clearly a marked placeholder (§5)
- [ ] No fabricated superlatives or unsubstantiated comparison claims
- [ ] Proof sits adjacent to the claims it supports
- [ ] Regulated/compliance badges reflect actual certifications

**Layout & responsive**
- [ ] Mobile (360×640) hero shows value + CTA above the fold
- [ ] Layout verified at 360 / 768 / 1440 widths; no overflow or tap-target crowding (≥44px)
- [ ] Primary CTA is the highest-contrast element in its viewport

**Accessibility (WCAG 2.2 AA)**
- [ ] One `<h1>`, logical heading order
- [ ] Meaningful images have `alt`; decorative use `alt=""`
- [ ] Visible focus states; full keyboard operability; inputs labeled
- [ ] Text contrast ≥ 4.5:1; `prefers-reduced-motion` respected

**Performance (Core Web Vitals)**
- [ ] LCP < 2.5s, INP < 200ms, CLS < 0.1 (PageSpeed Insights)
- [ ] Hero image has explicit dimensions + `fetchpriority="high"`, not lazy; below-fold images lazy
- [ ] Modern image formats (AVIF/WebP) + `srcset`; fonts `display: swap`

**Forms**
- [ ] Minimum necessary fields; inline validation; spam protection; clear success state

**SEO / structured data**
- [ ] `<title>`, `meta description`, `canonical`, Open Graph + Twitter card, 1200×630 OG image
- [ ] FAQPage JSON-LD matches visible Q&A (for AI-search, not Google rich results — §6)

**Analytics & legal**
- [ ] Conversion event fires on the primary action (form submit / button click) in GA4/PostHog/Plausible
- [ ] Cookie/consent banner present where required (GDPR/ePrivacy); analytics respects consent
- [ ] Footer has privacy policy, terms, and required legal/company info
- [ ] Define the A/B test hypothesis for the riskiest element (headline / CTA / hero) and hand to `ab-testing`

---

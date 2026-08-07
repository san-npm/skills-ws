## 0. Intake — never build blind

A landing page is an argument to one audience for one action. Get these before writing a word. If the user hasn't supplied them, ask for the starred ones; infer the rest and state your assumptions.

| # | Field | Why it changes the build |
|---|-------|--------------------------|
| 1 | **Product & category*** | Determines vocabulary, comparison set, proof type. |
| 2 | **Primary conversion goal*** | Buy / start trial / book demo / join waitlist / capture lead / register. One per page. |
| 3 | **ICP / audience*** | One persona per page. "Marketers" and "engineers" need different pages. |
| 4 | **Traffic source & temperature*** | Cold paid ad → more education, message-match the ad; warm email/retargeting → shorter; SEO/organic → more depth + schema. |
| 5 | Offer & price | Free / freemium / trial / paid / "talk to sales". Drives CTA wording and pricing section. |
| 6 | Funnel stage | Awareness vs decision changes proof density and length. |
| 7 | **Real proof assets*** | Actual logos, testimonials, case studies, metrics, ratings, security badges the user can supply. See §5 — never fabricate these. |
| 8 | Top objections | The 4–6 reasons people *don't* convert → become FAQ + risk-reversal copy. |
| 9 | Brand constraints | Colors, fonts, voice, existing design system/tokens. |
| 10 | Compliance/claims | Regulated claims (health/finance/security/"results"), GDPR/cookie consent, accessibility level (target WCAG 2.2 AA). |
| 11 | Implementation target | Static HTML+Tailwind, React/Next.js, Astro, or a page builder (Webflow/Framer)? Default below is portable HTML + Tailwind, trivially portable to JSX. |
| 12 | Analytics & events | What tool (GA4, PostHog, Plausible) and what events define success. |

**Decision: how long should the page be?** Long enough to close the specific objection set for that traffic temperature, no longer. Cold paid traffic to a considered B2B purchase → long-form with heavy proof. Warm traffic to a free tool → hero + one proof strip + CTA. Don't pad; every section must earn its scroll.

---

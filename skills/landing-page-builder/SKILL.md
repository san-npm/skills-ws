---
name: landing-page-builder
description: "Build and revise high-converting SaaS/product/service/lead-gen landing pages: intake, copy, responsive layout, CTAs, proof sections, FAQ, and implementation-ready HTML/Tailwind/React. Use when asked to build, design, write, or improve a landing page, hero, or marketing page, or to turn an offer or brief into shippable page code."
---

# Landing Page Builder

Take a product or offer and ship a complete, accessible, fast, high-converting landing page: intake → copy → layout → runnable code → conversion QA. This skill carries the full section template library and conversion principles inline — there are no external reference files to fetch.

This skill owns the **whole page build**. For deeper specialization, hand off to siblings:
- Headline/body copy frameworks at scale → `copywriting`
- Iterating an existing page's conversion rate → `page-cro`; exit-intent/popups → `popup-cro`; signup/checkout flow → `signup-flow-cro`
- Running the experiment once live → `ab-testing`
- Reusable design tokens/components → `design-system`; visual polish → `ui-ux-pro-max`
- Performance budgets and CWV tuning → `web-performance` / `nextjs-performance`
- Pricing-page strategy and tier design → `pricing-optimization`; Stripe checkout wiring → `stripe-billing`
- SEO/AI-search optimization of the page → `seo-geo`

---

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

## 1. Page blueprint (a menu, not a mandate)

There is **no single structure every page must follow.** Below is the canonical superset for a considered SaaS/product purchase from cold-ish traffic. Add, drop, and reorder by intake:

- **Lead-gen / waitlist:** Hero + 1 proof strip + short form. Cut features/pricing.
- **Free tool / PLG:** Hero (the tool itself or a live demo) + benefits + social proof + CTA.
- **High-intent / branded search:** Shorter; proof + pricing/CTA early.
- **Cold paid (expensive product):** Full long-form; message-match the ad's promise in the H1; heavy proof; risk reversal.
- **Event/webinar:** Hero with date/time/CTA, agenda, speakers (real bios/photos), registration form. See `webinar-events`.

Canonical section order (reorder freely):

1. **Hero** — value prop + primary CTA + trust signal, above the fold
2. **Problem / stakes** — the cost of the status quo (skip for warm traffic that already feels the pain)
3. **Solution / benefits** — outcomes, not features
4. **Social proof** — logos, testimonials, metrics, ratings
5. **How it works** — 3 steps to reduce perceived effort
6. **Features grid** — for buyers who need the spec sheet
7. **Pricing** — only if self-serve; otherwise a "Book a demo" band
8. **FAQ** — neutralize the top objections
9. **Final CTA** — restate value + risk reversal

**Ordering principles:** put the strongest proof nearest the biggest claim and nearest each CTA; lead with the dominant motivation (pain-led vs aspiration-led) for that audience; repeat the primary CTA roughly every 1.5 viewports so the visitor can convert the moment they're sold.

---

## 2. Copy frameworks (fill-in formulas)

Copy is the product of the page. Layout just gets out of its way. Use these formulas; if you need depth on long-form sales copy, see `copywriting`.

### Value proposition (the H1)
The H1 must answer **what it is + who it's for + the payoff** within ~10 words. Patterns:

- **Outcome:** `{Achieve desired outcome} without {pain/cost}` → "Ship features faster without breaking production."
- **Category + diff:** `The {category} that {key differentiator}` → "The CRM that updates itself."
- **For-whom:** `{Outcome} for {specific ICP}` → "Invoicing built for freelance designers."

Rules: concrete > clever; name the audience or the outcome, not your features; no jargon a cold visitor won't parse in 2 seconds. **Subhead** = the *how* or the proof in one sentence ("Connect your repo and get test coverage on every PR — no config.").

### Benefit > feature translation
Buyers buy outcomes; the spec sheet only reassures. Translate every feature with "**so that**":

| Feature | Benefit (so that…) |
|---------|--------------------|
| Real-time sync | "Everyone sees the same numbers — *so that* no one ships off stale data." |
| 256-bit encryption | "Bank-grade security — *so that* you pass your customer's security review." |
| Slack integration | "Alerts where you already work — *so that* nothing slips through email." |

Hero/solution sections lead with benefit; features grid can be more literal.

### CTA copy by intent
Buttons should name the *value or next step*, never "Submit." Match friction to commitment:

| Funnel stage / offer | Primary CTA | Why |
|----------------------|-------------|-----|
| Free tool / freemium | "Start free — no card" | Removes the #1 hesitation |
| Trial | "Start your 14-day trial" | Concrete, time-bound |
| Demo (sales-led) | "Book a 20-min demo" | Sets the time cost expectation |
| Waitlist | "Get early access" | Exclusivity framing |
| Lead magnet | "Send me the guide" | First-person increases clicks |
| Ecommerce | "Add to cart" / "Buy now" | Standard, don't be clever |

One *primary* action per page; a secondary CTA ("See how it works", "Watch 2-min demo") may sit beside it but must look visually subordinate. Keep button label identical at hero and final CTA so the decision feels consistent.

### Objection-handling FAQ
List the real reasons people *don't* buy, then answer each plainly. Common buckets: price/ROI, switching cost, security/compliance, "will it work for my case", contract/cancellation, support. Answer the question directly in the first sentence (also helps AI-search citation — see §6).

### Above-the-fold checklist
Within the first viewport (test at 360×640 mobile and 1440×900 desktop) a stranger must learn: **(1)** what this is, **(2)** who it's for, **(3)** the payoff, **(4)** one trust signal, **(5)** the primary action. If any is missing, the hero is incomplete.

---

## 3. Implementation defaults

- **Stack:** semantic HTML + Tailwind utility classes. Portable to JSX by swapping `class`→`className`. For a React/Next.js project, see `nextjs-stack`.
- **Mobile-first:** author base styles for mobile; layer `sm:`/`md:`/`lg:` up. ~60%+ of landing-page traffic is mobile — design the mobile hero first, not last.
- **Accessibility (target WCAG 2.2 AA):** one `<h1>`; logical heading order; `alt` on meaningful images (`alt=""` on decorative); visible `:focus-visible` rings; label every input; 4.5:1 text contrast (3:1 for large text/UI); buttons are `<button>`/`<a>`, never `<div onclick>`; respect `prefers-reduced-motion`.
- **Performance / Core Web Vitals (mid-2026 "good" thresholds, 75th-percentile real-user data):** **LCP < 2.5s**, **INP < 200ms** (INP replaced FID as a Core Web Vital in March 2024 — do not cite FID), **CLS < 0.1**. Practices: give the hero image explicit `width`/`height` (kills CLS), `loading="lazy"` everything below the fold but **never** the LCP/hero image, `fetchpriority="high"` on the hero image, serve modern formats (AVIF/WebP) with `srcset`, preconnect to font origins and use `font-display: swap`, defer non-critical JS. Verify with PageSpeed Insights / `web.dev/measure`; deeper budgets in `web-performance`.
- **Forms:** ask for the minimum (email-only out-converts long forms for most lead-gen); inline validation; honeypot or CAPTCHA for spam; show success state without a full reload where possible.

---

## 4. Section templates (runnable HTML + Tailwind)

Drop-in, responsive, accessible. Replace bracketed placeholders. Tailwind v3+/v4 utility names; assumes Tailwind is loaded. Swap `class`→`className` for JSX.

### 4.1 Hero

```html
<header class="relative isolate px-6 pt-6 lg:px-8">
  <!-- Minimal nav -->
  <nav class="mx-auto flex max-w-6xl items-center justify-between py-4" aria-label="Primary">
    <a href="/" class="flex items-center gap-2 font-semibold text-gray-900">
      <img src="/logo.svg" alt="[Brand] logo" width="28" height="28" class="h-7 w-7" />
      [Brand]
    </a>
    <div class="hidden items-center gap-8 md:flex">
      <a href="#features" class="text-sm text-gray-600 hover:text-gray-900">Features</a>
      <a href="#pricing" class="text-sm text-gray-600 hover:text-gray-900">Pricing</a>
      <a href="#faq" class="text-sm text-gray-600 hover:text-gray-900">FAQ</a>
    </div>
    <a href="#cta"
       class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
      Start free
    </a>
  </nav>

  <!-- Hero content -->
  <div class="mx-auto max-w-3xl py-20 text-center sm:py-28">
    <p class="mb-4 text-sm font-medium text-indigo-600">[Optional eyebrow / category]</p>
    <h1 class="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
      [What it is + who it's for + payoff, ~10 words]
    </h1>
    <p class="mt-6 text-lg leading-8 text-gray-600">
      [Subhead: the "how" or the proof, one sentence]
    </p>
    <div class="mt-10 flex items-center justify-center gap-4">
      <a href="#cta"
         class="rounded-lg bg-indigo-600 px-5 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
        [Start free — no card]
      </a>
      <a href="#how" class="text-base font-semibold text-gray-900 hover:text-gray-700">
        See how it works <span aria-hidden="true">→</span>
      </a>
    </div>
    <!-- Trust signal: use ONLY real numbers/logos (see §5) -->
    <p class="mt-8 text-sm text-gray-500">Trusted by [N]+ teams · ★ 4.8 on [G2/Trustpilot]</p>
  </div>

  <!-- LCP image: explicit dimensions + high priority, NOT lazy -->
  <div class="mx-auto max-w-5xl px-2">
    <img src="/hero.avif" alt="[Concrete description of the product screenshot]"
         width="1600" height="900" fetchpriority="high"
         class="rounded-xl shadow-2xl ring-1 ring-gray-900/10" />
  </div>
</header>
```

### 4.2 Problem / stakes

```html
<section class="mx-auto max-w-6xl px-6 py-20" aria-labelledby="problem-h">
  <h2 id="problem-h" class="text-center text-3xl font-bold tracking-tight text-gray-900">
    [The problem with the current approach]
  </h2>
  <div class="mt-12 grid gap-8 sm:grid-cols-3">
    <!-- Repeat per pain point; icon is decorative -> aria-hidden -->
    <div class="rounded-2xl bg-gray-50 p-6">
      <svg class="h-8 w-8 text-rose-500" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
      <h3 class="mt-4 font-semibold text-gray-900">[Specific frustration]</h3>
      <p class="mt-2 text-gray-600">[One concrete sentence on the cost of this pain.]</p>
    </div>
    <!-- … pain 2, pain 3 … -->
  </div>
</section>
```

### 4.3 Solution / benefits (alternating rows)

```html
<section id="how" class="mx-auto max-w-6xl px-6 py-20" aria-labelledby="solution-h">
  <h2 id="solution-h" class="text-center text-3xl font-bold tracking-tight text-gray-900">
    [How [Product] solves this]
  </h2>
  <div class="mt-16 space-y-20">
    <!-- Benefit row: image + copy, reverses on alternating rows -->
    <div class="grid items-center gap-10 lg:grid-cols-2">
      <img src="/benefit-1.avif" alt="[What this screenshot shows]" width="1200" height="800"
           loading="lazy" class="rounded-xl shadow-lg ring-1 ring-gray-900/10" />
      <div>
        <h3 class="text-2xl font-semibold text-gray-900">[Outcome they get]</h3>
        <p class="mt-4 text-gray-600">[Benefit framed as "so that …". Lead with the result, not the mechanism.]</p>
      </div>
    </div>
    <div class="grid items-center gap-10 lg:grid-cols-2">
      <div class="lg:order-2">
        <img src="/benefit-2.avif" alt="[What this shows]" width="1200" height="800" loading="lazy"
             class="rounded-xl shadow-lg ring-1 ring-gray-900/10" />
      </div>
      <div class="lg:order-1">
        <h3 class="text-2xl font-semibold text-gray-900">[Outcome they get]</h3>
        <p class="mt-4 text-gray-600">[Benefit 2.]</p>
      </div>
    </div>
  </div>
</section>
```

### 4.4 Social proof (logo wall + testimonials + metric)

```html
<section class="bg-gray-50 py-20" aria-labelledby="proof-h">
  <div class="mx-auto max-w-6xl px-6">
    <h2 id="proof-h" class="text-center text-sm font-semibold uppercase tracking-wide text-gray-500">
      Trusted by teams at
    </h2>
    <!-- REAL logos only. If none yet, delete this strip — do not invent brands (see §5). -->
    <div class="mt-8 grid grid-cols-2 items-center gap-8 sm:grid-cols-3 lg:grid-cols-6">
      <img src="/logos/acme.svg" alt="Acme" height="32" class="col-span-1 max-h-8 w-full object-contain opacity-70" />
      <!-- … real customer logos … -->
    </div>

    <div class="mt-16 grid gap-6 lg:grid-cols-3">
      <!-- Testimonial card: attribute to a REAL person who said it -->
      <figure class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5">
        <blockquote class="text-gray-900">"[Exact quote the customer actually gave you.]"</blockquote>
        <figcaption class="mt-4 flex items-center gap-3">
          <img src="/people/jane.jpg" alt="" width="40" height="40" class="h-10 w-10 rounded-full" />
          <div class="text-sm">
            <div class="font-semibold text-gray-900">[Real name]</div>
            <div class="text-gray-500">[Title], [Company]</div>
          </div>
        </figcaption>
      </figure>
      <!-- … more real testimonials … -->
    </div>

    <!-- Metric: cite a real, defensible number with its source/period -->
    <p class="mt-12 text-center text-2xl font-semibold text-gray-900">
      [Real metric, e.g. "Cuts onboarding time 40%"] <span class="text-base font-normal text-gray-500">— [source/sample]</span>
    </p>
  </div>
</section>
```

### 4.5 How it works (3 steps)

```html
<section class="mx-auto max-w-5xl px-6 py-20" aria-labelledby="steps-h">
  <h2 id="steps-h" class="text-center text-3xl font-bold tracking-tight text-gray-900">Get started in 3 steps</h2>
  <ol class="mt-12 grid gap-8 sm:grid-cols-3">
    <li class="rounded-2xl border border-gray-200 p-6">
      <span class="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white">1</span>
      <h3 class="mt-4 font-semibold text-gray-900">[Step title]</h3>
      <p class="mt-2 text-gray-600">[What the user does. Make it sound effortless.]</p>
    </li>
    <!-- … steps 2 and 3 … -->
  </ol>
</section>
```

### 4.6 Features grid

```html
<section id="features" class="mx-auto max-w-6xl px-6 py-20" aria-labelledby="features-h">
  <h2 id="features-h" class="text-center text-3xl font-bold tracking-tight text-gray-900">
    [Everything you need to {outcome}]
  </h2>
  <div class="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
    <div class="flex gap-4">
      <svg class="h-6 w-6 flex-none text-indigo-600" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M5 13l4 4L19 7"/></svg>
      <div>
        <h3 class="font-semibold text-gray-900">[Feature]</h3>
        <p class="mt-1 text-sm text-gray-600">[One-line benefit.]</p>
      </div>
    </div>
    <!-- … repeat 5–8× … -->
  </div>
</section>
```

### 4.7 Pricing (self-serve)

For tier strategy/anchoring, see `pricing-optimization`; for live Stripe checkout, `stripe-billing`.

```html
<section id="pricing" class="mx-auto max-w-5xl px-6 py-20" aria-labelledby="pricing-h">
  <h2 id="pricing-h" class="text-center text-3xl font-bold tracking-tight text-gray-900">Simple, transparent pricing</h2>
  <div class="mt-12 grid gap-8 lg:grid-cols-3">
    <!-- Standard plan -->
    <div class="rounded-3xl border border-gray-200 p-8">
      <h3 class="font-semibold text-gray-900">Starter</h3>
      <p class="mt-4"><span class="text-4xl font-bold text-gray-900">$X</span><span class="text-gray-500">/mo</span></p>
      <ul class="mt-6 space-y-3 text-sm text-gray-600">
        <li>✓ [Feature]</li><li>✓ [Feature]</li>
      </ul>
      <a href="#cta" class="mt-8 block rounded-lg border border-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-indigo-600 hover:bg-indigo-50">Choose Starter</a>
    </div>
    <!-- Recommended plan — visually emphasized -->
    <div class="relative rounded-3xl bg-gray-900 p-8 text-white ring-2 ring-indigo-500">
      <span class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-500 px-3 py-1 text-xs font-semibold">Most popular</span>
      <h3 class="font-semibold">Pro</h3>
      <p class="mt-4"><span class="text-4xl font-bold">$Y</span><span class="text-gray-400">/mo</span></p>
      <ul class="mt-6 space-y-3 text-sm text-gray-300">
        <li>✓ Everything in Starter</li><li>✓ [Feature]</li><li>✓ [Feature]</li>
      </ul>
      <a href="#cta" class="mt-8 block rounded-lg bg-indigo-500 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-indigo-400">Choose Pro</a>
    </div>
    <!-- Enterprise -->
    <div class="rounded-3xl border border-gray-200 p-8">
      <h3 class="font-semibold text-gray-900">Enterprise</h3>
      <p class="mt-4 text-2xl font-bold text-gray-900">Custom</p>
      <ul class="mt-6 space-y-3 text-sm text-gray-600"><li>✓ SSO/SAML</li><li>✓ Dedicated support</li></ul>
      <a href="#cta" class="mt-8 block rounded-lg border border-gray-300 px-4 py-2.5 text-center text-sm font-semibold text-gray-900 hover:bg-gray-50">Contact sales</a>
    </div>
  </div>
</section>
```

### 4.8 FAQ accordion (native `<details>`, no JS)

Uses native `<details>/<summary>` so it works without JavaScript and is keyboard-accessible by default. For JSON-LD, see §6.

```html
<section id="faq" class="mx-auto max-w-3xl px-6 py-20" aria-labelledby="faq-h">
  <h2 id="faq-h" class="text-center text-3xl font-bold tracking-tight text-gray-900">Frequently asked questions</h2>
  <dl class="mt-10 divide-y divide-gray-200">
    <details class="group py-5">
      <summary class="flex cursor-pointer list-none items-center justify-between font-medium text-gray-900">
        [Real objection phrased as a question, e.g. "Do I need a credit card to start?"]
        <span class="ml-4 transition group-open:rotate-180" aria-hidden="true">▾</span>
      </summary>
      <p class="mt-3 text-gray-600">[Answer the question directly in the first sentence, then add detail.]</p>
    </details>
    <!-- … 5–8 items … -->
  </dl>
</section>
```

### 4.9 Final CTA

```html
<section id="cta" class="bg-indigo-600">
  <div class="mx-auto max-w-3xl px-6 py-20 text-center">
    <h2 class="text-3xl font-bold tracking-tight text-white sm:text-4xl">[Restate the core value proposition]</h2>
    <p class="mt-4 text-lg text-indigo-100">[Risk reversal: "No card required. Cancel anytime." / "30-day money-back guarantee."]</p>
    <a href="[signup-url]"
       class="mt-8 inline-block rounded-lg bg-white px-6 py-3 text-base font-semibold text-indigo-600 shadow-sm hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
      [Start free — no card]  <!-- identical label to hero CTA -->
    </a>
  </div>
</section>
```

### 4.10 Mobile nav (progressive enhancement)

`<details>` gives a working hamburger menu with zero JS; enhance with a framework's state if you have one.

```html
<details class="md:hidden">
  <summary class="list-none cursor-pointer p-2" aria-label="Open menu">
    <svg class="h-6 w-6" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
  </summary>
  <nav class="mt-2 flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-4 shadow-lg" aria-label="Mobile">
    <a href="#features" class="py-1 text-gray-700">Features</a>
    <a href="#pricing" class="py-1 text-gray-700">Pricing</a>
    <a href="#faq" class="py-1 text-gray-700">FAQ</a>
    <a href="#cta" class="mt-2 rounded-lg bg-indigo-600 px-4 py-2 text-center font-semibold text-white">Start free</a>
  </nav>
</details>
```

### 4.11 `<head>` — metadata, Open Graph, social cards

Critical for shareability and click-through; do this on every landing page.

```html
<title>[Outcome-led title, 50–60 chars] — [Brand]</title>
<meta name="description" content="[Compelling 150–160 char summary that matches the H1 promise]" />
<link rel="canonical" href="https://example.com/page" />
<!-- Open Graph (LinkedIn, Slack, FB) -->
<meta property="og:title" content="[Same as title or sharper]" />
<meta property="og:description" content="[~2 lines]" />
<meta property="og:image" content="https://example.com/og.png" /> <!-- 1200×630, < 1MB -->
<meta property="og:type" content="website" />
<meta property="og:url" content="https://example.com/page" />
<!-- Twitter/X -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

---

## 5. Anti-fabrication safety rules (non-negotiable)

A landing page is a public marketing claim; fake proof is a legal and trust liability (false advertising, FTC-style endorsement rules in the US, comparable EU consumer law).

- **Logos, testimonials, names, photos, ratings, customer counts, and performance metrics MUST be real and supplied/approved by the user.** Never invent a brand logo, fabricate a quote, attach a stock photo to a made-up person, or write "Trusted by 10,000+ teams" / "40% faster" without a real source.
- If the user has **no proof assets yet**, do **one** of:
  1. **Delete** the proof section entirely (a missing section beats a fake one), or
  2. Insert an **obvious placeholder** the user must replace, clearly marked — e.g. `[PLACEHOLDER: replace with real customer logo]`, `[TESTIMONIAL — get written permission before publishing]`, `[METRIC — cite real source]`. Never let a placeholder read as a finished claim.
- **Comparison/superlative claims** ("the fastest", "#1", "best") need substantiation — flag them for the user to verify or soften to defensible language.
- **Regulated claims** (health outcomes, financial returns, "secure"/"compliant", "GDPR/SOC 2/HIPAA") must reflect the user's *actual* certifications. Don't print a SOC 2 badge they don't hold. Flag for legal review when in doubt.
- Star ratings/review counts must match the real profile and ideally **link** to the source (G2, Trustpilot, App Store).

State explicitly in your handoff which items are placeholders awaiting real assets.

---

## 6. SEO / structured data / AI-search

- **FAQPage JSON-LD — read this before adding it.** As of **May 7, 2026, Google no longer shows FAQ rich results in Search** for any site (the appearance, the rich-results report, and Rich Results Test support were retired in mid-2026; from Aug 2023 it had already been limited to authoritative government/health sites). So **do not promise the user FAQ rich snippets.** FAQPage is still a valid schema.org type, causes no harm, and **still gets cited disproportionately by AI answer engines** (ChatGPT, Perplexity, Google AI Overviews). Keep it for AI-search/AEO value, not for Google rich results. *Verify current status at https://developers.google.com/search/docs/appearance/structured-data/faqpage.* Mark up only Q&As that genuinely appear visibly on the page:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Do I need a credit card to start?",
      "acceptedAnswer": { "@type": "Answer", "text": "No. The free plan needs no card; add one only when you upgrade." }
    },
    {
      "@type": "Question",
      "name": "Can I cancel anytime?",
      "acceptedAnswer": { "@type": "Answer", "text": "Yes — cancel from your dashboard with one click; you keep access through the end of the billing period." }
    }
  ]
}
</script>
```
Rules: questions/answers in JSON-LD must match the visible page text; don't stuff promotional copy or links into answers; one `FAQPage` per page. Add `Organization` + `Product`/`SoftwareApplication` schema where it fits.

- **On-page SEO basics:** one keyword-aligned `<h1>`; descriptive `<title>` (50–60 chars) and `meta description` (150–160); `canonical`; semantic headings; descriptive `alt` text; fast LCP (rank factor). Deeper SEO/AI-search optimization → `seo-geo`.

---

## 7. Conversion principles (the *why* behind the template)

Layout and copy decisions should trace to a principle, not taste. To iterate conversion on a *live* page, use `page-cro`.

1. **One page, one goal.** Every element either drives the primary action or builds trust toward it. Competing CTAs split intent and lower conversion — remove or subordinate secondary asks.
2. **Message match.** The H1 must echo the promise of whatever the visitor clicked (ad headline, email subject, search query). A mismatch spikes bounce regardless of page quality.
3. **Clarity beats persuasion.** Confused visitors leave. Plain language, concrete nouns, scannable structure. Clever wordplay that delays comprehension costs conversions.
4. **Visual hierarchy guides the eye.** Size, weight, color, and whitespace rank importance: H1 → subhead → CTA. The primary CTA should be the highest-contrast element in its viewport. Generous whitespace raises comprehension and perceived value.
5. **Proof next to claims.** Put a testimonial/metric/logo adjacent to the boldest claim it supports — proof at the moment of doubt, not quarantined in one section.
6. **Reduce friction at the ask.** Every form field, every required decision, every "create account" lowers completion. Default to the smallest commitment (email-only, "no card"), defer the rest.
7. **Risk reversal.** Money-back guarantee, free trial, "cancel anytime", "no card required" — shift perceived risk off the visitor, especially at the final CTA.
8. **Specificity sells.** "Cuts reporting time 40%" beats "save time"; "Trusted by 1,200 dev teams" beats "trusted by many" — *only if real* (§5).
9. **Single primary CTA, repeated.** Same action, same wording, surfaced ~every 1.5 viewports so a sold visitor never has to scroll back.
10. **Direction of attention.** Faces/eyes in images looking toward the CTA, arrows, and contrasting buttons steer the gaze where you want the click.
11. **Speed is conversion.** Each extra second of LCP measurably drops conversion; a fast page is a conversion feature, not just an SEO one (§3).
12. **Mobile is the default.** Most landing traffic is mobile — if the mobile hero doesn't convert, the page doesn't convert.

---

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
- [ ] LCP < 2.5s, INP < 200ms, CLS < 0.1 (PageSpeed Insights / web.dev/measure)
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

## 9. Build workflow (how to actually run this skill)

1. Run **intake** (§0); state assumptions for anything the user didn't give.
2. Pick the **section set** for that traffic temperature / offer (§1).
3. Draft **copy first** (§2) — H1, subhead, CTA, benefits, FAQ — then place it into the **templates** (§4).
4. Wire **proof** with the user's real assets, or insert marked placeholders + flag them (§5).
5. Add **`<head>` metadata + FAQPage JSON-LD** (§4.11, §6).
6. Run the **QA checklist** (§8); fix every failing box.
7. Hand off: name the placeholders awaiting real assets, the A/B hypothesis for `ab-testing`, and any compliance items needing legal review.

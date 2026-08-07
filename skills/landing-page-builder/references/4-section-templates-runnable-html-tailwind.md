## Contents

- 4. Section templates (runnable HTML + Tailwind)
- 4.1 Hero
- 4.2 Problem / stakes
- 4.3 Solution / benefits (alternating rows)
- 4.4 Social proof (logo wall + testimonials + metric)
- 4.5 How it works (3 steps)
- 4.6 Features grid
- 4.7 Pricing (self-serve)
- 4.8 FAQ accordion (native <details>, no JS)
- 4.9 Final CTA
- 4.10 Mobile nav (progressive enhancement)
- 4.11 <head> — metadata, Open Graph, social cards

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
      <svg class="h-6 w-6 flex-none text-indigo-600" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>
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
  <div class="mt-10 divide-y divide-gray-200">
    <details class="group py-5">
      <summary class="flex cursor-pointer list-none items-center justify-between font-medium text-gray-900">
        [Real objection phrased as a question, e.g. "Do I need a credit card to start?"]
        <span class="ml-4 transition group-open:rotate-180" aria-hidden="true">▾</span>
      </summary>
      <p class="mt-3 text-gray-600">[Answer the question directly in the first sentence, then add detail.]</p>
    </details>
    <!-- … 5–8 items … -->
  </div>
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

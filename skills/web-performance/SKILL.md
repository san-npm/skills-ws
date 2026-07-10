---
name: web-performance
description: "Core Web Vitals (LCP/INP/CLS) optimization, bundle analysis, caching, image/font loading, RUM field measurement, and server-side performance for modern web apps. Use when improving page speed, fixing failing Web Vitals, setting performance budgets, or auditing front-end/server perf."
---

# Web Performance

## Core Web Vitals

| Metric | Good | Needs Work | Poor | What it measures |
|--------|------|------------|------|-----------------|
| **LCP** | ≤2.5s | ≤4.0s | >4.0s | Largest visible content render |
| **INP** | ≤200ms | ≤500ms | >500ms | Input responsiveness |
| **CLS** | ≤0.1 | ≤0.25 | >0.25 | Visual stability |

### LCP Fixes

1. **Preload LCP image:** `<link rel="preload" as="image" href="/hero.webp">`
2. **Inline critical CSS** (eliminate render-blocking)
3. **Server response <200ms** (TTFB): optimize DB queries, use edge caching
4. **Avoid lazy-loading above-fold images** — use `loading="eager"` or omit attribute
5. **Use `fetchpriority="high"`** on LCP element

### INP Fixes

1. **Break long tasks** (>50ms) by yielding to the main thread. There is no standalone `yield()` in browsers; use `scheduler.yield()` where available (Chromium 129+ and Firefox 142+; not in Safari as of Jul 2026) with a `setTimeout(0)` fallback.
2. **Defer non-critical JS:** `<script defer>` or dynamic `import()`
3. **Use `requestIdleCallback`** for analytics/telemetry — but it is unsupported in Safari (use a `setTimeout` shim) and **always pass a `timeout`** so the work runs even if the page never goes idle.
4. **Debounce input handlers:** 100-150ms for search, immediate for buttons

```javascript
// Yield to the main thread, with feature detection + fallback.
// scheduler.yield() resumes at high priority (front of queue);
// setTimeout(0) is the universal fallback (resumes after pending tasks).
function yieldToMain() {
  if ('scheduler' in window && 'yield' in scheduler) {
    return scheduler.yield();
  }
  return new Promise(r => setTimeout(r, 0));
}

async function processItems(items) {
  let lastYield = performance.now();
  for (const item of items) {
    process(item);
    // Yield every ~50ms so input stays responsive.
    if (performance.now() - lastYield > 50) {
      await yieldToMain();
      lastYield = performance.now();
    }
  }
}

// requestIdleCallback with Safari shim + mandatory timeout.
const ric = window.requestIdleCallback
  || ((cb) => setTimeout(() => cb({ didTimeout: true, timeRemaining: () => 0 }), 1));
ric(() => sendTelemetry(), { timeout: 2000 }); // runs within 2s even if never idle
```

> `isInputPending()` (`navigator.scheduling.isInputPending()`) is a separate, Chromium-only API for checking whether input is queued mid-task. It is **not** a yielding primitive and is not needed when you yield on a time budget as above — prefer the `yieldToMain()` pattern for portability.

### CLS Fixes

1. **Set explicit dimensions:** `<img width="800" height="600">` or `aspect-ratio: 16/9`
2. **Reserve space for ads/embeds** with `min-height`
3. **Use `font-display: optional`** to prevent layout shift from font swap
4. **Avoid injecting content above existing content**

## Lighthouse Automation

```bash
# CLI
npx lighthouse https://example.com --output=json --output-path=./report.json
```

Performance budgets (budget.json, --budget-path) were removed in Lighthouse 12 (2024). Enforce budgets in CI with Lighthouse CI assertions instead (see the Lighthouse CI section below).

## Bundle Analysis

```bash
# Webpack
npx webpack-bundle-analyzer stats.json

# Vite
npx vite-bundle-visualizer

# Quick size check
npx bundle-phobia-cli <package-name>
```

**Targets:** ~150–200KB gzipped JS for the initial load is a reasonable starting budget for a content/marketing route; rich SPAs and dashboards run higher. Treat it as a per-route, per-device-class budget and tune against real-user p75 (especially mid-tier mobile), not a universal hard cap. Split per route and lazy-load below-fold/interaction-only code.

## Code Splitting & Lazy Loading

```typescript
// React: route-level splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));

// Next.js: dynamic import
const Chart = dynamic(() => import('./Chart'), { ssr: false, loading: () => <Skeleton /> });

// Intersection Observer for below-fold components
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) loadComponent(); });
}, { rootMargin: '200px' });
```

## Image Optimization

| Format | Use case | Savings vs JPEG |
|--------|----------|----------------|
| WebP | Universal support | 25-35% |
| AVIF | Modern browsers | 40-50% |
| SVG | Icons, logos | N/A (vector) |

```html
<!-- Above-fold / LCP hero: eager + high priority, NEVER lazy-load -->
<picture>
  <source srcset="/hero.avif" type="image/avif">
  <source srcset="/hero.webp" type="image/webp">
  <img src="/hero.jpg" alt="Hero" width="1200" height="600"
       fetchpriority="high" decoding="async"><!-- no loading=lazy -->
</picture>

<!-- Below-fold image: lazy-load to save bandwidth -->
<picture>
  <source srcset="/gallery.avif" type="image/avif">
  <source srcset="/gallery.webp" type="image/webp">
  <img src="/gallery.jpg" alt="Gallery item" width="800" height="600"
       loading="lazy" decoding="async">
</picture>

<!-- Responsive below-fold image -->
<img srcset="img-400.webp 400w, img-800.webp 800w, img-1200.webp 1200w"
     sizes="(max-width: 600px) 100vw, 50vw" src="img-800.webp" alt="..."
     loading="lazy" decoding="async">
```

## Font Loading

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2');
  font-display: swap; /* or optional for CLS-sensitive pages */
  unicode-range: U+0000-00FF; /* subset to latin */
}
```

```html
<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
```

**Checklist:** ✅ WOFF2 only ✅ Subset with `glyphhanger` ✅ Preload primary font ✅ `font-display: swap` or `optional` ✅ ≤2 font families

## Caching Strategies

```
# Immutable assets (hashed filenames)
Cache-Control: public, max-age=31536000, immutable

# HTML / API responses
Cache-Control: public, max-age=0, must-revalidate
# or
Cache-Control: public, max-age=60, stale-while-revalidate=3600

# Private user data
Cache-Control: private, no-cache
```

### Service Worker (Runtime Caching)

```javascript
// sw.js — Stale-while-revalidate with Workbox (complete, runnable)
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// Images: serve cached, refresh in background, cap the cache.
registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 3600 }),
    ],
  })
);

// Hashed/static assets: cache-first (they're immutable).
registerRoute(
  ({ request }) => ['script', 'style', 'font'].includes(request.destination),
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 365 * 24 * 3600 }),
    ],
  })
);
```

## Resource Hints

```html
<!-- DNS + TCP + TLS for critical third-party origins -->
<link rel="preconnect" href="https://fonts.googleapis.com">

<!-- Prefetch next-page resources during idle -->
<link rel="prefetch" href="/next-page.js">

<!-- Preload critical resources for current page -->
<link rel="preload" href="/critical.css" as="style">
<link rel="preload" href="/hero.webp" as="image">

<!-- Early hints (103) — server-level -->
<!-- Configure in CDN/reverse proxy for fastest preload -->
```

## Server-Side Optimization

```nginx
# Compression (nginx). gzip is built in.
gzip on;
gzip_types text/css application/javascript application/json image/svg+xml;

# Brotli is NOT built into stock nginx — it requires the ngx_brotli module
# (compile with --add-module, or use a distro/CDN build that bundles it).
# If your CDN/reverse proxy (Cloudflare, Fastly, etc.) handles Brotli, skip this.
brotli on;
brotli_types text/css application/javascript application/json image/svg+xml;

# Enable HTTP/2 — nginx 1.25.1+ uses a separate `http2` directive.
# The old `listen 443 ssl http2;` form is deprecated and warns on boot.
listen 443 ssl;
http2 on;

# HTTP/2 server push is deprecated/removed — use 103 Early Hints instead.
```

**Compression priority:** pre-compress static assets at build time (`.br` + `.gz`) and serve with `gzip_static`/`brotli_static`; otherwise Brotli (best ratio) → gzip (universal fallback). Compress text only — never re-compress images/video.

## Performance Budget Enforcement

```javascript
// Build-time check (custom)
const BUDGET = { js: 200_000, css: 50_000, images: 500_000 }; // bytes, gzipped
// Fail CI if exceeded
```

**Quick audit commands:**
```bash
# Total transfer size
curl -so /dev/null -w '%{size_download}' https://example.com
# API load test (latency under concurrency)
npx autocannon -c 100 -d 30 https://example.com/api/data
```

## Field Measurement (RUM)

Lighthouse is **lab data** (one synthetic run); Core Web Vitals are graded on **field data** at the **p75** of real users, segmented by device (mobile is almost always the bottleneck). Always measure both — fix in the lab, verify in the field.

- **CrUX** (Chrome UX Report): the public field dataset Google scores you on. Query the [CrUX API](https://developer.chrome.com/docs/crux) or [PageSpeed Insights](https://pagespeed.web.dev/) for p75 LCP/INP/CLS by URL/origin and form factor. Coverage requires enough traffic; otherwise self-collect.
- **`web-vitals` library** for first-party RUM, including attribution (which element/script caused the bad metric):

```javascript
import { onLCP, onINP, onCLS } from 'web-vitals/attribution';

function report({ name, value, rating, attribution }) {
  // rating: 'good' | 'needs-improvement' | 'poor'
  navigator.sendBeacon('/rum', JSON.stringify({
    name, value, rating,
    target: attribution.interactionTarget || attribution.largestShiftTarget,
  }));
}
onLCP(report); onINP(report); onCLS(report); // INP attribution -> the slow handler
```

- **Segment & alert on p75**, not averages — a good mean hides a slow tail. Split by route, device class, and country. Alert when route p75 crosses a threshold (INP >200ms, LCP >2.5s, CLS >0.1).

## Framework Notes (2026)

- **Next.js (App Router / RSC):** Server Components ship zero client JS by default — keep `"use client"` at the leaves to shrink hydration. Use `next/image` (auto AVIF/WebP, lazy below-fold) and `next/font` (self-hosted, no layout shift). Cache on the edge with route segment config / `revalidate`.
- **React:** `<Suspense>` + `React.lazy` for code splitting; React 19 streaming SSR improves TTFB. Avoid hydrating static content.
- **Astro:** ships zero JS by default; use island directives (`client:visible`, `client:idle`) so interactive components hydrate only when needed.
- **Vite / Rollup:** automatic per-route chunking via dynamic `import()`; inspect with `vite-bundle-visualizer`. Use `build.rollupOptions.output.manualChunks` to split large vendor deps.
- **Edge caching:** serve HTML with `stale-while-revalidate` from the CDN edge and emit 103 Early Hints for critical assets.

## Lighthouse CI (config)

Gate PRs on performance with Lighthouse CI (`@lhci/cli`):

```json
// lighthouserc.json
{
  "ci": {
    "collect": { "url": ["https://example.com/"], "numberOfRuns": 3 },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "total-blocking-time": ["error", { "maxNumericValue": 300 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }]
      }
    },
    "upload": { "target": "temporary-public-storage" }
  }
}
```

Lighthouse navigation runs cannot measure INP (timespan mode only); gate on TBT as the lab proxy and track INP p75 in the field via RUM/CrUX (see Field Measurement).

```bash
npx @lhci/cli autorun   # collect -> assert -> upload; non-zero exit fails CI
```

### Caching decision tree

- **Hashed/fingerprinted asset** (`app.a1b2c3.js`) → `Cache-Control: public, max-age=31536000, immutable`
- **HTML / personalized page** → `public, max-age=0, must-revalidate` (or `private, no-cache` if user-specific)
- **API response that tolerates staleness** → `public, max-age=60, stale-while-revalidate=3600`
- **Sensitive user data** → `private, no-store`


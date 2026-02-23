---
name: web-performance
description: Core Web Vitals optimization, bundle analysis, caching strategies, and server-side performance for modern web applications.
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

1. **Break long tasks:** `yield()` or `scheduler.yield()` after 50ms
2. **Defer non-critical JS:** `<script defer>` or dynamic `import()`
3. **Use `requestIdleCallback`** for analytics/telemetry
4. **Debounce input handlers:** 100-150ms for search, immediate for buttons

```javascript
// Break long task with yield
async function processItems(items) {
  for (const item of items) {
    process(item);
    if (navigator.scheduling?.isInputPending?.()) {
      await new Promise(r => setTimeout(r, 0)); // yield to main thread
    }
  }
}
```

### CLS Fixes

1. **Set explicit dimensions:** `<img width="800" height="600">` or `aspect-ratio: 16/9`
2. **Reserve space for ads/embeds** with `min-height`
3. **Use `font-display: optional`** to prevent layout shift from font swap
4. **Avoid injecting content above existing content**

## Lighthouse Automation

```bash
# CLI
npx lighthouse https://example.com --output=json --output-path=./report.json

# CI with budget
npx lighthouse https://example.com --budget-path=budget.json
```

```json
// budget.json
[{ "resourceSizes": [
  { "resourceType": "script", "budget": 300 },
  { "resourceType": "total", "budget": 800 }
], "resourceCounts": [
  { "resourceType": "third-party", "budget": 5 }
]}]
```

## Bundle Analysis

```bash
# Webpack
npx webpack-bundle-analyzer stats.json

# Vite
npx vite-bundle-visualizer

# Quick size check
npx bundlephobia <package-name>
```

**Targets:** JS bundle <200KB gzipped for initial load. Split per route.

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
<picture>
  <source srcset="/hero.avif" type="image/avif">
  <source srcset="/hero.webp" type="image/webp">
  <img src="/hero.jpg" alt="Hero" width="1200" height="600"
       loading="lazy" decoding="async">
</picture>

<!-- Responsive images -->
<img srcset="img-400.webp 400w, img-800.webp 800w, img-1200.webp 1200w"
     sizes="(max-width: 600px) 100vw, 50vw" src="img-800.webp" alt="...">
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
// Stale-while-revalidate with Workbox
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';

registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({ cacheName: 'images', plugins: [
    new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 3600 }),
  ]})
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
# Compression (nginx)
gzip on;
gzip_types text/css application/javascript application/json image/svg+xml;
brotli on;
brotli_types text/css application/javascript application/json;

# HTTP/2 push is deprecated — use 103 Early Hints instead
# Enable HTTP/2
listen 443 ssl http2;
```

**Compression priority:** Brotli (best ratio) → gzip (universal fallback).

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
# Waterfall analysis
npx autocannon -c 100 -d 30 https://example.com/api/data
```

## References

See `references/` for Lighthouse CI configs, CDN setup guides, and caching decision trees.

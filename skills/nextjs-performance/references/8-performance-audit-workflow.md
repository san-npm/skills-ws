## Contents

- 8. Performance Audit Workflow
- Step 1: Measure baseline + confirm the metrics, don't guess
- Step 2: Bundle size
- Step 3: Rendering strategy (read the build legend)
- Step 4: Image audit
- Step 5: Third-party scripts
- Step 6: Network waterfall
- Step 7: Real-user monitoring (lab ≠ field — Core Web Vitals are scored on field data)

## 8. Performance Audit Workflow

### Step 1: Measure baseline + confirm the metrics, don't guess
```bash
npx @lhci/cli autorun --collect.url=https://your-site.com   # lab numbers
```
Then make each metric **measurable**, not vibes:
- **Confirm the LCP element** (lab ≠ what you assume): in DevTools → Performance, record a load and click the **LCP** marker in the Timings track — it highlights the actual element. Or in console: `new PerformanceObserver(l => l.getEntries().forEach(e => console.log(e.element, e.startTime))).observe({ type: 'largest-contentful-paint', buffered: true });`. Only THAT element should `preload`.
- **TTFB**: `curl -o /dev/null -s -w 'ttfb=%{time_starttransfer}s total=%{time_total}s\n' https://your-site.com`. If TTFB > ~800ms, LCP can't hit 2.5s — fix the server/render path (static/ISR, faster DB, edge) before touching the client.
- **Image transfer size**: DevTools → Network, filter Img, check the **Transferred** column and whether the served `Content-Type` is `image/avif`/`image/webp`. A 400×300 image shipping 800KB means a missing/oversized `sizes` or an unoptimized `<img>`.
- **JS execution time**: DevTools → Performance → Bottom-Up, group by script; or Lighthouse "Total Blocking Time" + "JS execution time" audits. This is what INP/TBT actually measure.

### Step 2: Bundle size
```bash
ANALYZE=true npm run build
# Triage in the treemap: any single package > 50KB gzip, duplicate copies of the same
# lib (multiple versions), and SERVER-only code leaking into a client bundle
# ("use client" file importing a server util / a DB driver).
```

### Step 3: Rendering strategy (read the build legend)
```bash
npm run build
# Per-route symbols (legend printed under the table):
#   ○ Static       /about              prerendered, no server work
#   ● SSG          /blog/[slug]        prerendered via generateStaticParams
#   ◐ Partial      /product/[id]       partial prerender: static shell + streamed dynamic
#   ƒ Dynamic      /dashboard          rendered per request
# Question every ƒ Dynamic route: can it be SSG/ISR, or kept static with the dynamic
# parts behind <Suspense>? With cacheComponents (Next 16) routes are dynamic by DEFAULT,
# so "static" now means you explicitly cached it ('use cache') — verify intent, not accidents.
```

### Step 4: Image audit
```bash
# Use ripgrep with an explicit path + glob (portable, fast). Plain grep -r without a
# path is brittle across shells/OSes.
rg '<img\b' -g '*.tsx' -g '*.jsx' .     # Raw <img> — should be next/image instead
rg 'preload|priority' -g '*.tsx' .      # Confirm the LCP image preloads (16) / has priority (15)
rg 'fill\b' -g '*.tsx' . | rg -v sizes  # `fill` images missing `sizes` → oversized downloads
```

### Step 5: Third-party scripts
```tsx
import Script from 'next/script';

// Analytics — after interactive
<Script src="https://www.googletagmanager.com/gtag/js" strategy="afterInteractive" />

// Chat widget — lazy
<Script src="https://widget.intercom.io/widget/xxx" strategy="lazyOnload" />

// NEVER use beforeInteractive unless absolutely required
```

### Step 6: Network waterfall
Open Chrome DevTools > Performance tab. Look for:
- Long chains of dependent requests
- Large JS bundles blocking interaction
- Layout shifts during load

### Step 7: Real-user monitoring (lab ≠ field — Core Web Vitals are scored on field data)
Lighthouse is lab. Google ranks on **field** (CrUX) data, so instrument production:

```tsx
// app/web-vitals.tsx  — Client Component
'use client';
import { useReportWebVitals } from 'next/web-vitals';

export function WebVitals() {
  useReportWebVitals((metric) => {
    // metric: { name: 'LCP'|'INP'|'CLS'|'FCP'|'TTFB', value, rating, id, navigationType }
    navigator.sendBeacon('/api/vitals', JSON.stringify(metric)); // or your analytics
  });
  return null;
}
// Render <WebVitals /> once in app/layout.tsx. Vercel Analytics / Speed Insights does this for you.
```

Then close the loop:
- **Field (CrUX/PSI API):** query real p75 per route. `GET https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=<url>&key=$PSI_KEY` returns `loadingExperience.metrics` (CrUX p75). Or the CrUX API for origin/URL history. (Endpoints/keys as of Jun 2026 — verify at https://developer.chrome.com/docs/crux.)
- **CI budgets (Lighthouse CI):** fail the build when lab regresses. `lighthouserc.json`:
  ```json
  { "ci": { "assert": { "assertions": {
    "categories:performance": ["error", { "minScore": 0.9 }],
    "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
    "interaction-to-next-paint": ["error", { "maxNumericValue": 200 }],
    "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
    "total-blocking-time": ["warn", { "maxNumericValue": 200 }]
  } } } }
  ```
  Run `npx @lhci/cli autorun` in CI; gate merges on it.
- **Production regression thresholds:** alert when field **p75** crosses the "good" line — LCP > 2.5s, INP > 200ms, CLS > 0.1 (and "needs improvement"→"poor" at LCP 4s / INP 500ms / CLS 0.25). Page-level, not site-average, so one bad template doesn't hide behind good ones.

---

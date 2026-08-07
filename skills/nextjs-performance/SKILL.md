---
name: nextjs-performance
description: "Next.js (App Router, v15/16) performance: Core Web Vitals, rendering/caching strategy, bundle analysis, images, fonts, edge middleware, and RUM-driven audits. Use when a Next.js app is slow, fails LCP/INP/CLS, has a bloated bundle, or you must pick SSG/ISR/SSR/streaming or migrate to Cache Components ('use cache')."
---
# Next.js Performance

Real performance optimization for Next.js App Router. Not "add lazy loading" — actual diagnosis workflows, rendering-strategy decisions, and production caching patterns.

**Version baseline (as of Jul 2026):** Next.js 16.x is current (16.3 shipped Jun 29, 2026; docs track 16.2.x); examples target Next.js 15/16. Where 15 and 16 diverge (image `priority`→`preload`, `minimumCacheTTL` default, `unstable_cache`→`'use cache'`, removed `NextRequest.geo`), both are called out. Verify versions/APIs at https://nextjs.org/docs and release notes at https://nextjs.org/blog. For SEO/metadata performance see the sibling `seo-geo` skill.

---

## Reference guide

Read only the references needed for the current request:

- **1. Core Web Vitals — What Actually Causes Problems**: [references/1-core-web-vitals-what-actually-causes-problems.md](references/1-core-web-vitals-what-actually-causes-problems.md)
- **2. Rendering Strategy Decision Matrix**: [references/2-rendering-strategy-decision-matrix.md](references/2-rendering-strategy-decision-matrix.md)
- **3. Image Optimization**: [references/3-image-optimization.md](references/3-image-optimization.md)
- **4. Bundle Analysis & Tree Shaking**: [references/4-bundle-analysis-tree-shaking.md](references/4-bundle-analysis-tree-shaking.md)
- **5. Edge Functions & Middleware**: [references/5-edge-functions-middleware.md](references/5-edge-functions-middleware.md)
- **6. Font Loading**: [references/6-font-loading.md](references/6-font-loading.md)
- **7. Caching Strategies**: [references/7-caching-strategies.md](references/7-caching-strategies.md)
- **8. Performance Audit Workflow**: [references/8-performance-audit-workflow.md](references/8-performance-audit-workflow.md)
- **9. Production Checklist**: [references/9-production-checklist.md](references/9-production-checklist.md)
- **Bundle**: [references/bundle.md](references/bundle.md)
- **Images**: [references/images.md](references/images.md)
- **Rendering**: [references/rendering.md](references/rendering.md)
- **Fonts**: [references/fonts.md](references/fonts.md)
- **Caching**: [references/caching.md](references/caching.md)
- **Third-Party**: [references/third-party.md](references/third-party.md)
- **Monitoring**: [references/monitoring.md](references/monitoring.md)

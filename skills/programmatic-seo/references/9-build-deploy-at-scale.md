## Contents

- 9. Build & Deploy at Scale
- Incremental Static Regeneration (Next.js)
- Build Performance Tips

## 9. Build & Deploy at Scale

### Incremental Static Regeneration (Next.js)

For 100k+ pages, don't rebuild everything on every deploy.

```typescript
// In your page — only pre-render high-traffic pages
export async function generateStaticParams() {
  const topPages = await getTopPages(1000);
  return topPages.map(p => ({ slug: p.slug }));
}

// dynamicParams = true (default) means other slugs render on-demand
export const revalidate = 86400; // Revalidate daily
```

### Build Performance Tips

1. **Parallelize data fetching** in `generateStaticParams`
2. **Cache API responses** to disk during build
3. **Use database connection pooling** (PgBouncer or similar)
4. **Chunk builds** — deploy in batches if build times exceed CI limits
5. **Use `dynamicParams: true`** + ISR instead of pre-rendering everything

---

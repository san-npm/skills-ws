## Contents

- 7. Index Management
- robots.txt — block crawl traps, not your content
- Sitemap Strategy for Large Sites
- Noindex Pages That Don't Pass Quality Gates

## 7. Index Management

### robots.txt — block crawl *traps*, not your content

Critical distinction: **`robots.txt` `Disallow` blocks crawling, not indexing.** A disallowed URL can still get indexed (from links) — and because Google can't fetch it, it will **never see your `canonical` or `noindex` tag** on that URL. So:

- **Use `Disallow` only for genuine infinite crawl traps** (every `sort`/`filter` permutation, calendar pickers, session-id URLs) where you never want the crawler to spend budget.
- **Do NOT blanket-block pagination** (`?page=`). Page 2+ is how crawlers discover deeper items; blocking it strands that inventory. Instead keep paginated pages crawlable and let the on-page self-canonical/`noindex` do the work (see §4).
- **To keep something out of the index, use `noindex` (meta/header) and leave it crawlable** — the opposite of `Disallow`.

```txt
User-agent: *
Allow: /

# Block genuine crawl traps (combinatorial filter/sort URLs add no unique pages)
Disallow: /*?sort=
Disallow: /*?filter=
# NOTE: do NOT add `Disallow: /*?page=` — pagination must stay crawlable so
# deeper items get discovered. Control its indexing with on-page tags instead.

# Block non-public sections (these should ALSO send noindex if ever reachable)
Disallow: /drafts/
Disallow: /preview/

Sitemap: https://example.com/sitemap-index.xml
```

### Sitemap Strategy for Large Sites

A single sitemap file is capped at **50,000 URLs / 50 MB uncompressed** — split before you hit either. (Chunking at 10k as below keeps files small and fast to regenerate.) Next 15+ also ships a native `app/sitemap.ts` exporting `MetadataRoute.Sitemap`, plus `generateSitemaps()` for sharding — prefer that for typed, framework-managed sitemaps. The hand-rolled route handlers below give you full control and work on any framework; both are valid.

```typescript
// app/sitemap-index.xml/route.ts
export async function GET() {
  const pageTypes = ['locations', 'comparisons', 'integrations', 'tools'];
  const sitemaps: string[] = [];

  for (const type of pageTypes) {
    const count = await getPageCount(type);
    const chunks = Math.ceil(count / 10000);
    for (let i = 0; i < chunks; i++) {
      sitemaps.push(`https://example.com/sitemaps/${type}-${i}.xml`);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${sitemaps.map(url => `<sitemap><loc>${url}</loc></sitemap>`).join('\n  ')}
</sitemapindex>`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}

// app/sitemaps/[type]-[chunk].xml/route.ts
// Route Handler params are async in Next 15+ — await them.
export async function GET(
  _: Request,
  { params }: { params: Promise<{ type: string; chunk: string }> },
) {
  const { type, chunk: chunkStr } = await params;
  const chunk = parseInt(chunkStr);
  const pages = await getPagesByType(type, { skip: chunk * 10000, take: 10000 });

  // Google ignores <changefreq> and <priority>; invest in an accurate <lastmod>
  // instead (other engines may still read changefreq).
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pages.map(p => `<url>
    <loc>https://example.com${p.path}</loc>
    <lastmod>${p.updatedAt.toISOString()}</lastmod>
  </url>`).join('\n  ')}
</urlset>`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}
```

### Noindex Pages That Don't Pass Quality Gates

```tsx
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPageData(slug);
  const quality = qualityGate(data, 'location');

  // Keep follow:true so internal-link equity still flows out of a thin page.
  return {
    ...(quality.pass ? {} : { robots: { index: false, follow: true } }),
  };
}
```

---

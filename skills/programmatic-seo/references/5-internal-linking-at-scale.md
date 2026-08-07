## Contents

- 5. Internal Linking at Scale
- Link Architecture Patterns
- Automatic "Related" Links
- Breadcrumbs (Every Page)

## 5. Internal Linking at Scale

Internal linking is the #1 lever for programmatic SEO. Do it systematically.

### Link Architecture Patterns

```
Hub Page (/plumbers)
  ├── Location Pages (/plumbers/austin-tx)
  │     ├── links to nearby locations
  │     ├── links to sub-services (/plumbers/austin-tx/drain-cleaning)
  │     └── links back to hub
  ├── Location Pages (/plumbers/denver-co)
  └── ...
```

### Automatic "Related" Links

```typescript
// lib/internal-links.ts
export async function getRelatedPages(
  currentPage: { type: string; tags: string[]; locationId?: string; slug: string },
  limit = 6
) {
  // 1. Same type, overlapping tags (most relevant)
  const byTags = await prisma.page.findMany({
    where: {
      type: currentPage.type,
      tags: { hasSome: currentPage.tags },
      slug: { not: currentPage.slug },
    },
    orderBy: { traffic: 'desc' },
    take: limit,
  });

  if (byTags.length >= limit) return byTags;

  // 2. Nearby locations (for location pages)
  if (currentPage.locationId) {
    const nearby = await prisma.page.findMany({
      where: {
        type: currentPage.type,
        locationId: { in: await getNearbyLocationIds(currentPage.locationId) },
      },
      take: limit - byTags.length,
    });
    return [...byTags, ...nearby];
  }

  return byTags;
}
```

### Breadcrumbs (Every Page)

```tsx
function Breadcrumbs({ items }: { items: { label: string; href: string }[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      item: `https://example.com${item.href}`,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
      <nav aria-label="Breadcrumb">
        <ol className="flex gap-2 text-sm text-gray-500">
          {items.map((item, i) => (
            <li key={item.href} className="flex items-center gap-2">
              {i > 0 && <span>/</span>}
              {i === items.length - 1 ? (
                <span aria-current="page">{item.label}</span>
              ) : (
                <a href={item.href}>{item.label}</a>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
```

---

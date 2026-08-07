## Contents

- 4. Canonical Strategy
- Decision Matrix
- Implementation

## 4. Canonical Strategy

### Decision Matrix

| Scenario | Canonical |
|----------|-----------|
| "A vs B" and "B vs A" exist | Point both to higher search volume variant |
| Location + service page | Self-referencing canonical |
| Paginated listings (page 2+) | **Self-referencing canonical** on each page; do NOT canonical page 2+ to page 1 (see note) |
| Filtered views (`/tools?category=email`) | Canonical to unfiltered `/tools` unless filtered URL has its own search intent |
| HTTP vs HTTPS | Always HTTPS |
| www vs non-www | Pick one, redirect the other, canonical to winner |
| Duplicate content across locales | Use `hreflang`, self-referencing canonicals per locale |

**Pagination — the `rel=prev/next` myth.** Google **stopped using `rel=prev/next` as an indexing signal years ago** (announced 2019) and does not use it today. Modern pagination guidance:

- Give every page a **self-referencing canonical** (`/tools/email-marketing?page=3` → itself). Canonicalizing page 2+ to page 1 hides the items that only appear deeper, so they never get discovered or indexed.
- Make pagination **crawlable with real `<a href>` links** — not buttons that only work with JS, and not infinite scroll with no underlying URLs.
- Give each paginated page a **distinct `<title>`/meta** (e.g. append "— Page 3") so they aren't flagged as duplicates.
- Only `noindex` **truly low-value** variants (e.g. arbitrary filter/sort permutations). Keep them `follow` so equity still flows.
- `rel=prev/next` is harmless if already present (other engines may use it), but don't build new work around it.

### Implementation

```tsx
// Always set canonical in generateMetadata. params is async in Next 15+.
export async function generateMetadata(
  { params }: { params: Promise<{ service: string; location: string }> },
) {
  const { service, location } = await params;
  return {
    alternates: {
      canonical: `https://example.com/${service}/${location}`,
    },
  };
}
```

---

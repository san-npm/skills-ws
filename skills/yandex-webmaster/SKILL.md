---
name: yandex-webmaster
description: "Yandex Webmaster setup, Yandex-specific SEO, regional targeting, Turbo pages, and Russian market search optimization."
---

# Yandex Webmaster

## Workflow

### 1. Setup & Verification

**Verification methods:**
- HTML file upload
- Meta tag: `<meta name="yandex-verification" content="XXXX" />`
- DNS TXT record
- WHOIS email verification

**Post-verification:**
- Submit sitemap: Settings → Sitemap files → Add
- Set main mirror: Settings → Site indexing → Main mirror (www vs non-www)
- Configure regional targeting: Settings → Regional targeting → Select regions

### 2. Yandex vs Google — Ranking Differences

| Factor | Google | Yandex |
|--------|--------|--------|
| Backlinks | Primary signal | Important but less dominant |
| Text relevance | Semantic, context-based | More literal keyword matching |
| Commercial factors | Implicit | Explicit ranking factors (prices, contact info, delivery) |
| User behavior | Moderate signal | Heavy signal (CTR, dwell time, pogo-sticking) |
| Regional targeting | IP + hreflang | Explicit geo-assignment per page |
| Content freshness | Important for news | Important across all content types |
| Site quality (ICS) | No direct equivalent | Explicit quality rating visible in Webmaster |

### 3. Commercial Ranking Factors

Yandex explicitly values these for commercial queries:

| Factor | Implementation |
|--------|---------------|
| Contact information | Full address, phone, email on every page (or footer) |
| Prices visible | Show prices on product/service pages |
| Delivery information | Clear delivery terms and costs |
| Company details | Legal entity name, registration numbers |
| Reviews/ratings | Customer reviews on site |
| Wide assortment | More products/services = stronger signal |
| Secure payment | SSL + payment security badges |

### 4. Regional Targeting

Yandex assigns pages to specific regions. Critical for local businesses.

**Set region in Yandex Webmaster:** Settings → Regional targeting → Assign region per site section.

**For multi-region businesses:**
- Create separate regional landing pages (/moscow/, /spb/, /novosibirsk/)
- Each page should have region-specific content (not just city name swapped)
- Register in Yandex Business Directory for each location
- Add structured local data (address, phone per region)

### 5. Turbo Pages

Turbo pages are Yandex's AMP equivalent — ultra-fast mobile pages served from Yandex cache.

**RSS feed implementation:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:yandex="http://news.yandex.ru" xmlns:media="http://search.yahoo.com/mrss/"
     xmlns:turbo="http://turbo.yandex.ru" version="2.0">
  <channel>
    <title>Site Name</title>
    <link>https://example.com</link>
    <turbo:analytics type="Yandex" id="XXXXXXXX"/>

    <item turbo="true">
      <title>Article Title</title>
      <link>https://example.com/article</link>
      <turbo:content>
        <![CDATA[
          <header>
            <h1>Article Title</h1>
            <figure>
              <img src="https://example.com/image.jpg"/>
            </figure>
          </header>
          <p>Article content goes here. Use standard HTML.</p>
          <h2>Subheading</h2>
          <p>More content with <a href="https://example.com">links</a>.</p>
        ]]>
      </turbo:content>
    </item>
  </channel>
</rss>
```

**Submit:** Turbo pages → Sources → Add RSS feed URL.

**Turbo page benefits:**
- 15x faster load time on mobile
- Higher position in mobile search results
- Yandex serves from their CDN (zero server load)
- Supports ads, analytics, forms, e-commerce widgets

### 6. ICS Quality Rating

ICS (Index of Citation for Sites) is Yandex's visible site quality score (0-10,000+).

**Factors that improve ICS:**
- Regular content updates
- User engagement metrics (low bounce, high dwell time)
- Backlink quality (Yandex values editorial links from relevant sites)
- Site age and history
- Presence in Yandex Business Directory
- Social signals (shares, mentions)

**Check ICS:** Yandex Webmaster → Site quality → ICS rating.

### 7. Yandex-Specific Meta Tags

```html
<!-- Verification -->
<meta name="yandex-verification" content="XXXX" />

<!-- Control indexing -->
<meta name="robots" content="index, follow" />
<meta name="yandex" content="noyaca" />  <!-- Don't replace description with Yandex Catalog -->

<!-- Original source (for syndicated content) -->
<meta property="article:source" content="https://original-source.com/article" />
```

### 8. Yandex Webmaster API

```python
import requests

headers = {"Authorization": f"OAuth {YANDEX_OAUTH_TOKEN}"}
host_id = "https:example.com:443"

# Get search queries
r = requests.get(
    f"https://api.webmaster.yandex.net/v4/user/{USER_ID}/hosts/{host_id}/search-queries/popular",
    headers=headers,
    params={"date_from": "2025-01-01", "date_to": "2025-01-31"}
)
for query in r.json().get("queries", []):
    print(query["query_text"], query["indicators"]["TOTAL_SHOWS"], query["indicators"]["TOTAL_CLICKS"])
```

## Monthly Audit Checklist

- [ ] Check indexing status — pages indexed vs submitted
- [ ] Review ICS rating trend
- [ ] Analyze top queries and position changes
- [ ] Check Turbo page errors (if using)
- [ ] Verify regional targeting is correct
- [ ] Review crawl errors and excluded pages
- [ ] Compare Yandex vs Google performance for key queries
- [ ] Update sitemap if site structure changed

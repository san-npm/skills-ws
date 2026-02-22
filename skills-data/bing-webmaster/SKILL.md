---
name: bing-webmaster
description: "Bing Webmaster Tools setup, IndexNow protocol, URL submission, backlink analysis, and Bing-specific SEO optimization. Use when setting up Bing Webmaster Tools, implementing IndexNow, analyzing Bing performance, or optimizing for Bing search."
---

# Bing Webmaster Tools

## Workflow

### 1. Setup & Verification

**Verification methods (pick one):**
- XML file upload (BingSiteAuth.xml to root)
- Meta tag (`<meta name="msvalidate.01" content="XXXX" />`)
- CNAME DNS record
- Auto-verify if already in Google Search Console (import)

**Import from GSC:** Bing offers one-click import of all your GSC properties — fastest path.

### 2. IndexNow Implementation

IndexNow tells search engines about URL changes instantly. Supported by Bing, Yandex, and others.

**Simple implementation (single URL):**
```bash
# Generate API key (any UUID works)
KEY="your-api-key-here"

# Place key file at site root
echo "$KEY" > public/$KEY.txt
# Accessible at: https://example.com/$KEY.txt

# Notify Bing of URL change
curl "https://api.indexnow.org/indexnow?url=https://example.com/updated-page&key=$KEY"
```

**Batch submission (up to 10,000 URLs):**
```bash
curl -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json" \
  -d '{
    "host": "example.com",
    "key": "your-api-key",
    "keyLocation": "https://example.com/your-api-key.txt",
    "urlList": [
      "https://example.com/page1",
      "https://example.com/page2",
      "https://example.com/page3"
    ]
  }'
```

**Automate with build/deploy hook:**
```javascript
// Next.js post-build script
const changedUrls = getChangedPages(); // your logic
if (changedUrls.length > 0) {
  await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      host: 'example.com',
      key: process.env.INDEXNOW_KEY,
      keyLocation: `https://example.com/${process.env.INDEXNOW_KEY}.txt`,
      urlList: changedUrls
    })
  });
}
```

### 3. Bing vs Google — Key Differences

| Factor | Google | Bing |
|--------|--------|------|
| Social signals | Minimal impact | Significant ranking factor |
| Exact match domains | Discounted | Still somewhat rewarded |
| Multimedia content | Moderate impact | Higher weight (images, video) |
| Page authority | Links-heavy | More balanced (links + social + content) |
| Flash/Silverlight | Not indexed | Historically indexed (legacy) |
| Keyword in URL | Minor factor | More weight |
| Official site badge | No equivalent | Verified site badge available |

### 4. URL Submission API

**For new or updated content (beyond IndexNow):**
```bash
curl -X POST "https://ssl.bing.com/webmaster/api.svc/json/SubmitUrl?apikey=$BING_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"siteUrl":"https://example.com","url":"https://example.com/new-page"}'
```

**Daily quota:** 10,000 URLs/day for verified sites. Use for bulk submissions after migrations.

### 5. Backlink Analysis

Bing Webmaster provides free backlink data (competitive with paid tools for basics):
- Inbound links report: domains linking to you
- Anchor text distribution
- Top linked pages
- New and lost links

**Audit checklist:**
- [ ] Disavow toxic backlinks (spam, irrelevant foreign domains)
- [ ] Check anchor text diversity (too many exact-match = risky)
- [ ] Monitor new links weekly for negative SEO
- [ ] Compare backlink profile vs top 3 competitors

### 6. Bing SEO Optimization

**Content optimization:**
- Use exact-match keywords in H1 and first paragraph (Bing is more literal than Google)
- Include multimedia: images with descriptive alt text, embedded video
- Ensure fast page load (Bing uses page speed as a ranking factor)
- Add schema markup (Bing uses it for rich results and entity understanding)

**Technical optimization:**
- Submit XML sitemap in Bing Webmaster Tools
- Enable IndexNow for real-time indexing
- Set crawl control settings (Bing respects crawl-delay in robots.txt)
- Use hreflang for international pages (Bing supports it)

### 7. Reporting

**Monthly Bing audit:**
- [ ] Check crawl errors and fix
- [ ] Review search performance (impressions, clicks, CTR)
- [ ] Compare Bing vs Google rankings for top 20 keywords
- [ ] Monitor IndexNow submission success rate
- [ ] Review and update sitemap if site structure changed
- [ ] Check for manual penalties (rare but check)

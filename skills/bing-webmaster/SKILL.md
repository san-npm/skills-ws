---
name: bing-webmaster
description: "Bing Webmaster Tools setup, IndexNow protocol, URL submission, backlink analysis, AI Performance report (Feb 2026), Generative Engine Optimization (GEO) per Bing's official guidelines, Copilot citation tracking, meta-directive controls for AI surfaces, and Bing-specific SEO. Use when setting up Bing Webmaster Tools, implementing IndexNow, tracking Copilot citations, optimizing for Bing search or AI answers."
---

# Bing Webmaster Tools & GEO

## Workflow

### 1. Setup & Verification

**Verification methods (pick one):**
- XML file upload (`BingSiteAuth.xml` to root)
- Meta tag (`<meta name="msvalidate.01" content="XXXX" />`)
- CNAME DNS record
- Auto-verify if already in Google Search Console (import)

**Import from GSC:** Bing offers one-click import of all your GSC properties — fastest path.

### 2. IndexNow

IndexNow tells search engines about URL changes instantly. Bing explicitly recommends it for AI freshness: *"IndexNow helps ensure that AI systems reference the most current version of a page when generating answers."*

**Single URL:**
```bash
KEY="your-api-key-here"
echo "$KEY" > public/$KEY.txt    # served at https://example.com/$KEY.txt
curl "https://api.indexnow.org/indexnow?url=https://example.com/updated-page&key=$KEY"
```

**Batch (up to 10,000 URLs):**
```bash
curl -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json" \
  -d '{
    "host": "example.com",
    "key": "your-api-key",
    "keyLocation": "https://example.com/your-api-key.txt",
    "urlList": [
      "https://example.com/page1",
      "https://example.com/page2"
    ]
  }'
```

**Auto-trigger on deploy (Next.js example):**
```javascript
const changedUrls = getChangedPages();
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

### 3. AI Performance report (public preview, Feb 2026)

Bing Webmaster Tools → **AI Performance**. First first-party citation analytics from any major search engine.

What it shows:
- How often your content is cited in Copilot, Bing AI summaries, and partner integrations
- Which URLs are referenced
- Citation activity over time

How to use it:
- **Audit gaps:** URLs ranking well in classic Search but missing from AI citations are GEO opportunities.
- **Track wins:** Watch citation count after structural rewrites (answer-first, schema, IndexNow ping).
- **Compare with referrer logs:** Cross-check `bing.com/chat` and `copilot.microsoft.com` referrers against the report.

### 4. Generative Engine Optimization (GEO) — Bing's official guidance

Bing's updated webmaster guidelines now define **GEO** as *"focused on content eligibility for grounding and reference in AI responses."* Bing states GEO doesn't guarantee citation — same as SEO doesn't guarantee ranking.

**Best practices Bing lists for becoming a grounding source:**

| Practice | What Bing says |
|---|---|
| Clear facts | Present facts directly, no vague claims |
| Entity references | Avoid ambiguous references; use full names |
| Naming consistency | Same entity names across text, images, video |
| Topic focus | One topic per URL |
| Information placement | Key info near the top of the page |
| Structure | Clear headings, tables, FAQ sections |
| Evidence | Examples, data, cited sources |
| Freshness | Regular updates + IndexNow notifications |
| Authority | Deepen coverage in related areas |

**Schema markup:** Not officially mandated, but content with proper JSON-LD correlates with ~2.5× higher AI citation rate. JSON-LD is treated as the de facto standard across Bing, Google, Perplexity, and ChatGPT.

### 5. Meta directives — effect on Copilot

Bing's 2026 guidelines spell out per-directive AI behavior:

| Directive | Effect on Copilot / AI answers |
|---|---|
| `NOARCHIVE` | Prevents Copilot use entirely |
| `NOCACHE` | Limits Copilot to URLs, titles, and snippets |
| `DATA-NOSNIPPET` | May reduce citation quality |
| `NOINDEX` | Removes from both classic Search and AI surfaces |

Example — allow classic indexing but limit AI use:
```html
<meta name="robots" content="index, follow, noarchive">
```

### 6. Updated abuse policies (2026)

Bing expanded its abuse guidelines alongside GEO:

- **"Prompt Injection and AI Manipulation"** — new dedicated section. Attempts to interfere with Bing's or Copilot's language models will be demoted.
- **"Keyword Stuffing and Artificially Engineered Language"** — renamed and expanded. Covers content designed to trigger AI citations, not just classic rankings.
- **Scaled content** — language softened from "malicious" to: *"Large-scale content generated without oversight, quality control, or editorial review often lacks usefulness, accuracy, and originality, and may be excluded from indexing."* — aligns with Google's stance: targets intent, not automation itself.

### 7. URL Submission API

```bash
curl -X POST "https://ssl.bing.com/webmaster/api.svc/json/SubmitUrl?apikey=$BING_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"siteUrl":"https://example.com","url":"https://example.com/new-page"}'
```

**Daily quota:** 10,000 URLs/day for verified sites. Use for bulk migrations; prefer IndexNow for incremental updates.

### 8. Bing vs Google — what still differs

| Factor | Google | Bing |
|---|---|---|
| Social signals | Minimal | Moderate ranking factor |
| Exact-match domains | Discounted | Mildly rewarded |
| Multimedia weight | Moderate | Higher (images, video, transcripts) |
| Keyword in URL | Minor | Moderate |
| AI citation telemetry | Limited (Search Console partial) | **First-party AI Performance report** |
| GEO in guidelines | Implicit | **Explicitly named** |
| `llms.txt` stance | Explicitly rejects | No official position |

### 9. Backlink analysis

Bing Webmaster provides free backlink data:
- Inbound links by domain
- Anchor text distribution
- Top linked pages
- New + lost links

**Audit checklist:**
- [ ] Disavow toxic backlinks
- [ ] Check anchor text diversity
- [ ] Monitor new links weekly
- [ ] Compare profile vs top 3 competitors

### 10. Reporting cadence

**Monthly Bing audit:**
- [ ] Crawl errors → fix
- [ ] Search performance (impressions, clicks, CTR)
- [ ] **AI Performance** — citation count + cited URLs
- [ ] Bing vs Google rankings for top 20 keywords
- [ ] IndexNow submission success rate
- [ ] Sitemap freshness

## Sources

- Bing AI Performance announcement: `blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview`
- Bing GEO + abuse policy update: Search Engine Journal coverage of revised official guidelines
- IndexNow: `indexnow.org`

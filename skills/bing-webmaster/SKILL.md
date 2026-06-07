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

**Key file (one-time setup):** generate a key (8–128 hex chars), serve it as a static text file whose body is exactly the key.
```bash
KEY=$(openssl rand -hex 16)          # e.g. a1b2c3...; treat as a public token, not a secret
echo -n "$KEY" > "public/$KEY.txt"   # served verbatim at https://example.com/$KEY.txt
```
On Next.js/Vercel anything in `public/` is served at the domain root automatically; on other hosts drop the file in the web root. Verify with `curl https://example.com/$KEY.txt` before submitting.

**Single URL** — always URL-encode the submitted URL so query strings/anchors don't break the request:
```bash
curl -G "https://api.indexnow.org/indexnow" \
  --data-urlencode "url=https://example.com/updated-page?ref=launch" \
  --data-urlencode "key=$KEY"
```

**Batch (up to 10,000 URLs per request):** all URLs must share the same host as `host`/`keyLocation`.
```bash
curl -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json" \
  -d '{
    "host": "example.com",
    "key": "'"$KEY"'",
    "keyLocation": "https://example.com/'"$KEY"'.txt",
    "urlList": [
      "https://example.com/page1",
      "https://example.com/page2"
    ]
  }'
```

**Response codes to handle:** `200` accepted · `202` accepted, key validation pending · `400` invalid format · `403` key not found/invalid at `keyLocation` · `422` URL doesn't match host or key mismatch · `429` too many requests (back off and retry with exponential delay). Submitting to any one participating engine (Bing, Yandex, etc.) propagates to the others, so one POST to `api.indexnow.org` is enough. Log the URLs submitted plus the returned status so you can audit coverage; only re-submit a URL when its content actually changes — repeated pings of unchanged URLs add no value.

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

**Deriving `getChangedPages()`** — pick the source that matches your stack; the goal is "files that changed in this deploy → public URLs":

- **Git diff (CI / GitHub Actions, most reliable):** diff the deployed commit against the previous one and map page files to routes.
  ```javascript
  import { execSync } from 'node:child_process';

  function getChangedPages() {
    // GitHub Actions exposes the previous SHA as github.event.before; locally fall back to HEAD~1
    const base = process.env.GITHUB_EVENT_BEFORE || 'HEAD~1';
    const files = execSync(`git diff --name-only ${base} HEAD`, { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);

    return files
      .filter(f => /^src\/app\/.*\/page\.(tsx|mdx)$/.test(f) || /^content\/.*\.mdx$/.test(f))
      .map(fileToUrl)
      .filter(Boolean);
  }

  function fileToUrl(file) {
    // src/app/blog/my-post/page.tsx -> https://example.com/blog/my-post
    const route = file
      .replace(/^src\/app/, '')
      .replace(/\/page\.(tsx|mdx)$/, '')
      .replace(/^content/, '')          // content/blog/x.mdx -> /blog/x
      .replace(/\.mdx$/, '')
      .replace(/\/\(.*?\)/g, '')         // strip Next.js route groups: /(marketing)/about -> /about
      .replace(/\/index$/, '');          // /blog/index -> /blog
    return `https://example.com${route || '/'}`;
  }
  ```
- **Sitemap diff (CMS/SSG without clean Git→route mapping):** fetch the freshly built `sitemap.xml`, compare each `<loc>`'s `<lastmod>` against the previous build's sitemap (cache it as a build artifact), and submit only URLs whose `lastmod` advanced.
- **CMS webhook:** trigger from the CMS publish event and read the changed slug(s) straight out of the webhook payload (e.g. Sanity/Contentful/WordPress `post.permalink`) — most precise for editorial sites.
- **Build manifest:** for incremental static regeneration, map regenerated paths from the build output (e.g. Next.js `.next/server/app` route manifest) to URLs.

Whichever source you use, dedupe and cap each POST at 10,000 URLs.

### 3. AI Performance report (public preview, Feb 2026)

Bing Webmaster Tools → **AI Performance**. Microsoft positions this as the first first-party AI-citation analytics shipped by a major search engine; it's the most direct citation telemetry available today regardless of who got there first.

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

**Schema markup:** Not officially mandated for citation — clear, well-structured prose can be grounded without it — but JSON-LD helps engines disambiguate entities, prices, authorship, and dates, which is exactly what grounding relies on. Treat it as the de facto structured-data standard across Bing, Google, Perplexity, and ChatGPT; add it where it removes ambiguity rather than chasing a specific citation-rate multiplier (no public, methodologically sound study quantifies the lift as of Jun 2026).

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
| `llms.txt` stance | Not adopted for Search; says standard robots/meta govern Search surfaces | No official position |

> `llms.txt` adoption is moving fast in 2026 — recheck both engines' current stance before relying on this row. Google has stated it does not use `llms.txt` for Search crawling and that standard `robots.txt`/meta-robots controls govern Search surfaces (this is "not adopted," not a formal ban). Bing has published no official position. Treat `llms.txt` as low-cost optional housekeeping, not a ranking or citation lever.

### 9. Backlink analysis

Bing Webmaster provides free backlink data:
- Inbound links by domain
- Anchor text distribution
- Top linked pages
- New + lost links

**Audit checklist:**
- [ ] Check anchor text diversity (over-optimized exact-match anchors are a spam signal)
- [ ] Monitor new + lost links weekly
- [ ] Compare profile vs top 3 competitors

**Disavow — guarded, not routine.** Disavowing is a high-risk action that can suppress legitimate links if misapplied; modern engines already ignore most low-quality links automatically. Only disavow when you have a **manual action / link spam notice** in Bing Webmaster Tools or Google Search Console, or a clear, audited pattern of paid/spam/negative-SEO links you cannot get removed at the source. Before submitting: export your full link profile and the disavow list as a backup, prefer disavowing at the `domain:` level over individual URLs, and keep the file under version control so changes are reversible. Do not disavow as a precautionary or recurring task.

### 10. Reporting cadence

**Monthly Bing audit:**
- [ ] Crawl errors → fix
- [ ] Search performance (impressions, clicks, CTR)
- [ ] **AI Performance** — citation count + cited URLs
- [ ] Bing vs Google rankings for top 20 keywords
- [ ] IndexNow submission success rate
- [ ] Sitemap freshness

## Sources

URLs and policy wording shift fast in this area — confirm against the live page before citing. Retrieval dates below are when wording in this skill was last checked.

- Bing AI Performance announcement (public preview, Feb 2026): https://blogs.bing.com/webmaster (Bing Webmaster Blog index — open the "AI Performance" announcement; retrieved Jun 2026)
- Bing Webmaster Guidelines — GEO definition, per-directive AI behavior, and the updated abuse/scaled-content policies (the primary source for §4–§6, not third-party coverage): https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a (retrieved Jun 2026)
- IndexNow protocol + endpoints, response codes, and key-file rules: https://www.indexnow.org/documentation (retrieved Jun 2026)
- Bing URL Submission API reference: https://learn.microsoft.com/bingwebmaster/ (retrieved Jun 2026)

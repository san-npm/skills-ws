---
name: seo-geo
description: "SEO & GEO (Generative Engine Optimization) for websites. Technical SEO audits, keyword research, schema markup (JSON-LD), Core Web Vitals (LCP/INP/CLS), E-E-A-T, international SEO (hreflang), and AI search optimization for Google AI Overviews & AI Mode, Bing Copilot, ChatGPT Search, Claude, Perplexity, and Gemini. Reflects 2026 primary-source guidance from Google, Microsoft, OpenAI, and Anthropic. Use when improving search visibility, AI citations, indexing, meta tags, structured data, keyword clustering, or competitor analysis."
---

# SEO & GEO Optimization v3 (2026)

**GEO = Generative Engine Optimization** — get *cited* by AI engines, not just ranked. Each engine has a different stance; optimize for the union, not a single playbook.

## What the engines actually say (2026)

| Engine | Source of truth | Position summary |
|---|---|---|
| Google AI Overviews / AI Mode | `developers.google.com/search/docs/fundamentals/ai-optimization-guide` | Same index as Search via RAG + query fan-out. Standard SEO applies. **Structured data not required.** Explicitly rejects `llms.txt`, AI-specific markup, and "AI rewrites." |
| Bing Copilot | `blogs.bing.com/webmaster/February-2026` + updated webmaster guidelines | Formally names **GEO**. Wants clear facts, consistent entities, one topic per URL, key info near top, IndexNow for freshness. Schema markup correlates with ~2.5× higher citation rate. New abuse policies on prompt injection and "artificially engineered language." |
| ChatGPT Search | `developers.openai.com/api/docs/bots` + Publishers FAQ | "Sites that are opted out of OAI-SearchBot will not be shown in ChatGPT search answers." Standard SEO + crawler access. Citation favors structural clarity and named entity density. |
| Claude | `support.claude.com` crawler docs | Three crawlers: `ClaudeBot` (training), `Claude-User` (user-triggered fetch), `Claude-SearchBot` (search grounding). Respects `robots.txt` + `Crawl-delay`. No public ranking guidance — quality + accessibility are the levers. |

## Workflow

### 1. Technical SEO audit

```bash
curl -sL "URL" | grep -E "<title>|<meta name=\"description\"|application/ld\+json" | head -20
curl -s "URL/robots.txt"
curl -s "URL/sitemap.xml" | head -50
```

**Core Web Vitals (2026 thresholds):**
- **LCP** (Largest Contentful Paint) < 2.5s
- **INP** (Interaction to Next Paint) < 200ms — *replaced FID in March 2024*
- **CLS** (Cumulative Layout Shift) < 0.1

### 2. Crawler access — the 2026 robots.txt

```
# Classic search
User-agent: Googlebot
Allow: /
User-agent: Bingbot
Allow: /

# AI search (citation crawlers — allow if you want AI traffic)
User-agent: OAI-SearchBot          # ChatGPT search citations
Allow: /
User-agent: Claude-SearchBot       # Claude search grounding
Allow: /
User-agent: Claude-User            # User-triggered Claude fetches
Allow: /
User-agent: PerplexityBot
Allow: /

# AI training crawlers (allow/block per your policy)
User-agent: GPTBot                 # OpenAI training
User-agent: ClaudeBot              # Anthropic training
User-agent: Google-Extended        # Gemini training (NOT Googlebot)
User-agent: CCBot                  # Common Crawl

Sitemap: https://example.com/sitemap.xml
```

**Key distinctions:**
- Blocking `GPTBot` does **not** block ChatGPT citations — those use `OAI-SearchBot`.
- Blocking `ClaudeBot` does **not** block Claude search — that uses `Claude-SearchBot`.
- Blocking `Google-Extended` does **not** affect Google Search ranking — only Gemini training.
- `ChatGPT-User` and `Claude-User` are user-initiated; they are not subject to standard crawl restrictions.

Verify crawler IPs:
- OpenAI: `https://openai.com/searchbot.json`, `https://openai.com/gptbot.json`
- Anthropic: `https://claude.com/crawling/bots.json`

### 3. Per-engine GEO playbook

#### Google AI Overviews / AI Mode

> *"You don't need to create new machine readable files, AI text files, markup, or Markdown to appear."* — Google

- Be indexable + snippet-eligible in classic Search. AI surfaces draw from the same index.
- Unique POV content. Google calls out *"unique expert or experienced takes"* over commodity rewrites.
- **Do not** create `llms.txt` for Google. **Do not** chunk content artificially. **Do not** ship scaled/templated commodity pages — flagged as spam.
- Structured data is **not required** for AI Overviews (still useful for rich results).

#### Bing Copilot (GEO)

Bing's updated guidelines define GEO as *"focused on content eligibility for grounding and reference in AI responses."* GEO doesn't guarantee citation — same as SEO doesn't guarantee ranking.

Best practices Bing lists explicitly:
- **Facts presented clearly and directly.** No vague or ambiguous entity references.
- **Consistent naming** across text, images, video (same entities/products/concepts).
- **One topic per URL.**
- **Key info near the top of the page.**
- **IndexNow** for freshness — "AI systems reference the most current version."
- **Schema markup**: not officially mandated, but content with proper schema correlates with ~2.5× higher AI citation rate in practice.

Meta directive effects on Copilot:
- `NOARCHIVE` — prevents Copilot use entirely
- `NOCACHE` — limits Copilot to URLs/titles/snippets
- `DATA-NOSNIPPET` — may reduce citation quality

Bing's new abuse policies (2026):
- **Prompt Injection and AI Manipulation** — dedicated section, will demote
- **Keyword Stuffing and Artificially Engineered Language** — content designed to trigger AI citations is treated as spam
- Scaled machine-generated content "without oversight, quality control, or editorial review… may be excluded from indexing" *(softened from "malicious")*

Track citations: Bing Webmaster Tools → **AI Performance** report (public preview, Feb 2026). See [bing-webmaster](../bing-webmaster/SKILL.md).

#### ChatGPT Search (OpenAI)

- **Allow `OAI-SearchBot` in `robots.txt`** — opting out removes you from ChatGPT search answers entirely.
- Citation favors: structural clarity (headings, lists, FAQ), named entity density, passage extractability.
- ~44% of LLM citations come from the first 30% of the page — front-load the answer.
- Optimal cited passage is ~135–165 words, self-contained, fact-dense, directly answers a question.

#### Claude (Anthropic)

- Allow `Claude-SearchBot` and `Claude-User` for citation.
- No published ranking signals — Anthropic's stated principles: transparent, non-intrusive crawling that respects `robots.txt` and `Crawl-delay`.
- In practice: clean semantic HTML, traceable evidence, primary-source citations, declarative claims.

### 4. Universal GEO patterns (work across all engines)

| Pattern | Why it works |
|---|---|
| Answer-first format (TL;DR in first paragraph) | Front-loaded content gets cited disproportionately |
| One topic per URL | All four engines reward focus |
| Consistent entity naming | Disambiguation for retrieval models |
| Primary-source citations with links | E-E-A-T + traceable evidence |
| Specific numbers and dates | Higher extractability for snippet selection |
| Short paragraphs (2–3 sentences) | Better passage chunking |
| FAQ sections with `FAQPage` schema | Direct Q→A extraction |
| Visible last-updated timestamps | Freshness signal across engines |
| Author bios with credentials | E-E-A-T, particularly on YMYL topics |

### 5. Schema markup (JSON-LD)

Not required by Google for AI Overviews, but high-leverage for Bing/Copilot and rich results everywhere.

Priority types:
- `Article` / `WebPage` — every content page
- `FAQPage` — Q&A sections
- `HowTo` — tutorials
- `Product` + `Offer` + `AggregateRating` — commerce
- `Organization` / `LocalBusiness` — brand/local
- `BreadcrumbList` — navigation
- `Person` — author bios (E-E-A-T)
- `Dataset` — for data-driven content (Bing favors)

Validate: `https://search.google.com/test/rich-results?url={url}`

### 6. On-page meta

```html
<title>{Primary Keyword} — {Brand}</title>
<meta name="description" content="{150–160 chars, contains keyword, answer-first}">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<link rel="canonical" href="https://example.com/page/">
<meta property="og:title" content="{Title}">
<meta property="og:description" content="{Description}">
<meta property="og:image" content="{1200x630}">
<meta name="twitter:card" content="summary_large_image">
```

Checklist:
- One H1 with primary keyword
- Alt text descriptive (accessibility + image search)
- 3–5 internal links per page to topical cluster
- External links use `rel="noopener noreferrer"`
- URL short, hyphenated, lowercase
- Mobile-first responsive

### 7. International SEO

```html
<link rel="alternate" hreflang="en" href="https://example.com/en/" />
<link rel="alternate" hreflang="fr" href="https://example.com/fr/" />
<link rel="alternate" hreflang="x-default" href="https://example.com/" />
```

Bing supports `hreflang`; double-check via Bing Webmaster Tools.

### 8. Measurement

| Surface | Measurement |
|---|---|
| Google Search + AI Overviews | Search Console (Performance → "AI Overview" filter, where available) |
| Bing Copilot citations | Bing Webmaster Tools → **AI Performance** report |
| ChatGPT / Perplexity citations | Otterly, Profound, AthenaHQ, or referrer logs (`utm_source=chatgpt.com`, `perplexity.ai`) |
| Claude citations | Referrer logs (`claude.ai`) — no first-party dashboard |

## What changed from v2

- Dropped Princeton "9 GEO methods" boost percentages (single-study, not corroborated by 2026 vendor guidance).
- Replaced legacy crawler list (`anthropic-ai`, `claude-web`) with current Anthropic agents (`ClaudeBot`, `Claude-User`, `Claude-SearchBot`).
- Replaced FID with INP in Core Web Vitals.
- Added per-engine 2026 stance: Google rejects `llms.txt`, Bing formally adopts GEO, OpenAI gates citation on `OAI-SearchBot` access, Anthropic publishes three distinct crawlers.
- Added Bing's new abuse policies and meta-directive effects on Copilot.

## Sources

- Google: `developers.google.com/search/docs/fundamentals/ai-optimization-guide`
- Bing: `blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview`
- OpenAI: `developers.openai.com/api/docs/bots`, `help.openai.com` Publishers FAQ
- Anthropic: `support.claude.com/en/articles/8896518`

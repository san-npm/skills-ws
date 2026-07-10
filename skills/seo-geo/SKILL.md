---
name: seo-geo
description: "SEO + GEO (Generative Engine Optimization): technical audits, schema (JSON-LD), Core Web Vitals (LCP/INP/CLS), E-E-A-T, hreflang, and AI-search citation tuning for Google AI Overviews/AI Mode, Bing Copilot, ChatGPT Search, Claude, Perplexity, Gemini. Primary-source crawler + robots.txt rules. Use when improving search visibility, AI citations, indexing, meta tags, structured data, keyword clustering, or competitor analysis."
---

# SEO & GEO Optimization v3 (2026)

**GEO = Generative Engine Optimization** — get *cited* by AI engines, not just ranked. Each engine has a different stance; optimize for the union, not a single playbook.

## What the engines actually say (2026)

| Engine | Source of truth | Position summary |
|---|---|---|
| Google AI Overviews / AI Mode | `developers.google.com/search/docs/fundamentals/ai-optimization-guide` (and `…/docs/appearance/ai-features`) | Built into the same index as Search; AI features draw from it via RAG + query fan-out. Standard SEO applies. **Structured data not required.** Explicitly says you don't need `llms.txt`, AI-specific markup, content "chunking," or "AI rewrites." |
| Bing Copilot | Bing Webmaster blog + updated webmaster guidelines (verify at `blogs.bing.com/webmaster`) | Formally names **GEO**. Wants clear facts, consistent entities, one topic per URL, key info near top, IndexNow for freshness, valid schema. New abuse policies on prompt injection and "artificially engineered language." Schema is helpful but **not a guaranteed ranking lever** — treat citation-rate gains as observational, not promised. |
| ChatGPT Search | `developers.openai.com/api/docs/bots` + Publishers FAQ (`help.openai.com`) | "Sites that are opted out of OAI-SearchBot will not be shown in ChatGPT search answers." Standard SEO + crawler access. Citation favors structural clarity and named-entity density. |
| Claude | `support.claude.com/en/articles/8896518` | Three crawlers: `ClaudeBot` (training), `Claude-User` (user-directed fetch), `Claude-SearchBot` (search grounding). **All three honor `robots.txt`.** No public ranking guidance — quality + accessibility are the levers. |

## Workflow

### 1. Technical SEO audit

```bash
URL="https://example.com"            # page under audit
ORIGIN="https://example.com"         # site root

# Head tags + JSON-LD presence
curl -sL "$URL" | grep -Eio '<title>[^<]*</title>|<meta name="description"[^>]*>|<link rel="canonical"[^>]*>|application/ld\+json'

# robots.txt + sitemap reachability (expect 200)
curl -s -o /dev/null -w '%{http_code} robots.txt\n' "$ORIGIN/robots.txt"
curl -s -o /dev/null -w '%{http_code} sitemap.xml\n' "$ORIGIN/sitemap.xml"
curl -s "$ORIGIN/robots.txt"

# List every <loc> in the sitemap (handles sitemap-index too)
curl -s "$ORIGIN/sitemap.xml" | grep -Eo '<loc>[^<]+</loc>' | sed -E 's/<\/?loc>//g'

# Indexability signals: status, x-robots-tag header, meta robots
curl -sIL "$URL" | grep -iE 'HTTP/|x-robots-tag'
curl -sL "$URL" | grep -Eio '<meta name="robots"[^>]*>'
```

**Crawler-eye check** — fetch as each bot to catch UA-based cloaking or 403s, then validate JSON-LD and the canonical tag:

```bash
for UA in \
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" \
  "Mozilla/5.0 (compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)" \
  "Mozilla/5.0 (compatible; ClaudeBot/1.0; +https://www.anthropic.com/claude-bot)" \
  "Mozilla/5.0 (compatible; Claude-SearchBot/1.0; +https://www.anthropic.com/claude-searchbot)" \
  "Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)"; do
  code=$(curl -s -A "$UA" -o /dev/null -w '%{http_code}' "$URL")
  echo "$code  ${UA%% *}"
done

# Extract and pretty-print JSON-LD blocks (needs python3)
curl -sL "$URL" | python3 - <<'PY'
import sys, re, json
html = sys.stdin.read()
for m in re.findall(r'<script[^>]+application/ld\+json[^>]*>(.*?)</script>', html, re.S|re.I):
    try: print(json.dumps(json.loads(m), indent=2)[:800])
    except Exception as e: print("INVALID JSON-LD:", e)
PY
```

Then run these hosted validators on the page:
- Rich Results / schema: `https://search.google.com/test/rich-results`
- Schema.org validator: `https://validator.schema.org/`
- Robots parsing: Search Console's **robots.txt report** (shows fetch status, parse errors, 30-day version history) plus the URL Inspection tool for per-URL blocking checks; for offline testing use Google's open-source robots.txt parser library. (The old standalone robots.txt Tester was retired.)

**Log analysis** — confirm which AI/search bots actually crawl you (Apache/nginx combined logs):

```bash
# Hit counts per known bot UA, last N lines
grep -aiE 'Googlebot|Bingbot|OAI-SearchBot|GPTBot|ChatGPT-User|ClaudeBot|Claude-SearchBot|Claude-User|PerplexityBot|Perplexity-User|Google-Extended' access.log \
  | grep -oiE 'Googlebot|Bingbot|OAI-SearchBot|GPTBot|ChatGPT-User|ClaudeBot|Claude-SearchBot|Claude-User|PerplexityBot|Perplexity-User|Google-Extended' \
  | sort | uniq -c | sort -rn
```

Verify a claimed bot is genuine (not a spoofed UA) by reverse-DNS or matching its published IP ranges (see §2), since the UA string alone is trivially forged.

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
User-agent: Google-Extended        # Gemini training + grounding (NOT Googlebot)
User-agent: CCBot                  # Common Crawl

Sitemap: https://example.com/sitemap.xml
```

**Key distinctions:**
- Blocking `GPTBot` does **not** block ChatGPT citations — those use `OAI-SearchBot`.
- Blocking `ClaudeBot` does **not** block Claude search — that uses `Claude-SearchBot`. Blocking it also doesn't block `Claude-User` retrieval; control each token separately.
- Blocking `Google-Extended` does **not** affect Google Search ranking; it controls use of your content for Gemini model training and for grounding in Gemini Apps and Vertex AI (Grounding with Google Search). AI Overviews/AI Mode are governed by `Googlebot` (there is no separate AI-features opt-out crawler).
- **User-directed fetchers behave differently, so verify per vendor.** Anthropic states all three of its bots, including `Claude-User` (user-directed), *honor `robots.txt`*. OpenAI states `ChatGPT-User` is user-initiated and *"robots.txt rules may not apply"*, so a `robots.txt` block is **not** a reliable way to stop it; use server-side rules (status 403 / WAF / firewall by IP range) if you must block it. Perplexity's `Perplexity-User` likewise generally ignores robots.txt because a user requested the fetch; block server-side by IP range if needed.

**Current bot reference (as of Jun 2026 — recheck the vendor docs/IP files below before shipping):**

| Vendor | User-agent token | Purpose | Honors robots.txt? |
|---|---|---|---|
| Google | `Googlebot` | Search index (and AI Overviews / AI Mode) | Yes |
| Google | `Google-Extended` | Gemini training + grounding opt-out token (not a crawler UA) | Yes |
| Bing / Microsoft | `Bingbot` | Search index + Copilot grounding | Yes |
| OpenAI | `OAI-SearchBot` | ChatGPT search citations | Yes |
| OpenAI | `GPTBot` | Model training | Yes |
| OpenAI | `ChatGPT-User` | User-initiated fetch (links/Actions) | **May not** — user-initiated |
| OpenAI | `OAI-AdsBot` | Ad landing-page validation | Yes |
| Anthropic | `ClaudeBot` | Model training | Yes |
| Anthropic | `Claude-SearchBot` | Search grounding | Yes |
| Anthropic | `Claude-User` | User-directed fetch | Yes |
| Perplexity | `PerplexityBot` | Search index/citations | Yes (declared) |
| Perplexity | `Perplexity-User` | User-initiated fetch | **Generally ignores** robots.txt |
| Common Crawl | `CCBot` | Open crawl corpus | Yes |

Verify crawler IP ranges (official JSON files):
- OpenAI: `https://openai.com/searchbot.json`, `https://openai.com/gptbot.json`, `https://openai.com/chatgpt-user.json`
- Anthropic: `https://claude.com/crawling/bots.json`
- Google: `https://developers.google.com/static/search/apis/ipranges/googlebot.json`
- Bing: `https://www.bing.com/toolbox/bingbot.json`
- Perplexity: `https://www.perplexity.com/perplexitybot.json`, `https://www.perplexity.com/perplexity-user.json`

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
- **Schema markup**: not officially mandated, but Bing recommends valid structured data. Treat any "schema lifts citation rate N×" figures as third-party/observational, not a guarantee — ship schema because it earns rich results and disambiguates entities, not for a promised multiplier.

Snippet/cache controls that affect Copilot (these are two different mechanisms — don't conflate them):
- **Robots `meta`/`X-Robots-Tag` directives** (case-insensitive): `noarchive` prevents Copilot use entirely; `nocache` limits Copilot to URLs/titles/snippets; `nosnippet` / `max-snippet:N` cap the text that can be quoted.
- **The `data-nosnippet` HTML attribute** (lowercase, on a `span`/`div`/`section`) — excludes just that element's text from snippets/AI quoting. It is an HTML attribute, **not** a robots meta directive, and there is no `DATA-NOSNIPPET` meta tag.

Bing's new abuse policies (2026):
- **Prompt Injection and AI Manipulation** — dedicated section, will demote
- **Keyword Stuffing and Artificially Engineered Language** — content designed to trigger AI citations is treated as spam
- Scaled machine-generated content "without oversight, quality control, or editorial review… may be excluded from indexing" *(softened from "malicious")*

Track citations: Bing Webmaster Tools → **AI Performance** report (rolling out in preview as of early-to-mid 2026; availability and exact metrics are evolving — verify in your own BWT account). See [bing-webmaster](../bing-webmaster/SKILL.md).

#### ChatGPT Search (OpenAI)

- **Allow `OAI-SearchBot` in `robots.txt`** — opting out removes you from ChatGPT search answers entirely (per OpenAI's Publishers FAQ).
- Citation favors: structural clarity (headings, lists, FAQ), named-entity density, and passage extractability.
- **Front-load the answer.** A self-contained, fact-dense answer in the opening paragraph/section is more quotable than one buried below the fold. (You'll see vendor blog figures like "~X% of citations come from the top of the page" or "ideal passages are ~150 words" — these are third-party observations, not OpenAI guidance, so don't treat them as fixed targets; the durable rule is *lead with the answer in a short, standalone passage*.)

#### Claude (Anthropic)

- Allow `Claude-SearchBot` (search grounding) and `Claude-User` (user-directed fetch) for citation; both honor `robots.txt`.
- No published ranking signals — Anthropic's stated principle is transparent crawling that honors industry-standard `robots.txt` directives.
- In practice: clean semantic HTML, traceable evidence, primary-source citations, declarative claims.

### 4. Universal GEO patterns (work across all engines)

| Pattern | Why it works |
|---|---|
| Answer-first format (TL;DR in first paragraph) | A standalone answer up top is easy for a model to lift verbatim as a citation |
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
- `target="_blank"` links carry `rel="noopener"` (security; modern browsers imply it but set it explicitly). Add `nofollow`/`sponsored`/`ugc` per link intent. Avoid blanket `noreferrer` — it strips the `Referer` header and breaks referral attribution in your and the destination's analytics.
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
| Google Search | Search Console → Performance (Search results). Use the AI-powered configuration / filters for queries, pages, country, device, appearance. |
| Google AI Overviews / AI Mode | Search Console → **Generative AI performance report** (rolling out from ~mid-2026; `support.google.com/webmasters/answer/16984139`). Reports impressions + pages for generative-AI features; **AI Overviews and AI Mode are not separable**, and it currently shows **no click data**. Don't promise click-level AI attribution from GSC. |
| Bing Copilot citations | Bing Webmaster Tools → **AI Performance** report (preview — verify availability) |
| ChatGPT / Perplexity citations | Referrer logs (`utm_source=chatgpt.com`, `referrer: perplexity.ai`) or third-party trackers (Otterly, Profound, AthenaHQ). Treat third-party tools as estimates. |
| Claude citations | Referrer logs (`claude.ai`) — no first-party dashboard |

## What changed from v2

- Dropped Princeton "9 GEO methods" boost percentages (single-study, not corroborated by 2026 vendor guidance).
- Replaced legacy crawler list (`anthropic-ai`, `claude-web`) with current Anthropic agents (`ClaudeBot`, `Claude-User`, `Claude-SearchBot`).
- Replaced FID with INP in Core Web Vitals.
- Added per-engine 2026 stance: Google says no `llms.txt`/special markup needed, Bing formally adopts GEO, OpenAI gates citation on `OAI-SearchBot` access, Anthropic publishes three distinct crawlers.
- Added Bing's new abuse policies and corrected the snippet/cache controls (separated robots `noarchive`/`nocache`/`nosnippet` directives from the lowercase `data-nosnippet` HTML attribute).
- Corrected user-directed fetcher nuance: `Claude-User` honors `robots.txt`; `ChatGPT-User` may not (block server-side if needed).
- Removed un-sourced citation-rate / passage-length statistics in favor of defensible heuristics and a date-qualified Search Console Gen-AI report.

## Sources (verify before quoting numbers — AI features evolve fast)

- Google (GEO guide): `https://developers.google.com/search/docs/fundamentals/ai-optimization-guide`
- Google (AI features & your site): `https://developers.google.com/search/docs/appearance/ai-features`
- Google (Gen-AI performance report): `https://support.google.com/webmasters/answer/16984139` and `https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports`
- Google (snippet controls / `data-nosnippet`): `https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag`
- Bing Webmaster blog + guidelines: `https://blogs.bing.com/webmaster`
- OpenAI crawlers: `https://developers.openai.com/api/docs/bots`; Publishers FAQ: `https://help.openai.com` ; IP files: `https://openai.com/searchbot.json`, `gptbot.json`, `chatgpt-user.json`
- Anthropic crawlers: `https://support.claude.com/en/articles/8896518` ; IP file: `https://claude.com/crawling/bots.json`

---
name: yandex-webmaster
description: "Yandex Webmaster setup, Yandex-specific SEO, regional/geo targeting, Site Quality Index (SQI/ИКС), commercial factors, and Webmaster API v4 for the Russian/CIS market. Use when verifying a site in Yandex, ranking on Yandex (vs Google), targeting Russian regions, auditing commercial factors, or pulling indexing/query data via the API."
---

# Yandex Webmaster

Yandex is the dominant engine in Russia and a major one across the CIS, Belarus, Kazakhstan, and parts of Central Asia. Its ranking model differs enough from Google that a Google-only SEO plan underperforms there. This skill covers the Yandex Webmaster console, the Webmaster API v4, and the Yandex-specific ranking levers (geo, commercial factors, behavioral signals, SQI). For the Google side of a multi-engine site, pair this with the `search-console` skill — don't duplicate Google work here; this file is the delta for Yandex.

> Console UI labels and API field names below are current as of Jun 2026. Yandex revises both periodically — verify exact menu paths at the official help (`yandex.com/support/webmaster/en/`) and API contracts at `yandex.com/dev/webmaster/doc/en/`.

## Quick orientation: Yandex vs Google

| Factor | Google | Yandex |
|--------|--------|--------|
| Backlinks | Primary signal | Important but less dominant; editorial/topical links weighted, link-spam aggressively filtered |
| Text relevance | Semantic, embeddings-based | More literal lexical matching + Cyrillic morphology (cases, declensions) |
| Commercial factors | Implicit quality cues | **Explicit** ranking factors for commercial queries (prices, contacts, delivery, assortment) |
| User behavior | Moderate signal | **Heavy** signal — CTR in SERP, dwell time, pogo-sticking, last-click satisfaction |
| Regional targeting | IP + hreflang heuristics | **Explicit** region assignment per site/subdomain + Yandex Business listing |
| Site quality | No public number | **SQI** (Site Quality Index / ИКС) shown in Webmaster, recalculated ~monthly |
| Ecosystem | Standalone | Maps, Business, Market, Dzen feed presence factor into trust |

Practical implication: in Yandex you optimize the *page-in-SERP experience* (title/snippet CTR, fast satisfying landing) and the *commercial completeness* of pages, not just on-page text and links.

## 1. Add a site & verify ownership

Add the site in Yandex Webmaster, then verify management rights using one of the **three current methods** (as of Jun 2026):

| Method | How | Notes |
|--------|-----|-------|
| **HTML file (recommended)** | Download the `yandex_<code>.html` file Yandex generates and place it in the site root: `https://example.com/yandex_<code>.html` | Most reliable; survives DNS/CMS changes |
| **Meta tag** | Add to the `<head>` of the home page: `<meta name="yandex-verification" content="<code>" />` | Verify the tag is server-rendered, not injected after a JS hydration the crawler may not run |
| **DNS TXT record** | Add a TXT record with the value Yandex provides at the domain apex | Good for root-domain ownership; DNS propagation can take hours |

Some CMS/hosting integrations and a connected provider account can verify rights where supported, but **WHOIS-email verification is not a Yandex method** — do not rely on it. After verification a host shows `"verified": true` in the API (see §8).

Verification is per **host** (a `protocol://domain:port` triple). `https://example.com`, `https://www.example.com`, and `https://shop.example.com` are distinct hosts — verify each one you manage.

## 2. Post-verification setup

- **Sitemap:** Indexing → Sitemap files → add the sitemap URL. Yandex supports standard XML sitemaps and sitemap index files; keep `<lastmod>` accurate (Yandex uses it for recrawl prioritization).
- **Main mirror (canonical host):** Indexing → Site relocation / Main mirror — pick `www` vs non-`www` and `http` vs `https`. Set this once; flapping it resets accumulated signals. Back it with a 301 from the non-canonical host and a self-referential `rel=canonical`.
- **robots.txt:** Yandex obeys `Disallow`/`Allow` and historically supported a `Clean-param:` directive to collapse tracking/GET parameters and a `Host:` directive (now superseded by the Main-mirror setting + 301s). Prefer the GET-parameters tool (below) over `Clean-param` for new setups.
- **GET parameters configuration:** Indexing → GET parameters — declare which URL parameters (e.g. `utm_*`, `sort`, `sessionid`) should be ignored so parameterized URLs aren't crawled as duplicates. This replaces a lot of old `Clean-param` guesswork. (Menu path/availability as of Jun 2026; confirm at `yandex.com/support/webmaster/en/`.)
- **Crawl rate:** Indexing → Crawl rate — leave on "Trust Yandex" unless the bot overloads the origin.
- **Regional targeting:** see §4.

## 3. Commercial ranking factors (high-leverage for RU ecommerce/local)

For commercial/transactional queries Yandex explicitly rewards "commercial completeness." Audit every money page against this:

| Factor | Implementation |
|--------|----------------|
| Contact information | Real address, phone (RU format), email — in the header/footer **and** on contact + product pages |
| Visible prices | Show prices on product/service pages; avoid "call for price" for in-stock items |
| Delivery & payment terms | Clear delivery options, costs, regions, returns; visible payment methods |
| Legal/company details | Legal entity name, ОГРН/ИНН (registration numbers), requisites page |
| Reviews/ratings | On-site reviews + ratings; reinforce with Yandex Business reviews (§4) |
| Assortment breadth | Deeper catalog/category coverage reads as stronger commercial intent match |
| Trust & security | Valid TLS, no mixed content, security/payment badges, working cart/checkout |
| Structured data | `Organization`, `Product` (with `offers`/`AggregateRating`), `BreadcrumbList`, `LocalBusiness` |

These are about being a *complete, trustworthy commercial entity*, not keyword tricks — they're hard to fake and that's the point.

## 4. Regional & geo targeting

Yandex is geo-dependent by design: the same query returns different SERPs by region. Get region assignment right or local visibility collapses.

**Set the site region:** Yandex Webmaster → Site information → Region (region of the site). You can also tie regions to the matching Yandex Business listing. Assignment is reviewed by Yandex and must be justified by the site's actual content/location.

**Granularity — what carries a region:**
- **Site / host:** the primary region applies to the whole verified host.
- **Subdomain (preferred for multi-region):** give each city its own subdomain — `spb.example.com`, `msk.example.com` — and assign each its region. Subdomains are separate hosts: **verify and configure each**.
- **Directory/section** (`/spb/`, `/msk/`): workable but weaker and harder to disambiguate than subdomains; lean on `LocalBusiness` structured data + a Yandex Business listing per location.
- **Page-level:** signaled mainly via on-page address/phone + `LocalBusiness`/`PostalAddress` schema, not a Webmaster toggle.

**Content rule (critical):** regional subdomains/sections **must have genuinely different content** (local address, phone, stock, delivery, pricing). If two hosts are near-identical, Yandex treats one as an alternate mirror and **drops it from search**. Cookie-cutter "city-swap" pages are the #1 way multi-region setups fail in Yandex.

**Yandex Business (formerly Yandex Sprav / Yandex Directory):** register every physical location in Yandex Business. It feeds Maps and the local SERP/organization card, supplies verified geo coordinates, hours, and reviews, and is a real local-ranking input — often more impactful than on-site geo tags for "near me"-style queries. Keep NAP (name/address/phone) identical between the site and the listing.

Note: multi-region assignment through the old Yandex Catalog no longer applies (Catalog is discontinued); use subdomains + Yandex Business listings instead.

## 5. Mobile & page experience (Turbo Pages are discontinued)

**Turbo Pages: historical only.** Turbo Pages were Yandex's AMP-style fast-mobile format. **Yandex discontinued Turbo Pages** (the Yandex Webmaster changelog lists Turbo pages as discontinued on April 1, 2025). Do **not** build Turbo RSS feeds or `turbo:content` markup for new work, and ignore legacy claims like "15x faster" or "higher mobile position via Turbo." If you have legacy Turbo feeds, treat them as deprecated and migrate to a fast responsive site. (Verify status in the Webmaster changelog at `yandex.com/support/webmaster/en/service/about`.)

**What to do instead in 2026** — optimize the real site:
- Responsive, mobile-first layout; no separate `m.` site unless already established (and if so, configure it as a mobile mirror, not a duplicate).
- Fast **Core Web Vitals** — Yandex factors load speed and stability into ranking and the behavioral signals it weighs heavily. Target good LCP/INP/CLS; minimize TTFB from RU-reachable infrastructure (see §9 on data residency).
- Clean, server-rendered HTML for primary content — don't depend on client-side JS the crawler may not execute for critical text/links.
- Rich snippets via structured data (`Product`, `Recipe`, `FAQPage` where genuinely applicable, `BreadcrumbList`) to win SERP real estate and CTR — the lever Turbo used to provide now comes from a fast page + good snippets.

## 6. SQI — Site Quality Index (ИКС)

**SQI (Site Quality Index; Russian ИКС — Индекс качества сайта)** is Yandex's public site-quality number, shown in Webmaster. It **replaced the old Citation Index (тИЦ / TCI) in 2018** — if a source talks about "тИЦ" or "Index of Citation," it's outdated. SQI is `int32` in the API (`sqi`) and recalculated roughly **monthly**.

**What feeds SQI (per Yandex, 2024–2026 emphasis):**
- Audience size and loyalty (returning users, brand/navigational demand for your name).
- User satisfaction / behavioral quality (dwell, task completion, low pogo-sticking).
- Trust signals — content quality, technical health, natural (editorial) links.
- Presence and consistency across the Yandex ecosystem (Maps/Business, Market, Dzen).

**Reality check:** SQI reflects systemic quality and **cannot be moved by one-off tricks**. Buying links or faking engagement to lift SQI does not work and risks penalties (see §10). Track the *trend*, not the absolute number, and treat it as a lagging health metric.

**Check it:** Yandex Webmaster → Site quality (Quality indicators), or read `sqi` from the API summary (§8).

## 7. Yandex-specific meta & markup

```html
<!-- Ownership verification (see §1) -->
<meta name="yandex-verification" content="<code>" />

<!-- Indexing control: Yandex honors standard robots directives -->
<meta name="robots" content="index, follow" />
<!-- Yandex-specific equivalents if you need engine-targeted rules: -->
<!-- <meta name="yandex" content="noindex, nofollow" />  (block just Yandex) -->
<!-- <meta name="yandex" content="all" />                 (allow indexing+following) -->

<!-- Canonical + language/region for multi-locale sites -->
<link rel="canonical" href="https://example.com/page" />
<link rel="alternate" hreflang="ru-RU" href="https://example.com/page" />
<link rel="alternate" hreflang="x-default" href="https://example.com/page" />
```

Removed/legacy tags — do **not** use:
- `<meta name="yandex" content="noyaca">` — this controlled whether Yandex replaced your snippet with a **Yandex Catalog** description. Yandex Catalog is discontinued, so `noyaca` is obsolete and harmless-but-pointless. Drop it.
- Turbo (`turbo:*`) markup — see §5.

For syndicated/duplicated content, prefer a proper `rel=canonical` to the original over ad-hoc source meta tags; for original authorship use the Webmaster "Original texts" tool if available for your account rather than non-standard `article:source` markup.

## 8. Yandex Webmaster API v4 (end-to-end)

Base URL: `https://api.webmaster.yandex.net/v4`. Auth: OAuth token via `Authorization: OAuth <token>` (create an app and token through Yandex OAuth; never hard-code the token — read it from an env var/secret store). All host-scoped calls need **both** the numeric `user-id` and the string `host-id`.

**Step 0 — get your user-id and discover host-ids.** You don't know `host_id` upfront; you must list hosts. `host_id` is **not a URL** — it's a `protocol:domain:port` triple with **colons, no slashes** (e.g. `https:example.com:443`, `http:ya.ru:80`). Always copy it verbatim from the hosts response.

```python
import os, requests

TOKEN = os.environ["YANDEX_OAUTH_TOKEN"]          # never hard-code
BASE = "https://api.webmaster.yandex.net/v4"
H = {"Authorization": f"OAuth {TOKEN}"}

# 0a. user-id (required for every host-scoped call)
user_id = requests.get(f"{BASE}/user", headers=H).json()["user_id"]

# 0b. list verified/added hosts and grab the exact host_id strings
hosts = requests.get(f"{BASE}/user/{user_id}/hosts", headers=H).json()["hosts"]
for h in hosts:
    print(h["host_id"], h["unicode_host_url"], "verified:", h["verified"])
# e.g. -> "https:example.com:443  https://example.com/  verified: True"

host_id = hosts[0]["host_id"]   # use this verbatim below (colon-delimited)
```

**Step 1 — site summary: SQI, indexed pages, problem counts.**

```python
s = requests.get(f"{BASE}/user/{user_id}/hosts/{host_id}/summary", headers=H).json()
print("SQI:", s["sqi"])                                  # int32 Site Quality Index
print("in search:", s["searchable_pages_count"])
print("excluded:", s["excluded_pages_count"])
print("problems:", s["site_problems"])  # {FATAL, CRITICAL, POSSIBLE_PROBLEM, RECOMMENDATION: count}
```

**Step 2 — diagnostics (errors vs recommendations).** The diagnostics tool splits issues into errors and recommendations with severities `FATAL`, `CRITICAL`, `POSSIBLE_PROBLEM`, `RECOMMENDATION` (same buckets as `site_problems` in the summary above).

```python
diag = requests.get(f"{BASE}/user/{user_id}/hosts/{host_id}/diagnostics", headers=H).json()
for ptype, p in diag.get("problems", {}).items():
    print(p.get("severity"), ptype, p.get("state"))
```

**Step 3 — popular search queries (CTR is the lever to optimize).**

```python
r = requests.get(
    f"{BASE}/user/{user_id}/hosts/{host_id}/search-queries/popular",
    headers=H,
    params={
        "order_by": "TOTAL_SHOWS",
        "query_indicator": ["TOTAL_SHOWS", "TOTAL_CLICKS", "AVG_SHOW_POSITION", "AVG_CLICK_POSITION"],
        "date_from": "2026-05-01", "date_to": "2026-05-31",
    },
)
for q in r.json().get("queries", []):
    ind = q["indicators"]
    print(q["query_text"], ind.get("TOTAL_SHOWS"), ind.get("TOTAL_CLICKS"), ind.get("AVG_SHOW_POSITION"))
```

**Step 4 — force a recrawl (rate-limited daily quota).** Check quota first; the daily allowance is small, so spend it on high-value URLs.

```python
# remaining daily reindex quota
quota = requests.get(f"{BASE}/user/{user_id}/hosts/{host_id}/recrawl/quota", headers=H).json()
print("daily quota:", quota.get("daily_quota"), "remaining:", quota.get("quota_remainder"))

# submit one URL for reindexing (POST)
resp = requests.post(
    f"{BASE}/user/{user_id}/hosts/{host_id}/recrawl/queue",
    headers=H,
    json={"url": "https://example.com/important-updated-page"},
)
print(resp.status_code, resp.json())   # returns a task_id; poll .../recrawl/queue/{task_id}
```

Other useful host-scoped resources (same `…/hosts/{host_id}/<suffix>` pattern): `sitemaps`, `indexing/history`, `search-urls/in-search/history`, `search-urls/in-search/samples`, `search-urls/events/samples`, `links/external/samples`, `links/internal/broken/samples`, `sqi-history`. Treat exact field names as authoritative only at `yandex.com/dev/webmaster/doc/en/`.

## 9. Russian-market specifics

- **Cyrillic morphology:** Russian inflects heavily (cases, gender, number). Yandex matches morphological forms, but write naturally in the forms users actually search; don't keyword-stuff every declension. Use real Russian, not transliteration.
- **Punycode/IDN:** `.рф` and Cyrillic domains appear in the API as both `ascii_host_url` (punycode `xn--…`) and `unicode_host_url`. Match `host_id` by the value Yandex returns.
- **Duplicate handling:** Yandex is strict about near-duplicates and mirrors. Set the main mirror, 301 alternates, declare GET parameters, and ensure regional pages differ materially (§4).
- **Data residency / reachability (152-ФЗ):** Russian personal-data law requires personal data of Russian citizens to be stored on servers located in Russia. If you collect RU user data, account for this; also ensure your origin is reliably reachable from Russia (latency/blocklists affect both UX and the speed/behavioral signals Yandex weighs). This is a legal matter — **confirm specifics with qualified counsel**, not this skill.
- **Sanctions/operational caveat (as of Jun 2026):** sanctions and platform restrictions affect access to Yandex ad/analytics products, payment rails, and account onboarding for some entities and jurisdictions. Verify current availability and compliance for your organization before investing in the channel; do not assume Google-equivalent access.

## 10. Safety — what NOT to do (Yandex penalizes hard)

Yandex's behavioral-factor weighting makes it a frequent target for manipulation, and Yandex actively detects and demotes it. Avoid:
- **Behavioral-factor manipulation** — bot click farms, CTR-boosting services, fake "task completion" traffic. Long-running Yandex spam target; detection leads to ranking suppression or de-indexing.
- **Paid link networks / link schemes** — Yandex filters and can penalize unnatural link profiles; editorial relevance beats volume.
- **Cloaking / doorways** — serving different content to Yandexbot than to users, or thin city-swap doorway pages (also fails the §4 content rule).
- **Fake reviews/ratings** — fabricated on-site or Yandex Business reviews risk listing penalties and erode the trust signals SQI depends on.

Compete on commercial completeness (§3), genuine local presence (§4), fast satisfying pages (§5), and real authority (§6) — those are the durable Yandex levers.

## Monthly audit checklist

- [ ] Indexing: pages in search vs excluded (`summary`); investigate spikes in `excluded_pages_count`
- [ ] Diagnostics: clear all `FATAL`/`CRITICAL`, triage `POSSIBLE_PROBLEM`
- [ ] SQI trend (not absolute) — flag sustained drops
- [ ] Top queries: shows/clicks/avg position; fix low-CTR high-impression titles & snippets
- [ ] Regional targeting correct per host/subdomain; Yandex Business listings accurate (NAP, hours, reviews)
- [ ] Commercial factors present on money pages (prices, contacts, delivery, requisites, structured data)
- [ ] Core Web Vitals / mobile experience healthy; origin reachable from RU
- [ ] Main mirror + GET-parameter config still correct after any site changes
- [ ] Recrawl quota spent on high-value updated URLs
- [ ] Cross-check Yandex vs Google performance for priority queries (use the `search-console` skill for the Google side)

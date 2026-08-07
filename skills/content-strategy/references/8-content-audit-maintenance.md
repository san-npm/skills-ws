## Contents

- 8. Content Audit & Maintenance
- Build the inventory (real tools, real steps)
- Runnable: join a crawl export with GSC clicks to triage
- Maintenance cadence

## 8. Content Audit & Maintenance

Audit to decide, per URL: **keep / optimize / consolidate / rewrite / prune**. Pull inventory + metrics, score with §4, act by band.

### Build the inventory (real tools, real steps)

1. **URL list** — `sitemap.xml`, or crawl with Screaming Frog (free up to 500 URLs) / Sitebulb to also capture titles, word count, status codes, indexability.
2. **Performance** — Search Console "Pages" (clicks, impressions, position) and GA4 (engaged sessions, conversions). Pull a 16-month GSC window to see trend, not a snapshot.
3. **Indexation** — flag URLs not indexed (GSC URL Inspection / Pages report); decide index vs no-index vs redirect.
4. **Score** — apply the §4 rubric; sort by band.

### Runnable: join a crawl export with GSC clicks to triage

```python
#!/usr/bin/env python3
"""Triage a content inventory: crawl export (Screaming Frog) + GSC pages export.
Outputs a keep/optimize/consolidate/prune recommendation per URL.
- crawl.csv  : Screaming Frog 'Internal > HTML' export (cols: Address, Word Count, Indexability)
- gsc.csv    : Search Console 'Pages' export (cols: Top pages/Page, Clicks, Impressions, Position)
"""
import csv, sys

def load(p):
    with open(p, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))

def num(x, d=0):
    try: return float(str(x).replace(",", ""))
    except (TypeError, ValueError): return d

crawl = {r["Address"].rstrip("/"): r for r in load(sys.argv[1])}
gsc = {}
for r in load(sys.argv[2]):
    url = (r.get("Page") or r.get("Top pages") or "").rstrip("/")
    if url:
        gsc[url] = r

for url, c in crawl.items():
    g = gsc.get(url, {})
    clicks = num(g.get("Clicks"))
    impr   = num(g.get("Impressions"))
    pos    = num(g.get("Position"), 999)
    words  = num(c.get("Word Count"))
    # Screaming Frog emits exactly "Indexable" / "Non-Indexable" — match exactly,
    # NOT substring (`"indexable" in "non-indexable"` is True and would mis-pass).
    indexable = c.get("Indexability", "").strip().lower() == "indexable"

    if not indexable:
        rec = "review-indexation"
    elif clicks == 0 and impr < 50:
        rec = "PRUNE/redirect (no demand, no clicks)"
    elif impr >= 100 and pos > 10:
        rec = "OPTIMIZE (demand exists, ranking page 2+)"   # quick win
    elif clicks > 0 and words < 600:
        rec = "EXPAND/REWRITE (thin but converting)"
    elif clicks > 0:
        rec = "KEEP (refresh on cadence)"
    else:
        rec = "CONSOLIDATE candidate (low signal)"
    print(f"{rec:42}  clk={clicks:<5.0f} impr={impr:<6.0f} pos={pos:<5.0f} w={words:<5.0f} {url}")
```

> "Quick wins" = URLs with impressions but position 11-20: small edits (better title/intro answer, internal links, refreshed facts) often move them onto page 1. The `search-console` skill's quick-win detection automates surfacing these.

### Maintenance cadence

| Cadence | Tasks |
|---|---|
| **Weekly** | Watch new-post performance; ship scheduled distribution/repurposing; fix broken links on recent posts; reply to comments |
| **Monthly** | Review GSC/GA4 trends; promote quick-win URLs (pos 11-20); refresh CTAs/offers; re-run §3 query-class tests for money topics |
| **Quarterly** | Full audit (score every URL with §4); refresh every pillar (dates, stats, screenshots, last-reviewed); competitor + AI-citation gap pass (§6); consolidate/prune the `<40` band |
| **Annually** | Full inventory recategorization; cluster restructure; channel-relevance review (kill dead channels); content ROI/attribution review |

---

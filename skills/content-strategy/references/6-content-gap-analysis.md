## Contents

- 6. Content Gap Analysis
- Inputs
- Runnable: keyword gap from CSV exports
- Prioritization framework

## 6. Content Gap Analysis

Find what competitors rank/get-cited for that you don't, then prioritize by winnability × value. This is an analyst workflow with real tools, not a black-box function.

### Inputs

- **Your ranking keywords + positions** — Search Console (`search-console` skill) or Ahrefs/Semrush "Organic keywords".
- **Competitor ranking keywords** — Ahrefs/Semrush "Site Explorer" per competitor; export to CSV.
- **AI-answer gaps** — run the §3 query-class prompts for your money topics; log where a competitor is cited and you're absent.
- **SERP feature gaps** — for your target terms, note which features (AIO, snippet, video, PAA) you're missing.

### Runnable: keyword gap from CSV exports

This uses your own exported CSVs (no fictional API). Export "Organic keywords" for yourself and each competitor from your SEO tool, then:

```python
#!/usr/bin/env python3
"""Keyword gap analysis from Ahrefs/Semrush CSV exports.
Usage: python gap.py ours.csv comp1.csv comp2.csv ...
Each CSV must contain columns: Keyword, Volume, KD (Difficulty), Current position (theirs).
Column names below match Ahrefs 'Organic keywords' export; adjust if using Semrush."""
import csv, sys

KW, VOL, KD, POS = "Keyword", "Volume", "KD", "Current position"

def load(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))

ours = {r[KW].strip().lower() for r in load(sys.argv[1])}
gaps = {}
for comp_path in sys.argv[2:]:
    for r in load(comp_path):
        kw = r[KW].strip().lower()
        if kw in ours or not kw:
            continue
        try:
            pos = float(r.get(POS) or 999)
        except ValueError:
            pos = 999
        if pos > 10:                      # only count where they actually rank
            continue
        vol = int((r.get(VOL) or "0").replace(",", "") or 0)
        kd  = int((r.get(KD) or "100").replace(",", "") or 100)
        # winnability: high volume, low difficulty rises to the top
        score = round(vol / (kd + 1), 1)
        cur = gaps.get(kw)
        if not cur or score > cur["score"]:
            gaps[kw] = {"keyword": kw, "volume": vol, "kd": kd,
                        "best_competitor_pos": pos, "score": score,
                        "source": comp_path}

for g in sorted(gaps.values(), key=lambda x: -x["score"])[:50]:
    print(f"{g['score']:>8}  {g['keyword'][:45]:45}  vol={g['volume']:<6} kd={g['kd']:<3} "
          f"theirpos={g['best_competitor_pos']:<4} ({g['source']})")
```

> The `score = volume / (kd+1)` heuristic is a *starting* sort, not gospel. Re-rank the top 50 by intent match and business value before committing — a KD-12 term with no commercial relevance loses to a KD-35 term that sells your product.

### Prioritization framework

| Tier | Criteria | Action |
|---|---|---|
| **P1 (do now)** | Non-trivial demand · KD below your proven ceiling · clear intent you can satisfy · maps to a CTA · a competitor already ranks/cited | Brief this quarter |
| **P2 (queue)** | Moderate demand/difficulty · mixed intent · tangential business fit | Next quarter / batch |
| **P3 (later)** | Thin demand · KD above ceiling · unclear intent or weak business value | Park; revisit if authority grows |

> Treat **AI-answer gaps** as their own P1 list: if you already rank but aren't *cited*, the fix is usually a §3 content edit (direct answer, original data, author signals), which is far cheaper than net-new content.

---

## Contents

- 1. Topic Cluster Architecture
- Cluster mapping template
- Cluster validation — go/no-go checklist

## 1. Topic Cluster Architecture

A cluster is one **pillar** (broad, high-intent hub) plus **spokes** (specific, long-tail articles) that all interlink. The pillar earns authority; spokes capture specific queries and pass relevance/links to the pillar.

```
Pillar (hub)            — broad head term, commercial/navigational intent, 2,500-4,000 words,
  │                       links DOWN to every spoke, refreshed quarterly
  ├── Spoke (how-to)    — long-tail, informational, 1,200-2,000 words, links UP to pillar
  ├── Spoke (comparison)— "X vs Y", "best X for Z", mid-funnel
  ├── Spoke (template)  — "X template/checklist", lead-magnet attached
  └── Spoke (case study)— proof + data, bottom-funnel, links to product
```

### Cluster mapping template

Keep one row per page. Volumes are placeholders — fill from your own tool with source/market/date.

```yaml
pillar:
  topic: "Content marketing strategy"
  primary_kw: "content marketing strategy"
  volume: "<vol/mo · Ahrefs · US · YYYY-MM>"
  difficulty: "<KD · same source>"
  intent: commercial-investigation     # informational | commercial | transactional | navigational
  url: /content-marketing-strategy/
  refresh: quarterly

spokes:
  - topic: "Content marketing plan"
    primary_kw: "content marketing plan template"
    secondary_kw: ["content marketing planning process"]
    intent: informational
    url: /content-marketing-plan/
    internal_links_up: ["/content-marketing-strategy/"]
  - topic: "Editorial calendar"
    primary_kw: "editorial calendar template"
    secondary_kw: ["content calendar best practices"]
    intent: informational
    url: /editorial-calendar-guide/
  - topic: "Content distribution"
    primary_kw: "content distribution strategy"
    intent: commercial-investigation
    url: /content-distribution-strategy/
  - topic: "Content metrics"
    primary_kw: "content marketing metrics"
    secondary_kw: ["content marketing roi"]
    intent: informational
    url: /content-marketing-metrics/
```

### Cluster validation — go/no-go checklist

A candidate spoke ships only if it clears all of these:

| Gate | Threshold | How to check |
|---|---|---|
| Topical fit | Same entity/subtopic as pillar, not a tangent | Would a reader of the pillar click it? |
| Demand | Real query demand (any non-zero volume **or** clear PAA/forum demand) | Tool volume + Google "People also ask" + Reddit/forum threads |
| Winnability | KD below your domain's proven ceiling | Compare to KD of terms you already rank top-10 for |
| Intent match | One dominant intent you can satisfy | Inspect the live SERP — what format dominates? |
| Differentiation | A clear "10x" angle (data, tool, depth, POV) vs current top 3 | Read the 3 ranking pages; what's missing? |
| Business value | Maps to a funnel stage and a CTA | Assign TOFU/MOFU/BOFU + the conversion event |

> **Build clusters from live SERPs, not just volume.** Open the SERP for the head term. If Google shows an AI Overview, a "People also ask" block, and 8 forum/Reddit results, the *intent and format* of those results define your brief far more than the raw volume number.

---

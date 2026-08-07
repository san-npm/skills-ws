## Contents

- 5. Editorial Calendar Operating Model
- Status workflow (the only states that matter)
- Field schema (tool-agnostic)
- Calendar example (use a forward, relative date)
- Production workflow

## 5. Editorial Calendar Operating Model

The calendar is an operating system, not a spreadsheet of dates. Define the **states**, **owners**, **WIP limits**, and **definition of done** — then any tool (Airtable, Notion, Linear, a sheet) works.

### Status workflow (the only states that matter)

```
Backlog  →  Briefed  →  Drafting  →  Editing  →  SEO/QA  →  Scheduled  →  Published  →  In-refresh
```

| Status | Owner | Exit criteria (definition of done for the stage) |
|---|---|---|
| **Backlog** | Strategist | Cluster + intent + funnel stage + rough volume captured |
| **Briefed** | Strategist | §2 brief complete (entities, questions, 10x angle, schema, E-E-A-T reqs) |
| **Drafting** | Writer | Draft covers all brief questions; internal links placed; sources cited |
| **Editing** | Editor | Structure/clarity/brand voice; direct answers present under each H2 |
| **SEO/QA** | SEO owner | Title/meta, schema valid (`seo-geo`), links resolve, images have alt, mobile/CWV ok |
| **Scheduled** | Editor | Publish date set; distribution + repurposing tasks created (§7) |
| **Published** | — | Live, indexed (submit/inspect in `search-console`), tracking wired (§9) |
| **In-refresh** | Strategist | On a cadence; re-enters Editing when decay detected (§4 D5) |

**WIP limits** keep throughput honest: cap "Drafting" + "Editing" to ~2× the number of writers; if it backs up, stop adding to Backlog. Cycle time (Briefed → Published) is the metric to watch.

### Field schema (tool-agnostic)

Use these exact fields in whatever tool you pick:

```yaml
fields:
  title:            text
  status:           select        # the 8 states above
  cluster:          select        # which pillar it belongs to
  funnel_stage:     select        # TOFU | MOFU | BOFU
  primary_kw:       text
  kw_source:        text          # "Ahrefs · US · YYYY-MM"  (data hygiene rule)
  intent:           select
  brief_url:        url           # link to the §2 brief
  author:           person
  editor:           person
  publish_date:     date
  conversion_event: select        # what success looks like for THIS page
  internal_links:   text          # up/across targets
  last_reviewed:    date          # drives §8 refresh cadence
  status_metric:    text          # latest clicks/impressions/position (GSC)
```

### Calendar example (use a forward, relative date)

Plan against the **current quarter**, not a fixed past month. Pattern for any given month:

```yaml
month: "<current quarter, e.g. Q3 2026>"
theme: "Editorial systems"
goal: "+X qualified signups attributed to content"

week_1:
  - title: "Content marketing plan template"
    cluster: "content-marketing-strategy"
    funnel_stage: TOFU
    type: template
    primary_kw: "content marketing plan template"
    author: "<writer>"
    distribution: [blog, newsletter, linkedin]
    conversion_event: "template download"
  - title: "5 content planning mistakes"
    funnel_stage: TOFU
    type: listicle
    conversion_event: "newsletter signup"
  - title: "Case study: how <customer> doubled organic clicks"
    funnel_stage: BOFU
    type: case-study
    distribution: [blog, linkedin]
    conversion_event: "demo request"

repurposing_queue:     # auto-created when an item hits "Scheduled" (see §7)
  - source: "week_1 template"   -> [carousel, newsletter section]
  - source: "week_1 case study" -> [short video, quote cards]
```

### Production workflow

```
Idea → Cluster fit check (§1) → Brief (§2) → Draft → Edit → SEO/QA (seo-geo)
     → Schedule → Publish → Distribute + Repurpose (§7) → Measure (§9) → Refresh (§8)
```

---

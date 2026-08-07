## Contents

- 9. Measurement
- What to pull, from where
- GSC quick pull (CLI, for a recurring report)
- AI-search measurement (do this manually if nothing else)

## 9. Measurement

Track classic organic **and** AI-search visibility. Separate the two — a page can lose clicks to an AI Overview while its impressions rise, which is a content-edit signal, not a failure.

### What to pull, from where

| Question | Source | Specifics |
|---|---|---|
| Are we ranking / trending? | Search Console | Clicks, impressions, avg position by page & query; 16-month window for trend |
| Engagement & conversion | GA4 | Engaged sessions, key events (your conversion_event per page), conversions, attribution |
| Are we cited by AI engines? | Manual §3 prompts + AI-visibility tooling | Log cited/mentioned/absent per money query, per engine, monthly |
| Indexation health | Search Console | URL Inspection / Pages report; non-indexed reasons |

### GSC quick pull (CLI, for a recurring report)

If you have the `search-console` MCP/skill wired, query it there. As a raw fallback, the Search Analytics API (free, OAuth) returns top pages/queries:

```bash
# Top pages by clicks, last 28 days (requires an OAuth access token for the property).
# See `search-console` for token setup; do not hardcode credentials.
curl -s -X POST \
  "https://www.googleapis.com/webmasters/v3/sites/$(python3 -c 'import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1],safe=""))' "$SITE_URL")/searchAnalytics/query" \
  -H "Authorization: Bearer $GSC_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"startDate":"2026-05-10","endDate":"2026-06-07","dimensions":["page"],"rowLimit":25}'
```

### AI-search measurement (do this manually if nothing else)

Once a month, run the §3 query-class prompts across the engines your audience uses and fill:

```yaml
query: "best <category> for <audience>"
date: 2026-06-07
results:
  google_ai_overview: cited        # cited | mentioned | absent
  chatgpt_search:      mentioned
  perplexity:          absent       # -> competitor X cited; diff our page (§3)
  gemini:              cited
action: "Add original benchmark + author bio to /our-page/ ; re-test next cycle"
```

> Tie content to revenue, not vanity metrics. The headline number for a content program is **qualified conversions attributed to organic/AI-referred content** (GA4 key events), not pageviews. Pageviews justify nothing on their own.

---

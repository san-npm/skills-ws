## Contents

- 10. Monitoring & Dashboards
- What to Track
- GSC API Monitoring Script

## 10. Monitoring & Dashboards

### What to Track

| Metric | Tool | Alert Threshold |
|--------|------|-----------------|
| Indexed pages | GSC → Indexing report / URL Inspection API | Drop >10% week-over-week |
| Pages submitted vs. indexed ratio | GSC Indexing report | <70% of submitted URLs indexed |
| Avg position by page type | GSC Search Analytics | Decline >5 positions |
| Crawl stats / soft 404s | GSC Crawl Stats + server logs | >50% 4xx/soft-404 in crawl |
| Thin / near-duplicate pages | Custom crawler | Quality-gate fail or similarity >0.8 (see §6) |
| Broken internal links | Screaming Frog / custom | Any internal 404 |
| Core Web Vitals (field) | CrUX / GSC | LCP >2.5s, INP >200ms, CLS >0.1 |
| Organic traffic by template | GA4 + GSC | Drop >20% month-over-month |

Note: **INP (Interaction to Next Paint) replaced FID as a Core Web Vital in March 2024** — track INP, not FID.

### GSC API Monitoring Script

Run this weekly (cron). Two things matter for correctness:

1. **Use a rolling window, never hardcoded dates.** GSC Search Analytics data lags ~2–3 days, so query "the 28 days ending 3 days ago" and compare it to the immediately prior 28 days — so the alert is *trend*, not an absolute one-off.
2. **Search Analytics ≠ index status.** A page only appears here once it has had an *impression*. It's a proxy for "indexed and ranking somewhere." For true index status, use the **URL Inspection API** (`urlInspection.index.inspect`, quota ~2,000/day) on a sample, or read the Indexing report in the GSC UI.

```typescript
// scripts/monitor-indexing.ts — run weekly via cron. tsx scripts/monitor-indexing.ts
import { google } from 'googleapis';

const SITE_URL = process.env.GSC_SITE_URL ?? 'https://example.com';
const DAY = 86_400_000;

// GSC data lags; offset the window end by `lagDays`.
function rollingWindow(endOffsetDays: number, lengthDays: number) {
  const end = new Date(Date.now() - endOffsetDays * DAY);
  const start = new Date(+end - (lengthDays - 1) * DAY);
  const iso = (d: Date) => d.toISOString().slice(0, 10); // YYYY-MM-DD
  return { startDate: iso(start), endDate: iso(end) };
}

async function queryPageCount(
  sc: ReturnType<typeof google.searchconsole>,
  window: { startDate: string; endDate: string },
  pathRegex: string,
) {
  const res = await sc.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: {
      ...window,
      dimensions: ['page'],
      dimensionFilterGroups: [{
        filters: [{ dimension: 'page', operator: 'includingRegex', expression: pathRegex }],
      }],
      rowLimit: 25000, // paginate with startRow if a template exceeds 25k URLs
    },
  });
  return res.data.rows?.length ?? 0;
}

async function checkIndexingHealth() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GSC_KEY_FILE ?? 'service-account.json',
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
  const sc = google.searchconsole({ version: 'v1', auth });

  // Templates to watch, keyed by URL regex.
  const templates: Record<string, string> = {
    locations: '/plumbers/',
    comparisons: '/compare/',
  };

  const current = rollingWindow(3, 28);   // 28 days ending 3 days ago
  const prior = rollingWindow(31, 28);    // the 28 days before that

  for (const [name, regex] of Object.entries(templates)) {
    const [nowCount, prevCount, expected] = await Promise.all([
      queryPageCount(sc, current, regex),
      queryPageCount(sc, prior, regex),
      getExpectedPageCount(name),
    ]);

    const indexRatio = expected ? nowCount / expected : 0;
    const wowDelta = prevCount ? (nowCount - prevCount) / prevCount : 0;

    console.log(
      `[${name}] ranking-visible: ${nowCount}/${expected} (${(indexRatio * 100).toFixed(1)}%), ` +
      `period-over-period: ${(wowDelta * 100).toFixed(1)}%`,
    );

    if (indexRatio < 0.7) console.error(`  ⚠ Only ${(indexRatio * 100).toFixed(1)}% of ${name} pages visible in search.`);
    if (wowDelta < -0.1)  console.error(`  ⚠ ${name} dropped ${(wowDelta * -100).toFixed(1)}% vs prior period.`);
  }
}

checkIndexingHealth().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

---

## Contents

- 9. Building Dashboards
- Architecture
- Dune API Integration (robust: terminal states, HTTP errors, pagination, rate limits)
- Dashboard Data Patterns

## 9. Building Dashboards

### Architecture
```
Data sources → ETL/Indexer → Database → API → Frontend
  │                                              │
  ├── Dune API (SQL queries, scheduled)          ├── Next.js + Chart.js/Recharts
  ├── Etherscan V2 API (lookups)                 ├── TanStack Query for caching
  ├── The Graph (GraphQL queries/polling)        └── Tailwind for styling
  └── RPC nodes / indexer (custom indexing)
```

> Don't hammer Dune's execute endpoint from the browser on every page load — executions cost credits and take seconds-to-minutes. Pattern: **schedule** the query on Dune (or run it server-side on a cron), then have the frontend read **cached latest results** through your own API route. Keep the Dune key server-side only.

### Dune API Integration (robust: terminal states, HTTP errors, pagination, rate limits)
The common failing pattern only loops while `PENDING`/`EXECUTING` and then blindly reads `result.result.rows` — so a `FAILED`/`CANCELLED`/`EXPIRED` execution either throws an opaque `undefined` error or silently returns nothing, and large result sets are truncated at the first page. Handle all terminal states, check HTTP status, respect 429s, and page via `next_uri`.

```typescript
const DUNE_API_KEY = process.env.DUNE_API_KEY!;
const DUNE = 'https://api.dune.com/api/v1';
const H = { 'X-Dune-API-Key': DUNE_API_KEY };

const TERMINAL_OK = 'QUERY_STATE_COMPLETED';
const TERMINAL_FAIL = new Set([
  'QUERY_STATE_FAILED', 'QUERY_STATE_CANCELLED', 'QUERY_STATE_EXPIRED',
]);

async function duneFetch(url: string, init?: RequestInit, attempt = 0): Promise<any> {
  const res = await fetch(url, init);
  if (res.status === 429) {                       // rate limited → backoff + retry
    if (attempt >= 5) throw new Error('Dune: rate limited, retries exhausted');
    const retryAfter = Number(res.headers.get('retry-after')) || 2 ** attempt;
    await new Promise(r => setTimeout(r, retryAfter * 1000));
    return duneFetch(url, init, attempt + 1);
  }
  if (!res.ok) throw new Error(`Dune HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

// Trigger a fresh execution and wait for a terminal state
async function executeDuneQuery(queryId: number, params?: Record<string, unknown>) {
  const { execution_id } = await duneFetch(`${DUNE}/query/${queryId}/execute`, {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'application/json' },
    body: JSON.stringify(params ? { query_parameters: params } : {}),
  });

  // Poll status (cheap) — not the full results endpoint — until terminal
  for (;;) {
    await new Promise(r => setTimeout(r, 2000));
    const { state } = await duneFetch(`${DUNE}/execution/${execution_id}/status`, { headers: H });
    if (state === TERMINAL_OK) break;
    if (TERMINAL_FAIL.has(state)) throw new Error(`Dune execution ${execution_id} ended in ${state}`);
    // else PENDING / EXECUTING → keep polling
  }
  return fetchAllRows(`${DUNE}/execution/${execution_id}/results?limit=1000`);
}

// Page through every result via next_uri (or next_offset)
async function fetchAllRows(firstUrl: string) {
  const rows: any[] = [];
  let url: string | undefined = firstUrl;
  while (url) {
    const page = await duneFetch(url, { headers: H });
    rows.push(...(page.result?.rows ?? []));
    // Dune returns an absolute next_uri when more pages exist
    url = page.next_uri;
  }
  return rows;
}

// Cached latest results (no credits, no re-execution) — preferred for dashboards
async function getLatestResults(queryId: number) {
  return fetchAllRows(`${DUNE}/query/${queryId}/results?limit=1000`);
}
```

> Parameter typing: Dune `query_parameters` are typed (`text`, `number`, `date` as `YYYY-MM-DD HH:mm:ss`, `enum`). Pass them as the correct JS type or the execution fails validation. There's also a one-shot `POST /query/{id}/execute` + `GET /execution/{id}/results` flow shown here, plus a higher-level "run query" convenience endpoint — check current limits and credit costs at https://docs.dune.com.

### Dashboard Data Patterns
```typescript
// React component with TanStack Query
import { useQuery } from '@tanstack/react-query';

function TVLChart({ queryId }: { queryId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['tvl', queryId],
    queryFn: () => getLatestResults(queryId),
    staleTime: 5 * 60 * 1000, // 5 min cache
    refetchInterval: 10 * 60 * 1000, // refresh every 10 min
  });

  if (isLoading) return <Skeleton />;

  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={data}>
        <XAxis dataKey="day" />
        <YAxis tickFormatter={(v) => `$${(v / 1e6).toFixed(0)}M`} />
        <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
        <Area type="monotone" dataKey="tvl" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

---

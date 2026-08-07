## CORS Configuration

```typescript
import cors from 'cors';

// Development
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

// Production — specific origins
app.use(cors({
  origin: ['https://app.example.com', 'https://admin.example.com'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  credentials: true,
  maxAge: 86400, // Cache preflight for 24h
}));

// Dynamic origin (multi-tenant)
app.use(cors({
  origin: (origin, callback) => {
    // ⚠️ `!origin` here ALLOWS requests with no Origin header. Those come from
    // non-browser clients (curl, server-to-server, same-origin navigations) —
    // they are NOT subject to the browser same-origin policy, so this is not a
    // CORS bypass per se, but if your API is browser-only this masks misconfig.
    // For browser-only APIs, DROP the `!origin` allowance and require a match.
    const allowedPattern = /^https:\/\/([a-z0-9-]+\.)?example\.com$/; // anchored
    if (origin && allowedPattern.test(origin)) {
      callback(null, true);
    } else if (!origin) {
      callback(null, false); // browser-only API: refuse to reflect a CORS origin
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // never combine credentials:true with origin reflection of "*"
}));
```

> With `credentials: true`, the `cors` package echoes the matched origin into
> `Access-Control-Allow-Origin` (you can never send `*` with credentials). Make
> the regex **anchored** (`^...$`) — an unanchored pattern like `/\.example\.com$/`
> matches `https://evil.com/.example.com` style tricks via subdomains you don't own.

---

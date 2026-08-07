## GraphQL vs REST: Decision Matrix

| Factor | REST | GraphQL |
|--------|------|---------|
| **Use when** | CRUD-heavy, well-defined resources | Complex relationships, varying client needs |
| **Caching** | HTTP caching works perfectly | Requires custom caching (Apollo, Relay) |
| **Versioning** | URL versioning, straightforward | Schema evolution, deprecation directives |
| **File uploads** | Multipart form, straightforward | Requires separate upload endpoint or multipart spec |
| **Real-time** | SSE, WebSocket (separate) | Subscriptions (built-in) |
| **Tooling** | Mature (Postman, curl) | Specialized (GraphiQL, Apollo DevTools) |
| **N+1 problem** | Solved by design (one endpoint = one response) | Requires DataLoader |
| **Mobile** | Over-fetching without field selection | Precise data fetching |
| **Team size** | Any | Better with dedicated frontend/backend teams |

**Strong REST signals:** Public API, simple CRUD, caching matters, small team.
**Strong GraphQL signals:** Multiple clients (web, mobile, partners) with different data needs, deeply nested relationships, rapid frontend iteration.

**Don't use GraphQL because it's trendy.** Use it when you genuinely have the data-fetching complexity that justifies it.

---

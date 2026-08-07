## Checklist: Production-Ready API

- [ ] Consistent URL patterns (plural nouns, max 2 levels nesting)
- [ ] Cursor pagination for list endpoints
- [ ] RFC 9457 Problem Details error responses (`application/problem+json`) with field-level errors
- [ ] Rate limiting with `RateLimit-*` headers (IETF draft, draft-ietf-httpapi-ratelimit-headers), optionally legacy `X-RateLimit-*`
- [ ] Idempotency keys for POST endpoints (required for money-moving writes; bound to method+route+body+principal)
- [ ] Request validation from OpenAPI spec
- [ ] API versioning with deprecation/sunset headers
- [ ] Authentication (JWT for users, API keys for services)
- [ ] CORS configured correctly
- [ ] Request/response logging with correlation IDs
- [ ] Compression (gzip/brotli)
- [ ] Health check endpoint (/healthz)
- [ ] OpenAPI spec as source of truth
- [ ] Generated client SDKs from OpenAPI spec

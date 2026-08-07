## Caching
- [ ] Hashed /_next/static: immutable, 1 year (NOT remote images — see §3)
- [ ] API: s-maxage + stale-while-revalidate
- [ ] Personalized: private, no-store (or `'use cache: private'`)
- [ ] Cache tags for granular invalidation
- [ ] Next 16: caching is opt-in via `'use cache'` + `cacheComponents` (migrated off `unstable_cache`)

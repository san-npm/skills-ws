## Monorepo: build/test only what changed

Don't run the whole matrix on every PR. Two production-grade options:

```yaml
# A) Turborepo affected graph (uses the cache + dependency graph)
- run: npx turbo run build test --filter='...[origin/main]'
#   '...[origin/main]' = packages changed since main, PLUS everything that depends on them.
#   Add a Remote Cache (Vercel or self-hosted) so CI reuses local/dev build artifacts.
```

```yaml
# B) Path filters to skip irrelevant jobs entirely
on:
  pull_request:
    paths: ['packages/api/**', 'package-lock.json']
# Or use dorny/paths-filter to set per-area outputs and gate downstream jobs with `if:`.
```

For Nx use `nx affected -t build test --base=origin/main --head=HEAD`.

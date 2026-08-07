## Caching Strategies

```yaml
# 1) Node modules — let setup-node manage it (keyed on lockfile hash automatically).
- uses: actions/setup-node@v6
  with: { node-version: 24, cache: npm }   # use 'pnpm' or 'yarn' to match your PM

# 2) pnpm (needs the store + action-setup BEFORE setup-node's cache kicks in)
- uses: pnpm/action-setup@v6
  with: { version: 11 }   # or omit version to use the packageManager field from package.json
- uses: actions/setup-node@v6
  with: { node-version: 24, cache: pnpm }

# 3) Docker layer caching via the GitHub Actions cache backend
- uses: docker/build-push-action@v7
  with:
    context: .
    cache-from: type=gha
    cache-to: type=gha,mode=max     # mode=max also caches intermediate layers

# 4) Turborepo local cache (remote cache is better at scale — see monorepo section)
- uses: actions/cache@v6
  with:
    path: .turbo
    # Include the lockfile in the key so a dep change busts the cache.
    key: turbo-${{ hashFiles('**/turbo.json', '**/package-lock.json') }}-${{ github.sha }}
    restore-keys: |
      turbo-${{ hashFiles('**/turbo.json', '**/package-lock.json') }}-
- run: npx turbo build --cache-dir=.turbo
```

**Cache hygiene:** key on the lockfile hash (not loose globs), keep `restore-keys` as a prefix fallback, and never cache anything secret-derived. Untrusted PRs run in a restricted scope and **cannot write** to caches/branches your default branch created — don't design a workflow that depends on a PR populating a shared cache.

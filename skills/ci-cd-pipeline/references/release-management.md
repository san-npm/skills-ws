## Contents

- Release Management
- Semantic Versioning with Changesets

## Release Management

### Semantic Versioning with Changesets

```bash
npm install -D @changesets/cli
npx changeset init
```

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    branches: [main]
jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write     # push version-bump commit / create release
      id-token: write      # npm Trusted Publishing (OIDC) — no NPM_TOKEN needed
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v6
        with: { node-version: '22', cache: 'npm', registry-url: 'https://registry.npmjs.org' }
      - run: npm ci
      - name: Create Release PR or Publish
        uses: changesets/action@v1
        with:
          publish: npx changeset publish
          version: npx changeset version
          commit: 'chore: version packages'
          title: 'chore: version packages'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # NPM_TOKEN no longer required: configure Trusted Publishing for the
          # package on npmjs.com and publish via OIDC (npm CLI >= 11.5). npm then
          # attaches provenance automatically. Requires `id-token: write` above.
```

> **Trusted Publishing.** As of 2026, npm (and PyPI/RubyGems) support OIDC-based "trusted publishing": you register the GitHub repo+workflow as a trusted publisher on the registry, and CI mints a short-lived token at publish time instead of storing a long-lived `NPM_TOKEN`. npm also stamps published packages with provenance linking back to the build. Verify current CLI/flow at https://docs.npmjs.com/trusted-publishers.

---

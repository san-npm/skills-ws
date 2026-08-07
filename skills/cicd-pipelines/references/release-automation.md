## Contents

- Release Automation
- Option A — semantic-release (single package, automated versioning from commits)
- Option B — Changesets (monorepos, human-curated release notes)

## Release Automation

### Option A — semantic-release (single package, automated versioning from commits)

`semantic-release` reads Conventional Commits, computes the next version, publishes to npm, creates the GitHub release, and commits the changelog — all in CI on `main`. The common failure is a release job missing Node setup, a clean install, or the npm auth token, so it either can't run or publishes unauthenticated.

```json
// .releaserc.json
{
  "branches": ["main", { "name": "next", "prerelease": true }],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    "@semantic-release/npm",
    "@semantic-release/github",
    ["@semantic-release/git", { "assets": ["CHANGELOG.md", "package.json"] }]
  ]
}
```

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    branches: [main]

permissions:
  contents: read   # least-privilege default; the release job widens it below

jobs:
  release:
    runs-on: ubuntu-24.04
    permissions:
      contents: write       # push the changelog/version commit + create the GitHub release
      issues: write         # comment on released issues
      pull-requests: write  # comment on released PRs
      id-token: write       # npm provenance (publish with verifiable origin)
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0     # full history — semantic-release diffs all tags
          persist-credentials: false
      - uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: npm
          registry-url: https://registry.npmjs.org   # writes the npm authToken line
      - run: npm ci
      - run: npm run build --if-present
      - run: npx semantic-release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # npm granular access token (write tokens max 90 days) or, preferably,
          # OIDC trusted publishing: classic automation tokens were revoked 2025-12-09.
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

> With `id-token: write` + a recent npm CLI, `@semantic-release/npm` publishes with **provenance**, linking the package on npm to the exact workflow run that built it. Prefer npm "trusted publishing" (OIDC) over a static `NPM_TOKEN` where your registry supports it.

### Option B — Changesets (monorepos, human-curated release notes)

Changesets is the better fit for monorepos: contributors drop an intent file per PR (`npx changeset`), and a bot opens/maintains a single "Version Packages" PR. Merging that PR versions every affected package and publishes them together.

```bash
npx changeset           # developer: select bumped packages + write a summary (commit the .md)
npx changeset version   # CI/maintainer: applies bumps, updates changelogs + lockfile
npx changeset publish   # CI: publishes every package that has a new version
```

```yaml
# .github/workflows/changesets.yml   (inlined — this is the full workflow)
name: Changesets Release
on:
  push:
    branches: [main]

permissions:
  contents: read

concurrency: changesets-${{ github.ref }}   # serialize so two pushes can't double-publish

jobs:
  release:
    runs-on: ubuntu-24.04
    permissions:
      contents: write        # create/update the "Version Packages" PR + tags
      pull-requests: write   # open/maintain the version PR
      id-token: write        # npm provenance on publish
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0
          persist-credentials: false
      - uses: pnpm/action-setup@v6
        with: { version: 11 }   # or omit version to use the packageManager field from package.json
      - uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: pnpm
          registry-url: https://registry.npmjs.org
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - id: changesets
        uses: changesets/action@v1
        with:
          # If changesets exist -> publish. Otherwise -> open/refresh the Version PR.
          publish: pnpm changeset publish
          version: pnpm changeset version
          commit: "chore: release packages"
          title: "chore: release packages"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # npm granular access token (write tokens max 90 days) or, preferably,
          # OIDC trusted publishing: classic automation tokens were revoked 2025-12-09.
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

```jsonc
// .changeset/config.json — key options
{
  "$schema": "https://unpkg.com/@changesets/config/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "access": "public",                 // "restricted" for private scoped packages
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "linked": [],                       // [["@scope/a","@scope/b"]] to version in lockstep
  "ignore": ["@scope/internal-tooling"]
}
```

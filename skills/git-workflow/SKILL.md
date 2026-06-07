---
name: git-workflow
description: "Git branching strategies, Conventional Commits, hooks, code review, and release/monorepo CI. Use when designing branch strategy, enforcing commit conventions, wiring Husky/commitlint, automating releases (semantic-release/release-please), setting up CODEOWNERS/monorepo CI, or deciding rebase vs cherry-pick vs force-push."
---

# Git Workflow

## Branching Strategies

| Strategy | Best For | Branch Lifetime | Release Cadence |
|---|---|---|---|
| **Trunk-Based** | CI/CD, small teams | Hours | Continuous |
| **GitHub Flow** | SaaS, web apps | Days | On merge |
| **GitFlow** | Versioned software, mobile | Weeks | Scheduled |

### Trunk-Based (Recommended for most teams)

```
main ←── short-lived feature branches (< 2 days)
  └── release/* (cut when ready, hotfix → cherry-pick back)
```

- All developers commit to `main` (or merge within 24h)
- Use **feature flags** for incomplete work, not long-lived branches
- CI must pass on every commit to `main`

### GitHub Flow

```bash
git checkout -b feat/user-avatars
# work, commit, push
gh pr create --base main --fill
# review → squash merge → auto-deploy
```

### GitFlow (when you need it)

```
main ← tagged releases only
develop ← integration branch
  ├── feature/* → develop
  ├── release/* → main + develop
  └── hotfix/*  → main + develop
```

## Commit Conventions (Conventional Commits)

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

| Type | SemVer Bump | Example |
|---|---|---|
| `fix` | PATCH | `fix(auth): handle expired refresh tokens` |
| `feat` | MINOR | `feat(api): add pagination to /users` |
| `feat!` or `BREAKING CHANGE:` | MAJOR | `feat(api)!: remove v1 endpoints` |
| `chore`, `docs`, `ci`, `refactor`, `test`, `perf` | none | `ci: add Node 24 to matrix` |

Enforce with **commitlint** — see the [Git Hooks](#git-hooks-husky--lint-staged--commitlint) section below for the correct Husky v9+ wiring (the old `npx husky add ...` command was removed in Husky v9).

## Git Hooks (Husky + lint-staged + commitlint)

Husky **v9+** changed the setup: there is no `husky add`/`husky install` anymore. Run `husky init`, then write hook files directly (a hook is just a shell script; no `#!/bin/sh` shebang or `husky.sh` sourcing line is needed in v9+).

```bash
# 1. Install tooling
npm i -D husky lint-staged @commitlint/cli @commitlint/config-conventional

# 2. Scaffold .husky/ and add the "prepare" script to package.json
npx husky init        # creates .husky/pre-commit (with "npm test") + sets "prepare": "husky"

# 3. commitlint config (commitlint.config.mjs — ESM is the current default)
printf "export default { extends: ['@commitlint/config-conventional'] };\n" > commitlint.config.mjs
```

```json
// package.json
{
  "scripts": { "prepare": "husky" },
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml,yaml}": ["prettier --write"]
  }
}
```

Write the two hook files directly (overwrite the placeholder `npx husky init` left in `pre-commit`):

```bash
# .husky/pre-commit  — lint only staged files
npx lint-staged
```

```bash
# .husky/commit-msg  — validate the message against Conventional Commits
npx --no-install commitlint --edit "$1"
```

> Husky obeys `core.hooksPath`, so it only fires from the repo root after a real `npm install`. To bypass in an emergency: `git commit --no-verify` (or `HUSKY=0 git commit ...`). On CI, hooks should not run — guard `prepare` or set `HUSKY=0` in the workflow env so `npm ci` doesn't try to scaffold hooks.

## Code Review Checklist

- [ ] PR is < 400 lines (split if larger)
- [ ] Tests cover new behavior and edge cases
- [ ] No secrets, credentials, or PII in diff
- [ ] Breaking changes documented and flagged
- [ ] Error handling is explicit (no swallowed errors)
- [ ] No `TODO` without a linked issue
- [ ] DB migrations are reversible
- [ ] API changes are backward-compatible (or versioned)

### Reusable PR template

Save as `.github/PULL_REQUEST_TEMPLATE.md` (GitHub auto-loads it into the PR description; for multiple templates use `.github/PULL_REQUEST_TEMPLATE/<name>.md` and `?template=<name>.md`):

```markdown
## What & why
<!-- One paragraph: the change and the problem it solves. Link the issue. -->
Closes #

## Type of change
- [ ] fix (PATCH)   - [ ] feat (MINOR)   - [ ] breaking (MAJOR)
- [ ] chore / docs / refactor / test / ci (no release)

## How to test
1.
2.

## Checklist
- [ ] PR < ~400 lines (or explained why not)
- [ ] Tests added/updated and passing locally
- [ ] No secrets/PII in diff
- [ ] Breaking changes documented + migration notes
- [ ] DB migrations reversible
- [ ] Docs/changelog updated if user-facing

## Screenshots / logs
<!-- UI changes: before/after. Backend: relevant log or curl output. -->
```

## Rebase vs Merge

| Use | When |
|---|---|
| **Squash merge** | Feature branches → main (clean history) |
| **Rebase** | Updating feature branch with latest main |
| **Merge commit** | Release branches, preserving full history |

```bash
# Update feature branch (never rebase shared branches)
git fetch origin && git rebase origin/main

# Interactive rebase to clean up before PR
git rebase -i HEAD~5
```

## Cherry-Pick: Forward-port vs Backport

Two opposite directions — keep them straight. Fix the bug **once** on the branch where the code currently lives, then move the commit to the other branch with `cherry-pick`.

**Backport** (`main → release/*`): a fix landed on `main` but a still-supported older release needs it. This goes *newest → oldest*.

```bash
git switch main && git pull            # fix already merged here, note the SHA
git switch release/2.3
git cherry-pick -x <sha>               # -x records "(cherry picked from <sha>)"
npm test                               # ALWAYS re-test: surrounding code differs
git push origin release/2.3            # tag a patch release (e.g. v2.3.1) from here
```

**Forward-port** (`release/* → main`): a hotfix was made directly on a release branch under pressure and must not be lost when the next version ships. This goes *oldest → newest*.

```bash
git switch release/2.3 && git pull     # hotfix committed here, note the SHA
git switch main
git cherry-pick -x <sha>
npm test
```

Rules of thumb:
- Decide a **single source of truth** per fix (usually `main`) and cherry-pick *from* it, so you never apply the same change twice and create divergent commits.
- Use `-x` so the new commit references the original — invaluable when auditing what shipped where.
- On conflict: `git cherry-pick --continue` after resolving, or `git cherry-pick --abort` to bail. Never resolve blind — re-run tests on the destination branch.
- For a contiguous span use `git cherry-pick <oldSha>^..<newSha>` (the `^` makes the range inclusive of `<oldSha>`).

## Tag & Release Strategy

```bash
# Manual: annotated, signed tag (lightweight tags lack author/date/message)
git tag -s v2.4.0 -m "Release 2.4.0"   # use -a instead of -s if no GPG/SSH key
git push origin v2.4.0
```

Automate instead of tagging by hand. Two mainstream choices:

| Tool | Model | Best for |
|---|---|---|
| **semantic-release** | Analyzes Conventional Commits on push → bumps, tags, publishes npm, writes changelog, creates GH release — all in CI | Libraries / npm packages, fully hands-off releasing |
| **release-please** (Google) | Opens/maintains a "release PR" that accrues changelog + version bump; you merge it to cut the release | Apps & monorepos, teams that want a human gate before publishing |

> **Runtime (as of Jun 2026):** semantic-release v24+ requires an actively maintained Node LTS (Node 20+; Node 18 reached end-of-life Apr 2025). It must run against the **full git history** — set `fetch-depth: 0` in the checkout. Pin exact major versions and verify current support at https://github.com/semantic-release/semantic-release/releases and https://github.com/googleapis/release-please.

**semantic-release config** — save as `.releaserc.json`:

```json
{
  "branches": ["main", { "name": "next", "prerelease": true }],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    ["@semantic-release/changelog", { "changelogFile": "CHANGELOG.md" }],
    "@semantic-release/npm",
    ["@semantic-release/git", {
      "assets": ["CHANGELOG.md", "package.json"],
      "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
    }],
    "@semantic-release/github"
  ]
}
```

**release-please config** (GitHub Action) — `.github/workflows/release-please.yml`:

```yaml
name: release-please
on:
  push:
    branches: [main]
permissions:
  contents: write
  pull-requests: write
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: googleapis/release-please-action@v4
        with:
          release-type: node   # or: simple, python, rust, ...
```

## Monorepo Patterns

```bash
# Nx — run targets only for projects affected by the diff
npx nx affected --target=test --base=origin/main --head=HEAD

# Turborepo — same idea via package filter + remote cache
npx turbo run build --filter="...[origin/main]"
```

Both `affected`/`--filter` compare against a base ref, so CI **must fetch git history** — a shallow clone breaks them. With `actions/checkout`, set `fetch-depth: 0` (Nx also offers `nrwl/nx-set-shas` to compute the right base on `main`).

**CODEOWNERS** — `.github/CODEOWNERS` gives per-path required reviewers (pair it with a branch protection rule "Require review from Code Owners"). Last matching pattern wins:

```
# .github/CODEOWNERS
*                       @org/maintainers          # fallback owner
/packages/auth/**       @org/auth-team
/packages/api/**        @org/api-team @alice
/.github/**             @org/platform             # protect CI config itself
*.md                    @org/docs
```

> **CI runner versions (as of Jun 2026):** target Node LTS — Node 22 (LTS "Jet") is the safe default; Node 24 entered LTS in Oct 2025. Node 18 is EOL, so drop it from the matrix. Pin the patch via `.nvmrc`/`actions/setup-node` `node-version-file`, and watch GitHub's runner-image changelog (https://github.com/actions/runner-images) since `ubuntu-latest` periodically moves to a newer default Node.

```yaml
# .github/workflows/ci.yml — typical matrix
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [22, 24]
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }      # needed for affected/--filter and release tooling
      - uses: actions/setup-node@v4
        with: { node-version: ${{ matrix.node }}, cache: npm }
      - run: npm ci
      - run: npm test
```

## .gitignore Best Practices

```gitignore
# OS
.DS_Store
Thumbs.db

# Dependencies
node_modules/
vendor/

# Build output
dist/
.next/
*.tsbuildinfo

# Environment (NEVER commit secrets)
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/settings.json
```

Debug why a path is (not) ignored with `git check-ignore -v <file>`. If a file was committed before being ignored, `.gitignore` won't untrack it — run `git rm --cached <file>` once. Generate a baseline for any stack at https://gitignore.io (CLI: `npx gitignore node python`).

**Language-specific add-ons** (append to the common block above):

```gitignore
# --- Node / JS ---
node_modules/
dist/ build/ .next/ .nuxt/ .turbo/ coverage/
*.tsbuildinfo
.pnpm-store/ .yarn/cache/ .yarn/install-state.gz
npm-debug.log* yarn-error.log* .pnpm-debug.log*

# --- Python ---
__pycache__/ *.py[cod]
.venv/ venv/ env/
*.egg-info/ build/ dist/
.pytest_cache/ .mypy_cache/ .ruff_cache/ .tox/
.coverage htmlcov/

# --- Rust ---
/target/
**/*.rs.bk
# Keep Cargo.lock for binaries; ignore it only for libraries.

# --- Go ---
/bin/ /vendor/
*.exe *.test *.out
go.work go.work.sum

# --- Java / JVM ---
target/ build/ .gradle/
*.class *.jar *.war
.mvn/ !.mvn/wrapper/maven-wrapper.jar

# --- Secrets / local (NEVER commit) ---
.env .env.* !.env.example
*.pem *.key id_rsa* .npmrc
```

## Safety Rules (history, force-push, signing)

These are the operations that lose other people's work or corrupt shared history — treat them with care.

- **Never rewrite shared history.** `rebase`, `commit --amend`, `reset --hard`, and `push --force` are fine on *your own un-pushed branch*. Once a branch is pushed and others may have pulled it, rewriting it forces everyone into a painful recovery.
- **If you must force-push your own feature branch, use `--force-with-lease`** (not `--force`). It refuses the push if the remote moved since you last fetched, so you don't silently clobber a teammate's commit:
  ```bash
  git push --force-with-lease origin feat/my-branch
  ```
- **Protect long-lived branches** (`main`, `develop`, `release/*`) with a branch protection / ruleset on the host:
  - Require PR + passing status checks before merge; require Code Owner review.
  - Disallow force-push and deletion; require linear history if you squash-merge.
  - Require signed commits if your org mandates provenance.
- **Sign commits and tags** so authorship is verifiable. SSH signing is the low-friction modern option:
  ```bash
  git config --global gpg.format ssh
  git config --global user.signingkey ~/.ssh/id_ed25519.pub
  git config --global commit.gpgsign true
  git config --global tag.gpgsign true
  ```
  Add the same public key as a *Signing key* in your GitHub account for the "Verified" badge. (GPG works too — set `gpg.format` back to `openpgp`.)
- **Recover from a bad rewrite with `git reflog`** — it keeps the pre-rewrite commit for ~90 days: `git reflog`, find the good SHA, `git reset --hard <sha>`.
- **Delete branches safely.** `git branch -d` refuses to drop an unmerged branch (good). `-D` forces it (deletes unmerged work — be sure). Delete the remote copy with `git push origin --delete <branch>`.

## Quick Reference

```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Find commit that introduced a bug
git bisect start && git bisect bad && git bisect good v2.0.0

# Clean up merged branches (anchored regex avoids matching e.g. "maintenance";
# xargs -r / --no-run-if-empty avoids calling git with no args on GNU)
git branch --merged main | grep -vE '^[*+ ]*(main|master|develop)$' | xargs -r git branch -d

# Amend without changing message
git commit --amend --no-edit

# Stash with name
git stash push -m "wip: auth refactor"
```


---
name: git-workflow
description: "Branching strategies, commit conventions, code review, and release workflows for professional teams."
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
| `chore`, `docs`, `ci`, `refactor`, `test`, `perf` | none | `ci: add Node 22 to matrix` |

Enforce with **commitlint**: `npx husky add .husky/commit-msg 'npx commitlint --edit $1'`

## Git Hooks (Husky + lint-staged)

```bash
npx husky init
npm i -D lint-staged
```

```json
// package.json
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.md": ["prettier --write"]
}
```

```bash
# .husky/pre-commit
npx lint-staged

# .husky/commit-msg
npx commitlint --edit $1
```

## Code Review Checklist

- [ ] PR is < 400 lines (split if larger)
- [ ] Tests cover new behavior and edge cases
- [ ] No secrets, credentials, or PII in diff
- [ ] Breaking changes documented and flagged
- [ ] Error handling is explicit (no swallowed errors)
- [ ] No `TODO` without a linked issue
- [ ] DB migrations are reversible
- [ ] API changes are backward-compatible (or versioned)

See `references/pr-template.md` for a reusable PR template.

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

## Cherry-Pick Workflow

```bash
# Hotfix: fix on main, cherry-pick to release
git checkout main && git cherry-pick <sha>
git checkout release/2.3 && git cherry-pick <sha>
```

Always cherry-pick **forward** (oldest branch → newest). Never backport without testing.

## Tag & Release Strategy

```bash
# Semantic versioning tags
git tag -a v2.4.0 -m "Release 2.4.0"
git push origin v2.4.0

# Automate with semantic-release or release-please
# Trigger: push to main → analyze commits → bump version → tag → changelog
```

See `references/release-config.json` for semantic-release configuration.

## Monorepo Patterns

```bash
# Nx — affected-only CI
npx nx affected --target=test --base=origin/main

# Turborepo
npx turbo run build --filter=...[origin/main]

# CODEOWNERS for per-package review
# .github/CODEOWNERS
/packages/auth/**  @auth-team
/packages/api/**   @api-team
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

Use `git check-ignore -v <file>` to debug. Use `references/gitignore-templates/` for language-specific templates.

## Quick Reference

```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Find commit that introduced a bug
git bisect start && git bisect bad && git bisect good v2.0.0

# Clean up merged branches
git branch --merged main | grep -v main | xargs git branch -d

# Amend without changing message
git commit --amend --no-edit

# Stash with name
git stash push -m "wip: auth refactor"
```


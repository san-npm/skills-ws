---
name: cicd-pipelines
description: "Implement production GitHub Actions with copy-ready workflow YAML for caching, OIDC, Docker builds, deployment, rollback, and release automation. Use when writing or debugging `.github/workflows` in one repository. For CI/CD architecture, governance, or multi-repository strategy, use `ci-cd-pipeline`."
---
# CI/CD Pipelines

Concrete, runnable patterns for production GitHub Actions pipelines. Every snippet below is self-contained: copy it, swap the placeholders, and ship. Action versions are current as of **July 2026**; pin by SHA in regulated/high-trust repos (see [Supply-Chain Baseline](#supply-chain-baseline-2026)). For sibling depth on container internals see `docker-production`; for cloud IAM specifics see `aws-production-deploy`.

## Safety gate

Before executing commands or changing external systems, confirm scope, credentials, target environment, rollback, and required approval. Pin and verify third-party artifacts; never expose secrets to client code or logs.

## Reference guide

Read only the references needed for the current request:

- **Action Version Matrix (July 2026)**: [references/action-version-matrix-july-2026.md](references/action-version-matrix-july-2026.md)
- **GitHub Actions — Core CI Workflow**: [references/github-actions-core-ci-workflow.md](references/github-actions-core-ci-workflow.md)
- **Caching Strategies**: [references/caching-strategies.md](references/caching-strategies.md)
- **Secrets & OIDC**: [references/secrets-oidc.md](references/secrets-oidc.md)
- **Docker Multi-Stage Build**: [references/docker-multi-stage-build.md](references/docker-multi-stage-build.md)
- **Deployment Strategies**: [references/deployment-strategies.md](references/deployment-strategies.md)
- **Environment Promotion (dev → staging → prod)**: [references/environment-promotion-dev-staging-prod.md](references/environment-promotion-dev-staging-prod.md)
- **Release Automation**: [references/release-automation.md](references/release-automation.md)
- **Monorepo: build/test only what changed**: [references/monorepo-build-test-only-what-changed.md](references/monorepo-build-test-only-what-changed.md)
- **Rollback Procedures**: [references/rollback-procedures.md](references/rollback-procedures.md)
- **Supply-Chain Baseline (2026)**: [references/supply-chain-baseline-2026.md](references/supply-chain-baseline-2026.md)
- **Status Badges**: [references/status-badges.md](references/status-badges.md)
- **CI Performance Tips**: [references/ci-performance-tips.md](references/ci-performance-tips.md)
- **Copy-Paste Starter Workflows**: [references/copy-paste-starter-workflows.md](references/copy-paste-starter-workflows.md)

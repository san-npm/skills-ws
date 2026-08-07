---
name: ci-cd-pipeline
description: "Architect and audit end-to-end CI/CD systems: reusable workflows, testing strategy, OIDC cloud deploys, SLSA provenance, canary/rollback, reversible migrations, and monorepo orchestration. Use for pipeline architecture, security reviews, deployment strategy, or cross-repository CI design. For copy-ready GitHub Actions implementation, use `cicd-pipelines`."
---
# CI/CD Pipeline Engineering

## Safety gate

Before executing commands or changing external systems, confirm scope, credentials, target environment, rollback, and required approval. Pin and verify third-party artifacts; never expose secrets to client code or logs.

## Reference guide

Read only the references needed for the current request:

- **Philosophy**: [references/philosophy.md](references/philosophy.md)
- **GitHub Actions: Complete Production Workflow**: [references/github-actions-complete-production-workflow.md](references/github-actions-complete-production-workflow.md)
- **Testing Pyramid: What to Run Where**: [references/testing-pyramid-what-to-run-where.md](references/testing-pyramid-what-to-run-where.md)
- **Deployment Pipeline: Complete Production Workflow**: [references/deployment-pipeline-complete-production-workflow.md](references/deployment-pipeline-complete-production-workflow.md)
- **Supply-Chain Security: SLSA Provenance + Keyless Signing**: [references/supply-chain-security-slsa-provenance-keyless-signing.md](references/supply-chain-security-slsa-provenance-keyless-signing.md)
- **Rollback Strategies**: [references/rollback-strategies.md](references/rollback-strategies.md)
- **Feature Flags**: [references/feature-flags.md](references/feature-flags.md)
- **Release Management**: [references/release-management.md](references/release-management.md)
- **Monorepo CI: Only Build What Changed**: [references/monorepo-ci-only-build-what-changed.md](references/monorepo-ci-only-build-what-changed.md)
- **Secrets Management in CI**: [references/secrets-management-in-ci.md](references/secrets-management-in-ci.md)
- **Performance Tips**: [references/performance-tips.md](references/performance-tips.md)
- **Anti-Patterns**: [references/anti-patterns.md](references/anti-patterns.md)
- **Checklist: Production-Ready Pipeline**: [references/checklist-production-ready-pipeline.md](references/checklist-production-ready-pipeline.md)

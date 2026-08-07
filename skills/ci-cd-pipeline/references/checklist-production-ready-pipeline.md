## Checklist: Production-Ready Pipeline

- [ ] Unit + integration tests on PRs, E2E on main merges
- [ ] Images deployed by immutable `@sha256` digest, computed once and threaded via job outputs
- [ ] SLSA provenance attached + image signed keyless (cosign/Sigstore); verified before deploy
- [ ] Signature/provenance enforced at admission (Kyverno / policy-controller), not just in CI
- [ ] Reusable workflows and third-party actions pinned to a tag or full SHA (not `@main`)
- [ ] `permissions:` set to least privilege per job (`packages: write`, `id-token: write` only where needed)
- [ ] Deploy jobs include cloud auth (OIDC) + kubeconfig + `kubectl` setup — not assumed present
- [ ] Staging deploy with smoke tests before production
- [ ] Manual approval gate for production (required reviewers on the `production` environment)
- [ ] Canary with metric-gated promotion + auto-rollback (Argo Rollouts/Flagger, or port-forwarded metrics)
- [ ] Slack notification on deploy success/failure
- [ ] Concurrency control prevents parallel deploys
- [ ] Secrets scoped to environments, rotated quarterly (or replaced by OIDC/trusted publishing)
- [ ] CI completes in under 10 minutes for PRs; redundant runs cancelled on new pushes
- [ ] Feature flags for risky changes
- [ ] Database migrations are reversible (expand-contract for breaking changes)
- [ ] Test matrix covers only supported runtimes (Node 22/24 in 2026; drop EOL 18/20)

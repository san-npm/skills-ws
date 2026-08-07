## Anti-Patterns

1. **Testing everything in E2E** — push logic down to unit tests
2. **No concurrency control** — two deploys simultaneously = disaster
3. **`npm install` instead of `npm ci`** — non-deterministic
4. **No timeout on jobs** — hung processes burn minutes
5. **Force-pushing over failures** — fix the failure, don't skip gates
6. **Deploying Friday at 5pm** — your pipeline is fine, your on-call won't be
7. **Deploying mutable tags (`:latest`, a re-derived `:${{ github.sha }}`)** — pin to the pushed `@sha256` digest so what you tested is what runs
8. **`uses: org/workflow@main`** — a moving ref is a supply-chain foothold; pin to a tag or full SHA and let Dependabot bump it
9. **Trusting CI-side signature checks alone** — a compromised runner can skip them; enforce signatures/provenance at admission (Kyverno/policy-controller)

---

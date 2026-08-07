## Action Version Matrix (July 2026)

Pin to these majors (or the exact SHA for the major). All listed majors run on the **Node 24** runtime. GitHub switched the Actions runtime default to Node 24 on **2026-06-16**, so any action still on Node 20 warns (the `ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true` opt-out lasts only until Node 20 is removed in fall 2026); bump them.

| Action | Pin | Notes |
|---|---|---|
| `actions/checkout` | `@v7` | v7 blocks checking out fork PR heads under `pull_request_target`/`workflow_run`. |
| `actions/setup-node` | `@v6` | |
| `actions/cache` | `@v6` | v6 = ESM migration; v5 still receives releases. |
| `actions/upload-artifact` | `@v7` | v7 adds non-zip uploads (`compression-level`/`archive`). **Not symmetric** with download. |
| `actions/download-artifact` | `@v8` | Pairs with upload v7; major numbers differ — don't assume they match. |
| `actions/attest-build-provenance` | `@v4` | Now a thin wrapper over `actions/attest@v4`. |
| `docker/build-push-action` | `@v7` | v7 = Node 24 default; requires runner ≥ v2.327.1 (GitHub-hosted is fine). |
| `docker/setup-buildx-action` | `@v4` | |
| `docker/login-action` | `@v4` | |
| `docker/metadata-action` | `@v6` | |
| `aws-actions/configure-aws-credentials` | `@v6` | |
| `actions/dependency-review-action` | `@v5` | |
| `github/codeql-action` | `@v4` | v4 is the latest supported line; v3 remains only for older GHES (3.16-3.19). |
| `codecov/codecov-action` | `@v7` | Requires `CODECOV_TOKEN` for public repos since v4. |
| `sigstore/cosign-installer` | `@v4` | |
| `anchore/sbom-action` | `@v0.24` | 0.x — pin the exact minor, no stable major yet. |
| `aquasecurity/trivy-action` | `@v0.36` | 0.x — pin the exact minor. |
| `step-security/harden-runner` | `@v2` | Egress filtering / runtime monitoring. |
| `changesets/action` | `@v1` (v1.9+) | |

> These move fast. The durable source of truth is each action's `releases` page; verify before pinning a SHA for production.

## Contents

- Dependency Security
- Supply Chain Attack Prevention
- Provenance & Attestations (SLSA / Sigstore)
- Renovate Configuration

## Dependency Security

### Supply Chain Attack Prevention

```bash
# 1. Lock file integrity — always commit package-lock.json
npm ci  # Never npm install in CI

# 2. Audit regularly (npm 10/11: --production is gone, use --omit=dev)
npm audit --omit=dev --audit-level=moderate

# 3. Pin exact versions for critical deps
# package.json: "express": "4.18.2" (not "^4.18.2")

# 4. Use Socket.dev for supply chain analysis
npx socket npm info express  # Check for suspicious patterns

# 5. Enable npm provenance (verify package comes from expected source)
npm publish --provenance  # For package authors
```

### Provenance & Attestations (SLSA / Sigstore)

SLSA (Supply-chain Levels for Software Artifacts) is a graded framework; the
levels you actually target in mid-2026:

| SLSA level | What it guarantees | How to reach it |
|-----------|--------------------|-----------------|
| L1 | Build is scripted + provenance exists | CI builds, emit provenance |
| L2 | Provenance is signed by the build service | Hosted CI (GitHub Actions) signs |
| L3 | Build runs in a hardened, isolated runner; provenance is non-forgeable | Use the official SLSA generator / reusable workflow; no self-hosted runner reuse |

**Publish with trusted publishing (consumers can then verify origin).** npm's
trusted publishing uses GitHub Actions OIDC: no long-lived token in CI, and a
Sigstore provenance attestation binding the package to the exact repo, commit,
and workflow is generated automatically. Configure a trusted publisher for the
package on npmjs.com (GitHub Actions repo + workflow), then publish with no token:

```yaml
# .github/workflows/publish.yml
permissions:
  id-token: write   # REQUIRED for OIDC trusted publishing + Sigstore provenance
  contents: read
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v6
        with: { node-version: 24, registry-url: 'https://registry.npmjs.org' }
      - run: npm ci
      - run: npm publish   # no NODE_AUTH_TOKEN: OIDC auth, provenance published automatically
```

Requires npm 11.5.1+ and Node 22.14.0+ (Node 24 bundles a new enough npm; on
Node 22 add `npm install -g npm@latest` first). `npm publish --provenance` with a
`NODE_AUTH_TOKEN` remains only as a fallback for legacy token-based flows: classic
tokens are revoked and granular write tokens are capped at 90 days, so trusted
publishing is the durable path.

**Verify provenance before installing** (block deps that lack a trusted attestation):

```bash
# npm: audit the signatures/attestations of your whole tree
npm audit signatures            # fails if installed pkgs lack valid registry signatures

# Sign & verify arbitrary build artifacts/containers with cosign (keyless):
cosign sign --yes ghcr.io/acme/app:1.2.3        # OIDC keyless, no private key stored
cosign verify ghcr.io/acme/app:1.2.3 \
  --certificate-identity-regexp 'https://github.com/acme/.*' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com

# Verify an attached SLSA provenance attestation (predicate type slsaprovenance):
cosign verify-attestation ghcr.io/acme/app:1.2.3 \
  --type slsaprovenance \
  --certificate-identity-regexp 'https://github.com/acme/.*' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com

# Verify a GitHub-built release artifact with the official SLSA verifier:
slsa-verifier verify-artifact app.tar.gz \
  --provenance-path app.intoto.jsonl \
  --source-uri github.com/acme/app
```

**Enforce in CI** so unverified artifacts never deploy:

```bash
# Gate the pipeline: cosign exits non-zero on a failed/missing attestation.
cosign verify-attestation "$IMAGE" --type slsaprovenance \
  --certificate-identity-regexp "$EXPECTED_IDENTITY" \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  || { echo "::error::Unverified artifact — refusing to deploy"; exit 1; }
```

> Generate L3 provenance for your own builds with the official
> `slsa-framework/slsa-github-generator` reusable workflow. For container/SBOM
> policy enforcement at admission time, layer in Sigstore **policy-controller**
> (Kubernetes) or **Kyverno** image-verification rules.

### Renovate Configuration

```json
// renovate.json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended"],
  "packageRules": [
    {
      "matchUpdateTypes": ["patch"],
      "automerge": true,
      "automergeType": "pr"
    },
    {
      "matchUpdateTypes": ["minor"],
      "automerge": true,
      "automergeType": "pr",
      "schedule": ["after 10am on Monday"]
    },
    {
      "matchUpdateTypes": ["major"],
      "automerge": false,
      "labels": ["major-update"]
    }
  ],
  "vulnerabilityAlerts": {
    "enabled": true,
    "labels": ["security"]
  }
}
```

---

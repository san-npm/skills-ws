## 4b. Supply-Chain: SBOM, Provenance & Signing

For anything you ship to others or run in regulated/audited environments, attach a software bill of materials and provenance, then sign the image so consumers can verify it.

```bash
# Build with an SBOM (SPDX) + SLSA provenance attestation attached to the image
docker buildx build \
  --sbom=true \
  --provenance=mode=max \
  --tag registry.example.com/myapp:$GIT_SHA \
  --push .

# Inspect what got attached
docker buildx imagetools inspect registry.example.com/myapp:$GIT_SHA --format '{{json .SBOM}}'
docker buildx imagetools inspect registry.example.com/myapp:$GIT_SHA --format '{{json .Provenance}}'

# Generate a standalone SBOM with Syft, or scan the SBOM with Grype/Trivy
syft registry.example.com/myapp:$GIT_SHA -o spdx-json > sbom.spdx.json
trivy sbom sbom.spdx.json --exit-code 1 --severity HIGH,CRITICAL
```

**Keyless signing with cosign (recommended over long-lived keys)** — uses your CI's OIDC identity (Fulcio/Rekor), so there's no private key to leak:

```bash
# In GitHub Actions, with `id-token: write` permission set on the job:
cosign sign --yes registry.example.com/myapp:$GIT_SHA

# Attach the SBOM as a signed attestation
cosign attest --yes --predicate sbom.spdx.json \
  --type spdxjson registry.example.com/myapp:$GIT_SHA

# Verify, constraining WHO signed it and from WHICH workflow:
cosign verify \
  --certificate-identity-regexp 'https://github.com/your-org/.*' \
  --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' \
  registry.example.com/myapp:$GIT_SHA
```

> **Enforce at admission, not just at build.** A signature/SBOM is only useful if something *checks* it before running the image — wire verification into your deploy gate (e.g. a Kyverno/Sigstore policy controller on K8s, or a `cosign verify` step before `docker stack deploy`). Otherwise it's decoration.

---

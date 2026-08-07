## Contents

- Supply-Chain Security: SLSA Provenance + Keyless Signing
- Generate provenance + sign at build time
- Verify before you deploy (fail-closed gate)
- Enforce at admission time (not just in CI)

## Supply-Chain Security: SLSA Provenance + Keyless Signing

By 2026, signing artifacts and attaching verifiable provenance is table stakes, and admission controllers reject unsigned images. GitHub's native [artifact attestations](https://docs.github.com/en/actions/security-guides/using-artifact-attestations-to-establish-provenance-for-builds) generate SLSA-style provenance and sign it with Sigstore **keyless** (Fulcio short-lived certs tied to the workflow's OIDC identity — no private keys to store or rotate). Targets [SLSA](https://slsa.dev/) Build Level 3 when run from a non-falsifiable build.

### Generate provenance + sign at build time

```yaml
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      id-token: write       # OIDC identity for keyless signing (Fulcio)
      attestations: write   # required by attest-build-provenance
    outputs:
      image: ${{ steps.out.outputs.image }}
    steps:
      - uses: actions/checkout@v7
      - uses: docker/setup-buildx-action@v4
      - uses: docker/login-action@v4
        with: { registry: ghcr.io, username: '${{ github.actor }}', password: '${{ secrets.GITHUB_TOKEN }}' }

      - id: build
        uses: docker/build-push-action@v7
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
          # SBOM + provenance attestations emitted straight into the registry
          sbom: true
          provenance: mode=max

      # GitHub-native SLSA provenance attestation, signed keyless via Sigstore.
      - uses: actions/attest-build-provenance@v4
        with:
          subject-name: ghcr.io/${{ github.repository }}
          subject-digest: ${{ steps.build.outputs.digest }}
          push-to-registry: true

      # Optional explicit cosign signature (interop with non-GitHub verifiers).
      - uses: sigstore/cosign-installer@v4
      - run: cosign sign --yes ghcr.io/${{ github.repository }}@${{ steps.build.outputs.digest }}

      - id: out
        run: echo "image=ghcr.io/${{ github.repository }}@${{ steps.build.outputs.digest }}" >> "$GITHUB_OUTPUT"
```

### Verify before you deploy (fail-closed gate)

Put this in the deploy job so an unsigned or wrongly-provenanced image is never rolled out:

```yaml
      # 1) GitHub-native verification (`gh` is preinstalled on hosted runners):
      - run: |
          gh attestation verify oci://${{ needs.build.outputs.image }} \
            --repo ${{ github.repository }} \
            --predicate-type https://slsa.dev/provenance/v1
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      # 2) cosign verification, asserting the signer identity + issuer:
      - uses: sigstore/cosign-installer@v4
      - run: |
          cosign verify ${{ needs.build.outputs.image }} \
            --certificate-identity-regexp "^https://github.com/${{ github.repository }}/" \
            --certificate-oidc-issuer https://token.actions.githubusercontent.com
          cosign verify-attestation ${{ needs.build.outputs.image }} \
            --type slsaprovenance1 \
            --certificate-identity-regexp "^https://github.com/${{ github.repository }}/" \
            --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

### Enforce at admission time (not just in CI)

CI checks are advisory; a compromised CI can skip them. Enforce in-cluster so only attested images run:
- **Sigstore [policy-controller](https://docs.sigstore.dev/policy-controller/overview/)** or **[Kyverno](https://kyverno.io/)** `verifyImages` rules that require a valid Fulcio identity + SLSA provenance predicate before a pod is admitted.
- For pure source-build SLSA L3 (npm/Go/generic artifacts rather than containers), use the [slsa-framework/slsa-github-generator](https://github.com/slsa-framework/slsa-github-generator) reusable workflow to produce a non-forgeable provenance file, then verify with `slsa-verifier`.

---

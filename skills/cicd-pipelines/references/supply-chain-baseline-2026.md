## Supply-Chain Baseline (2026)

The 2026 expectation for a trustworthy pipeline. Adopt top-to-bottom; the first three are the highest ROI.

1. **Pin actions by commit SHA, not tag.** Tags are mutable — a compromised maintainer can repoint `v6` to malicious code (this has happened in the wild). Use the SHA and let Dependabot bump it: `uses: actions/checkout@<40-char-sha> # v6.0.2`.
2. **Least-privilege `permissions:`** at the top level (`contents: read`), widened per-job only as shown above.
3. **Pin runner images** (`ubuntu-24.04`), not `ubuntu-latest`, so an image migration is a deliberate, reviewed change.
4. **Dependency review on PRs** — block merges that introduce known-vulnerable or disallowed-license deps:
   ```yaml
   dependency-review:
     runs-on: ubuntu-24.04
     permissions: { contents: read, pull-requests: write }
     steps:
       - uses: actions/checkout@v6
       - uses: actions/dependency-review-action@v5
         with:
           fail-on-severity: high
           comment-summary-in-pr: always
   ```
5. **SBOM generation** for releases (SPDX/CycloneDX), attached to the release or image:
   ```yaml
   - uses: anchore/sbom-action@v0.24
     with: { format: spdx-json, output-file: sbom.spdx.json }
   ```
6. **Provenance attestations + image signing** — see the [build-image job](#build-scan-sign-and-attest-in-ci) (`actions/attest-build-provenance@v4`, `cosign sign`). This is your SLSA build-provenance layer; verify signatures/attestations at deploy time before promoting an image.
7. **Harden the runner** for sensitive jobs: `step-security/harden-runner@v2` to block unexpected egress and detect tampering.
8. **CodeQL** for code scanning on a schedule + PRs (`github/codeql-action@v4`); route SARIF to the Security tab.

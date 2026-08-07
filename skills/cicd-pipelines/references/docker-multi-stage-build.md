## Contents

- Docker Multi-Stage Build
- Build, scan, sign, and attest in CI

## Docker Multi-Stage Build

The classic footgun: `npm ci` in the build stage (dev deps included for the build), then copying `node_modules` straight into the runtime image — **shipping dev dependencies, tooling, and a larger attack surface to production.** Fix it with a dedicated deps stage that installs production-only, and copy *that* into runtime.

```dockerfile
# syntax=docker/dockerfile:1

# --- deps: production-only dependencies for the runtime image ---
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
# BuildKit cache mount keeps the npm cache warm across builds without baking it in.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# --- build: full deps (incl. dev) just to compile, never shipped ---
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
RUN npm run build

# --- runtime: minimal, non-root, prod deps only ---
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 app && adduser -u 1001 -G app -s /bin/sh -D app
# prod deps only (from the deps stage)
COPY --from=deps  /app/node_modules ./node_modules
COPY --from=build /app/dist          ./dist
COPY package.json ./
USER app
EXPOSE 3000
# Container-level liveness; pair with your orchestrator's probes.
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
```

### Build, scan, sign, and attest in CI

```yaml
build-image:
  runs-on: ubuntu-24.04
  permissions:
    contents: read
    packages: write        # push to GHCR
    id-token: write        # keyless cosign signing + attestations
    attestations: write    # actions/attest-build-provenance
  steps:
    - uses: actions/checkout@v6
    - uses: docker/setup-buildx-action@v4
    - uses: docker/login-action@v4
      with:
        registry: ghcr.io
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    - id: meta
      uses: docker/metadata-action@v6
      with:
        images: ghcr.io/${{ github.repository }}
        tags: |
          type=sha
          type=semver,pattern={{version}}
    - id: build
      uses: docker/build-push-action@v7
      with:
        context: .
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
    # Vulnerability scan — fail the build on fixable HIGH/CRITICAL CVEs.
    - uses: aquasecurity/trivy-action@v0.36
      with:
        image-ref: ghcr.io/${{ github.repository }}@${{ steps.build.outputs.digest }}
        format: sarif
        output: trivy.sarif
        severity: HIGH,CRITICAL
        ignore-unfixed: true
        exit-code: '1'
    # Keyless image signing (Sigstore/Fulcio — no key to manage).
    - uses: sigstore/cosign-installer@v4
    - run: cosign sign --yes ghcr.io/${{ github.repository }}@${{ steps.build.outputs.digest }}
    # Build provenance attestation (SLSA) bound to the pushed digest.
    - uses: actions/attest-build-provenance@v4
      with:
        subject-name: ghcr.io/${{ github.repository }}
        subject-digest: ${{ steps.build.outputs.digest }}
        push-to-registry: true
```

Always reference images by **digest** (`@sha256:...`), never a mutable tag, downstream — that is what cosign signs and what provenance attests. Verify at deploy time: `cosign verify --certificate-identity-regexp '...' --certificate-oidc-issuer https://token.actions.githubusercontent.com IMAGE@DIGEST`.

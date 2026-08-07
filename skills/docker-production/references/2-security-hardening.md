## Contents

- 2. Security Hardening
- Non-root users (mandatory)
- Read-only filesystem
- Vulnerability scanning with Trivy
- .dockerignore (don't ship your secrets — or break your build)
- No latest tag — ever

## 2. Security Hardening

### Non-root users (mandatory)

Use a **high numeric UID/GID** (e.g. 10001) so it can't collide with a real host user if the container's filesystem is bind-mounted, and so a read-only root FS still works.

```dockerfile
# Alpine
RUN addgroup -g 10001 -S app && adduser -S app -u 10001 -G app
USER app

# Debian/Ubuntu
RUN groupadd -g 10001 -r app && useradd -u 10001 -r -g app -d /app app
USER app
```

> **This applies to `scratch` and `distroless` too.** A `scratch` image with no `USER` runs as **root** — bake an `/etc/passwd` entry in the builder and copy it (or set `USER 10001:10001` numerically); see the Go example in §1. `distroless` `:nonroot` tags already run as uid 65532. There is no "the image is tiny so root is fine" exemption — root inside the container is still root against any mounted volume and a larger blast radius if the kernel is exploited.

To prove it after build: `docker run --rm myapp id` should NOT print `uid=0(root)`.

### Read-only filesystem

```yaml
# docker-compose.yml
services:
  app:
    image: myapp:1.4.2            # explicit tag — see "No latest tag" below
    read_only: true
    tmpfs:
      - /tmp:noexec,nosuid,size=100m
      - /app/cache:noexec,nosuid,size=50m
    security_opt:
      - no-new-privileges:true
```

### Vulnerability scanning with Trivy

```bash
# Scan a specific built image (use the tag/SHA you actually built, not :latest)
trivy image myapp:1.4.2

# Scan and fail CI if HIGH/CRITICAL found; skip CVEs that have no fix yet
trivy image --exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed myapp:${GITHUB_SHA}

# Scan the Dockerfile / IaC for misconfig (root user, no healthcheck, etc.)
trivy config Dockerfile

# In GitHub Actions — PIN to a release tag (or full SHA), never @master:
- name: Scan image
  uses: aquasecurity/trivy-action@0.28.0   # check github.com/aquasecurity/trivy-action/releases for current
  with:
    image-ref: myapp:${{ github.sha }}
    format: table
    exit-code: "1"
    severity: HIGH,CRITICAL
    ignore-unfixed: true   # don't fail on CVEs with no available fix
```

> **Never `@master`.** A floating action ref lets an upstream change (or a compromise) run in your pipeline without review. Pin a tag for readability or a full commit SHA for maximum integrity, and let Dependabot bump it. The same rule applies to every third-party action in your workflows.

### .dockerignore (don't ship your secrets — or break your build)

```
# Secrets & VCS — always exclude
.git
.github
.env
.env.*
!.env.example          # keep the template; re-include after a broad exclude

# Heavy / regenerated — exclude
node_modules
target
__pycache__
coverage
.nyc_output
dist                   # ONLY if you build inside the image; keep if you COPY a prebuilt dist

# Tests & editor cruft
__tests__
*.test.*
.vscode
.idea
.dockerignore
```

> **Don't blanket-exclude `*.md`, `Dockerfile`, or `docker-compose*.yml`.** Many builds legitimately need `README.md` / `LICENSE` (Go modules, some `pip`/npm packaging, license-scanning steps), and excluding `Dockerfile`/`docker-compose*.yml` breaks tools that read them from the build context (e.g. multi-Dockerfile setups, generated compose files baked in). Exclude *specific* docs you know are unused (e.g. `docs/`, `CHANGELOG.md`) rather than the whole glob, and use a `!negation` to re-include anything a broad rule swept up. Note `.dockerignore` patterns are **prefix-anchored unless they start with `**/`** — `coverage` matches only `./coverage`, not `src/coverage`.

### No `latest` tag — ever

```bash
# BAD: which version is "latest"? Nobody knows.
docker pull myapp:latest

# GOOD: semantic version or commit SHA
docker pull myapp:1.4.2
docker pull myapp:abc123f

# In CI, tag with both:
docker tag myapp:$SHA myapp:$VERSION
docker tag myapp:$SHA myapp:latest  # Only for convenience, never for deploys
```

---

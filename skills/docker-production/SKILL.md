---
name: docker-production
description: "Production Docker: multi-stage builds, security hardening, BuildKit cache/secrets, Compose Spec, SBOM/provenance/signing, networking, logging, and private registry. Use when writing Dockerfiles, hardening images, debugging containers, or shipping containers to production."
---

# Docker Production

Production Docker patterns. Multi-stage builds that actually minimize image size, security hardening, Compose configs that survive real traffic, and debugging techniques.

---

## 1. Multi-Stage Builds

> **Base images, mid-2026.** Use a current **LTS** for runtimes you don't want to babysit and current stable for everything else. As of Jul 2026: Node **24 LTS** (default, Active LTS) or **22** (Maintenance LTS until Apr 2027); Node 20 is EOL (Mar 2026); Go **1.25/1.26**; Rust current stable (**1.97**); Python **3.13** (3.14 if you've tested C-extension wheels); Postgres **17** (18 once your extensions support it); Redis **8** (or the BSD-licensed **Valkey 8** fork). Verify the latest patch tags at the official Docker Hub pages and pin a **digest** for reproducibility (see below). Always require BuildKit: `DOCKER_BUILDKIT=1` (default in modern Docker / `docker buildx`).

### Node.js

```dockerfile
# syntax=docker/dockerfile:1
# Stage 1: Install ALL deps once (cached via BuildKit), then prune to prod
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Cache mount keeps npm's cache across builds without baking it into a layer
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Stage 2: Build
FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
# Derive a clean production-only node_modules from the lockfile
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# Stage 3: Production
FROM node:24-alpine AS production
WORKDIR /app

# Security: non-root user (UID/GID 10001 — high, avoids clashing with host users)
RUN addgroup -g 10001 -S appgroup && \
    adduser -S appuser -u 10001 -G appgroup

# tini for proper PID 1 / signal handling (install before dropping privileges)
RUN apk add --no-cache tini

# Only production deps + build output, owned by the runtime user
COPY --chown=appuser:appgroup --from=build /app/node_modules ./node_modules
COPY --chown=appuser:appgroup --from=build /app/dist ./dist
COPY --chown=appuser:appgroup --from=build /app/package.json ./

# Drop to non-root for the rest of the lifecycle
USER appuser

EXPOSE 3000
ENV NODE_ENV=production

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.js"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
```

**Result:** ~150MB instead of ~1.2GB with the naive approach. The `--mount=type=cache` keeps the npm cache out of the final image *and* makes rebuilds fast; `npm ci --omit=dev` replaces the old "install twice + copy" dance.

### Python

```dockerfile
# syntax=docker/dockerfile:1
FROM python:3.13-slim AS build
WORKDIR /app

# Install build dependencies (apt cache mounts speed up rebuilds)
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev

COPY requirements.txt .
# Cache wheels across builds; --prefix gives a relocatable tree to copy later
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --prefix=/install -r requirements.txt

FROM python:3.13-slim AS production
WORKDIR /app

# Runtime dependencies only
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    libpq5 tini

# Non-root user (high numeric UID)
RUN groupadd -g 10001 -r appgroup && \
    useradd -u 10001 -r -g appgroup -d /app appuser

COPY --from=build /install /usr/local
COPY --chown=appuser:appgroup . .

USER appuser
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
EXPOSE 8000
ENTRYPOINT ["tini", "--"]
CMD ["gunicorn", "app:create_app()", "-w", "4", "-b", "0.0.0.0:8000", "--access-logfile", "-"]

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1
```

> **`apt` cache mounts:** when you mount `/var/cache/apt` and `/var/lib/apt` as caches, drop `rm -rf /var/lib/apt/lists/*` (the lists now live in the cache, not the layer) and do **not** set `docker-clean` removal. `sharing=locked` serializes concurrent builds so apt's dpkg DB stays consistent.

### Go

```dockerfile
# syntax=docker/dockerfile:1
FROM golang:1.26-alpine AS build
WORKDIR /app

# Install CA certs in the BUILDER so we control that they exist,
# then create a non-root user entry to copy into scratch.
RUN apk add --no-cache ca-certificates && \
    adduser -D -u 10001 appuser

COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /server ./cmd/server

# Scratch image — only your binary, CA bundle, and a passwd entry.
FROM scratch AS production
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
# /etc/passwd carries the appuser entry so USER resolves to a real, non-root id
COPY --from=build /etc/passwd /etc/passwd
COPY --from=build /server /server

USER appuser
EXPOSE 8080
ENTRYPOINT ["/server"]
```

**Result:** ~10MB image. Tiny, but **not** "nothing to exploit": your binary, its dependencies, the kernel/syscall surface, and the network service you expose are all still attack surface. `scratch` removes the *shell and package manager* (so RCE can't `apt install` tooling), which is a real but partial win.

> **`scratch` requires `USER` too.** A scratch image with no `USER` runs as **root (uid 0)** — exactly what the checklist below forbids. You must (a) bake a `/etc/passwd` entry in the builder and copy it, then set `USER appuser`, **or** (b) set a numeric `USER 10001:10001` (works without `/etc/passwd`, but some libs that call `user.Current()` will error). Also remember scratch has **no `/tmp`, no timezone DB, and no `HEALTHCHECK` exec** — provide `tmpfs` for temp dirs and use an external/TCP healthcheck.

**Prefer distroless for most services** — it gives you CA certs, `/etc/passwd`, timezone data, and a guaranteed-nonroot tag, while staying nearly as small and far less fiddly than `scratch`:

```dockerfile
# ... same golang:1.26-alpine build stage as above ...
FROM gcr.io/distroless/static-debian12:nonroot AS production
COPY --from=build /server /server
# distroless :nonroot already runs as uid 65532, ships CA certs + tzdata
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/server"]
```

### Rust

```dockerfile
# syntax=docker/dockerfile:1
FROM rust:1-slim AS build
WORKDIR /app

# Cache the registry + git index + compiled deps via BuildKit mounts.
# This replaces the old "build a dummy main.rs first" hack entirely.
COPY Cargo.toml Cargo.lock ./
COPY src ./src
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/usr/local/cargo/git \
    --mount=type=cache,target=/app/target \
    cargo build --release && \
    cp /app/target/release/myapp /myapp   # copy OUT of the cache mount

FROM debian:bookworm-slim AS production
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates tini

RUN groupadd -g 10001 -r app && useradd -u 10001 -r -g app app
COPY --from=build /myapp /usr/local/bin/myapp

USER app
EXPOSE 8080
ENTRYPOINT ["tini", "--"]
CMD ["myapp"]
```

> `rust:1-slim` always resolves to the current stable 1.x; pin a concrete patch (`rust:1.97-slim`) + digest for reproducible builds. Because `/app/target` is a **cache mount** (not a layer), you must `cp` the binary out before the stage ends; anything left only in the mount is not available to `COPY --from`.

### Reproducibility: pin digests, rebuild on a schedule

A tag like `node:24-alpine` is a *moving target*: the same Dockerfile builds different images week to week. For supply-chain integrity, pin the **immutable digest** and re-resolve it deliberately:

```dockerfile
# Pin the exact content, not just the tag. Keep the human-readable tag as a comment.
FROM node:24-alpine@sha256:<digest>  AS deps   # node:24.x-alpine, resolved 2026-07
```

```bash
# Get the current digest for a tag (so you can pin it)
docker buildx imagetools inspect node:24-alpine --format '{{.Manifest.Digest}}'

# Build reproducibly: clamp file timestamps so layer hashes are deterministic
SOURCE_DATE_EPOCH=$(git log -1 --format=%ct) \
  docker buildx build --output type=docker --provenance=true -t myapp:$GIT_SHA .
```

- **Rebuild automation:** pinning digests freezes *known CVEs in too*. Run a weekly job (Dependabot/Renovate "docker" updater, or a scheduled CI build) that bumps the pinned digest to the latest patch and re-runs the Trivy gate. Pin for reproducibility; rebuild on a cadence for patches.
- **Lockfiles in, not resolved at build:** copy `package-lock.json` / `go.sum` / `Cargo.lock` and use `npm ci` / `go mod download` / `cargo build --locked` so dependency versions are fixed, not floated.

---

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

## 3. Compose for Production

> **No top-level `version:` key.** It's **obsolete** under the current **Compose Specification** (Compose v2, the `docker compose` plugin) — Compose now warns `the attribute version is obsolete, it will be ignored`. Delete it. Likewise the `docker-compose` (v1, Python, hyphenated) binary is **EOL**; use `docker compose` (space).
>
> **`deploy:` is mostly Swarm-only.** A plain `docker compose up` on a single host **ignores** `deploy.replicas`, `deploy.restart_policy`, `deploy.update_config`, `deploy.rollback_config`, and `deploy.placement`; those only take effect under `docker stack deploy` (Swarm). The only `deploy` fields single-host Compose honors are **`deploy.resources.limits`** (cpus/memory → container limits) and **`deploy.resources.reservations`** (soft). For single-host equivalents use top-level **`restart:` `unless-stopped`** (not `deploy.restart_policy`) and run multiple instances with `docker compose up --scale app=3` behind a load balancer (though for real replicas/rolling updates you want Swarm, K8s, or ECS, see §9). The keys below are annotated with which mode honors them.

```yaml
# docker-compose.production.yml  — Compose Specification (no version: key)
services:
  app:
    image: registry.example.com/myapp:${VERSION}        # require an explicit tag; never :latest
    restart: unless-stopped                              # single-host restart (honored by `compose up`)
    deploy:
      # replicas/restart_policy below are SWARM-ONLY — ignored by `docker compose up`.
      # Kept for `docker stack deploy`; on a single host use `--scale app=3` + the
      # top-level `restart:` above instead.
      replicas: 3                                        # SWARM ONLY
      resources:
        limits:                                          # HONORED by single-host compose
          cpus: "1.0"
          memory: 1G
        reservations:                                    # HONORED (soft) by single-host compose
          cpus: "0.25"
          memory: 256M
      restart_policy:                                    # SWARM ONLY
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    env_file:
      - .env.production
    networks:
      - frontend
      - backend
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "5"
        tag: "{{.Name}}"
    read_only: true
    tmpfs:
      - /tmp:size=100m
    security_opt:
      - no-new-privileges:true

  postgres:
    image: postgres:17-alpine    # 18 once your extensions (pgvector, PostGIS, etc.) ship 18 builds
    restart: unless-stopped
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: myapp
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myapp"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 4G
    shm_size: 256mb  # Important for PG performance
    networks:
      - backend
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  redis:
    image: redis:8-alpine        # or valkey/valkey:8-alpine — the BSD-licensed fork, drop-in for most uses
    restart: unless-stopped
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 512M
    networks:
      - backend

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - app
    networks:
      - frontend
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 128M

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # No external access — only inter-service

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

---

## 4. Secrets Management

### Compose file-based secrets (single host, no Swarm needed)

The Compose Specification supports `secrets:` on plain `docker compose up` — each secret is mounted **read-only at `/run/secrets/<name>`**, never placed in the environment or `inspect` output. This is what the §3 compose file uses for `db_password`. Prefer this over `environment:` for anything sensitive:

```yaml
services:
  app:
    secrets:
      - db_password          # available at /run/secrets/db_password (mode 0444)
secrets:
  db_password:
    file: ./secrets/db_password.txt    # chmod 600, gitignored
    # or, to read from the host env instead of a file:
    # environment: DB_PASSWORD          # Compose Spec >= 2.x
```

In your app, read the file — and prefer the `*_FILE` convention many official images support (`POSTGRES_PASSWORD_FILE`, etc.) so the secret never transits an env var:

```js
const password = fs.readFileSync(process.env.DB_PASSWORD_FILE ?? '/run/secrets/db_password', 'utf8').trim();
```

### Docker secrets (Swarm mode)

```bash
# Create secret from stdin (don't pass it as a CLI arg — args leak via `ps`/history)
printf '%s' "$DB_PASSWORD" | docker secret create db_password -

# Use in service
docker service create --secret db_password myapp

# In container, secret is at /run/secrets/db_password
```

### BuildKit secrets (build-time)

```dockerfile
# Don't bake secrets into layers!
# BAD:
COPY .npmrc /app/.npmrc
RUN npm ci
RUN rm /app/.npmrc  # Still in layer history!

# GOOD: BuildKit mount secret
RUN --mount=type=secret,id=npmrc,target=/app/.npmrc npm ci
# Secret never appears in any layer
```

```bash
docker build --secret id=npmrc,src=.npmrc -t myapp .
```

### Environment variable security

```bash
# BAD: secrets in docker-compose.yml or CLI
environment:
  - DB_PASSWORD=hunter2  # Visible in docker inspect

# BETTER: env_file (still visible in inspect, but not in source)
env_file:
  - .env.production

# BEST: Compose/Swarm secrets + file reading (never in env, never in inspect)
# In your app:
# const password = fs.readFileSync('/run/secrets/db_password', 'utf8').trim();
```

> `env_file:` keeps secrets out of your *source*, but they are still visible to anyone who can run `docker inspect <container>` or read `/proc/<pid>/environ` on the host. Treat env vars as **non-secret config** (ports, feature flags, log level) and route real credentials through file-based secrets above.

---

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

## 5. Networking

### Custom networks for isolation

```yaml
networks:
  # Frontend network — nginx + app
  frontend:
    driver: bridge

  # Backend network — app + db + redis
  # internal: true means no external access
  backend:
    driver: bridge
    internal: true

  # Monitoring network
  monitoring:
    driver: bridge
    internal: true
```

### Service discovery

```yaml
# Services on the same network can reach each other by service name
services:
  app:
    environment:
      - DATABASE_URL=postgresql://myapp:pass@postgres:5432/myapp
      - REDIS_URL=redis://redis:6379
    networks:
      - backend

  postgres:
    networks:
      - backend  # Reachable as "postgres" from app
```

### DNS resolution debugging

```bash
# Check DNS from inside a container
docker exec -it myapp nslookup postgres
docker exec -it myapp ping redis

# Inspect network
docker network inspect backend

# Check which networks a container is on
docker inspect myapp --format '{{json .NetworkSettings.Networks}}' | jq
```

---

## 6. Logging

### JSON structured logging

```typescript
// Use JSON logging — parseable by any log aggregator
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  // Don't pretty-print in production
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }
    : undefined,
});

// Structured context
logger.info({ userId: '123', action: 'login', ip: '1.2.3.4' }, 'User logged in');
// Output: {"level":"info","time":1234567890,"userId":"123","action":"login","msg":"User logged in"}
```

### Docker logging drivers

```yaml
# JSON file (default) — good for small deployments
logging:
  driver: json-file
  options:
    max-size: "10m"
    max-file: "5"

# Fluentd — forward to ELK/Loki
logging:
  driver: fluentd
  options:
    fluentd-address: localhost:24224
    tag: "docker.{{.Name}}"

# Loki — native Grafana integration
logging:
  driver: loki
  options:
    loki-url: "http://loki:3100/loki/api/v1/push"
    loki-batch-size: "400"
    loki-retries: "3"
```

### Log rotation (don't fill your disk)

```json
// /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "5"
  }
}
```

---

## 7. Debugging Production Containers

```bash
# View logs
docker logs myapp --tail 100 -f
docker logs myapp --since 30m

# Execute command in running container
docker exec -it myapp /bin/sh

# Check environment — but DON'T dump it all: `docker exec myapp env`, `docker inspect`,
# and process args all expose secrets (DB passwords, API keys, tokens) to anyone with
# host/Docker access, and may land in logs/screen-shares. Inspect ONE non-secret key:
docker exec myapp printenv NODE_ENV
# Confirm a secret was MOUNTED (correct pattern) without printing its value:
docker exec myapp test -f /run/secrets/db_password && echo "secret present"

# Resource usage (CPU, memory, network, disk I/O)
docker stats myapp
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Events (container lifecycle)
docker events --filter container=myapp --since 1h

# Inspect everything
docker inspect myapp | jq '.[0].State'
docker inspect myapp | jq '.[0].NetworkSettings.Networks'

# Disk usage
docker system df
docker system df -v  # Verbose — shows per-image/container/volume

# Clean up — DESTRUCTIVE. On a prod host, dry-run/scope first; `-f` skips the confirm prompt.
# Run WITHOUT -f so Docker prints what it will delete and asks y/N:
docker system prune                # stopped containers + unused networks + dangling images (prompts)
docker image prune                 # dangling (untagged) images only — safe-ish
#   `image prune -a` removes EVERY image not used by a running container — including ones
#   you'll redeploy in 5 minutes. Scope by age instead of nuking everything:
docker image prune -a --filter "until=168h"     # only images older than 7 days
docker builder prune --filter "until=168h"      # trim build cache older than 7 days

# `docker volume prune` DELETES DATA. Never run blanket on a host with stateful services
# (Postgres/Redis volumes). List first, then remove a specific volume by name:
docker volume ls
docker volume rm <explicit_volume_name>          # never `volume prune -f` in prod

# Copy files from container
docker cp myapp:/app/logs/error.log ./error.log

# Check why a container exited
docker inspect myapp --format '{{.State.ExitCode}} {{.State.Error}}'
```

### Debugging networking

```bash
# Check if service is listening
docker exec myapp netstat -tlnp
docker exec myapp ss -tlnp

# DNS resolution
docker exec myapp nslookup postgres

# Test connectivity
docker exec myapp wget -qO- http://api:3000/health
docker exec myapp curl -v telnet://postgres:5432

# Packet capture (needs NET_ADMIN capability)
docker exec myapp tcpdump -i eth0 port 5432 -nn
```

---

## 8. Private Registry

### Self-hosted with Docker Registry

> For most teams, **don't self-host**: use a managed registry (GitHub Container Registry / GHCR, GitLab, AWS ECR, Google Artifact Registry, Docker Hub). They handle auth, TLS, replication, vuln scanning, and retention for you. Self-host only when you need air-gapped or on-prem control. The `registry:3` (CNCF Distribution) setup below is a baseline for that case.

```yaml
# registry/docker-compose.yml
services:
  registry:
    image: registry:3
    restart: unless-stopped
    # Bind to localhost only and terminate TLS at a reverse proxy (below), OR
    # publish 5000 and set the REGISTRY_HTTP_TLS_* vars to serve TLS directly.
    ports:
      - "127.0.0.1:5000:5000"
    volumes:
      - registry_data:/var/lib/registry
      - ./auth:/auth:ro
    environment:
      REGISTRY_AUTH: htpasswd
      REGISTRY_AUTH_HTPASSWD_REALM: "Registry Realm"
      REGISTRY_AUTH_HTPASSWD_PATH: /auth/htpasswd
      REGISTRY_STORAGE_DELETE_ENABLED: "true"   # required for GC to reclaim space
    deploy:
      resources:
        limits:
          memory: 512M

volumes:
  registry_data:
```

```bash
# Create the auth file. -B = bcrypt. Do NOT pass the password on the command line with -b:
# `htpasswd -Bbn user pass` leaks the password into your shell history and the process
# args (visible via `ps`/`docker inspect`). Use -i to read it from STDIN instead:
mkdir -p auth
read -rs -p "Registry password: " REG_PW && echo
printf '%s' "$REG_PW" | docker run --rm -i --entrypoint htpasswd httpd:2 -iBn myuser > auth/htpasswd
unset REG_PW
chmod 600 auth/htpasswd            # readers: registry only
#   (-b reads from CLI = leak; -i reads from STDIN = safe. Keep -i for real credentials.)

# Login and push (you'll be prompted for the password, not pass it as an arg)
docker login registry.example.com
docker tag myapp registry.example.com/myapp:1.0.0
docker push registry.example.com/myapp:1.0.0
```

**Terminate TLS at a reverse proxy** (Caddy/Nginx/Traefik) rather than juggling cert files in the registry env — you get automatic Let's Encrypt renewal and HTTP/2:

```caddyfile
# Caddyfile — Caddy auto-provisions + renews the TLS cert
registry.example.com {
    reverse_proxy 127.0.0.1:5000
    request_body { max_size 0 }   # don't cap large image-layer uploads
}
```

### Image signing with Cosign

Prefer **keyless** signing in CI (see §4b) — no private key to store or rotate. The keypair flow below is for local/offline use; if you keep a key, store it in a secrets manager (not the repo) and protect it with `COSIGN_PASSWORD`:

```bash
# Install cosign
brew install cosign  # or: go install github.com/sigstore/cosign/v2/cmd/cosign@latest

# Keyless (recommended) — signs against your OIDC identity:
cosign sign --yes registry.example.com/myapp:1.0.0

# Keypair (offline) — guard the private key:
cosign generate-key-pair                                   # creates cosign.key (KEEP SECRET) + cosign.pub
cosign sign --key cosign.key registry.example.com/myapp:1.0.0
cosign verify --key cosign.pub registry.example.com/myapp:1.0.0
```

### Garbage collection (causes downtime — schedule it)

Deleting a tag only removes the *reference*; the blobs stay until GC runs. **GC requires the registry to be read-only** for correctness — concurrent pushes during GC can corrupt or lose layers. Treat it as a maintenance window:

```bash
# 1. Put the registry in read-only mode (REGISTRY_STORAGE_MAINTENANCE_READONLY_ENABLED=true)
#    or stop pushes, then run GC. -m also purges now-unreferenced manifests:
docker exec registry bin/registry garbage-collect --delete-untagged \
    /etc/distribution/config.yml
# 2. Restart in read-write mode.

# Retention: registry:3 has no built-in tag retention. Prune old tags out-of-band before GC,
# e.g. with a script over the v2 API, or run a tool with policies (Harbor, JFrog) for real RBAC,
# replication, scanning, and tag-retention rules — graduate to one of those at scale.
```

> Enabling upload purging (clears *stalled* uploads, not old tags) in `config.yml`:
> ```yaml
> storage:
>   maintenance:
>     uploadpurging:
>       enabled: true
>       age: 168h        # 1 week
>       interval: 24h
> ```

---

## 9. When to Graduate from Compose

### Stay on Compose when:
- Single host deployment
- < 10 services
- Simple scaling needs (`docker compose up --scale app=N` behind a proxy; or `docker stack deploy` to a one-node Swarm if you want `deploy.replicas`)
- Team is small and doesn't need multi-host

### Move to Kubernetes when:
- Multi-host / multi-region required
- Need auto-scaling based on metrics
- Zero-downtime rolling updates are critical
- Service mesh (mTLS between services)
- Team has K8s expertise

### Move to ECS/Fargate when:
- Want managed orchestration without K8s complexity
- Already on AWS
- Need auto-scaling but not the full K8s feature set
- Small team, want less operational overhead

### Hybrid approach (common):

```bash
# Use Compose for development
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Use Compose for staging (single host)
docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d

# Use ECS/K8s for production
# Same Dockerfiles, different orchestration
```

---

## 10. Production Dockerfile Checklist

```markdown
- [ ] `# syntax=docker/dockerfile:1` + BuildKit enabled
- [ ] Multi-stage build (deps → build → production)
- [ ] Specific base image tag pinned to a DIGEST (node:24-alpine@sha256:..., never :latest)
- [ ] .dockerignore covers .git, node_modules, .env* — but NOT *.md/Dockerfile blanket-globbed
- [ ] Non-root user via USER directive — INCLUDING scratch/distroless images (numeric UID or /etc/passwd)
- [ ] CA certs present in the final image if it makes outbound TLS calls
- [ ] HEALTHCHECK defined (or external check for scratch, which can't exec one)
- [ ] Signal handling (tini or dumb-init) so SIGTERM reaches your app for graceful shutdown
- [ ] No secrets in layers (BuildKit --mount=type=secret, not COPY+rm); none in ENV either
- [ ] BuildKit cache mounts for the package manager (npm/pip/go/cargo)
- [ ] COPY least-changing files first (lockfiles before source) for layer caching
- [ ] Single CMD (one process per container — use Compose/orchestrator for multi-process)
- [ ] Trivy/Grype scan passes (no HIGH/CRITICAL, ignore-unfixed); CI action pinned (not @master)
- [ ] SBOM + provenance attached and image signed (cosign) for anything shipped/audited
- [ ] OCI labels for metadata (source, version, build date, commit)
```

```dockerfile
# Good label practice
LABEL org.opencontainers.image.source="https://github.com/org/repo"
LABEL org.opencontainers.image.version="${VERSION}"
LABEL org.opencontainers.image.created="${BUILD_DATE}"
LABEL org.opencontainers.image.revision="${COMMIT_SHA}"
```

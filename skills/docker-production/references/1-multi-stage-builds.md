## Contents

- 1. Multi-Stage Builds
- Node.js
- Python
- Go
- Rust
- Reproducibility: pin digests, rebuild on a schedule

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

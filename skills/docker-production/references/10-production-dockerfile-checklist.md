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

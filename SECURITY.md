# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | ✅ Current |
| < 1.0   | ❌ No longer supported |

## Reporting a Vulnerability

If you discover a security vulnerability in skills-ws, please report it responsibly:

**Email:** bob@openletz.com
**Subject:** `[SECURITY] skills-ws: <brief description>`

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide a timeline for a fix.

**Do NOT open a public GitHub issue for security vulnerabilities.**

## Security Model

- **Zero runtime dependencies** — no supply chain risk from third-party packages
- **No code execution** — skills are markdown files (SKILL.md), not executable code
- **No eval/exec patterns** — the CLI copies files only, never evaluates content
- **Environment-only credentials** — skills that reference API keys use environment variables exclusively
- **VirusTotal scanned** — all skill files are periodically scanned
- **Build provenance** — npm packages are published with Sigstore provenance attestation

## Scope

This policy covers:
- The `skills-ws` npm package
- The CLI tool (`npx skills-ws`)
- Skill content in `skills/` directory

This policy does NOT cover:
- Third-party tools referenced in skill documentation (e.g., Google Analytics, VirusTotal)
- User-modified skill files after installation

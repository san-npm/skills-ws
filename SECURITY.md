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
- **Markdown instructions** — skills are SKILL.md files; the CLI copies files only, it never evaluates or executes skill content
- **One documented script exception** — `polymarket-trading` bundles an optional helper (`scripts/scan.mjs`); agents run it only with user approval, and it reads credentials from the environment or OS keychain, never from hardcoded values. Per the agent-skills discovery RFC, clients do not execute files under `scripts/` by default.
- **Environment-only credentials** — skills that reference API keys use environment variables exclusively
- **Pre-release scans** — skill files are scanned before each release for hidden-Unicode instruction injection (U+E0000-U+E007F, zero-width, bidi controls), embedded secrets, decode-and-execute patterns, and TLS-bypass instructions
- **Publishing** — releases are published by the maintainer with 2FA; npm trusted publishing (OIDC) with Sigstore provenance attestation is planned

## Scope

This policy covers:
- The `skills-ws` npm package
- The CLI tool (`npx skills-ws`)
- Skill content in the `skills/` directory, including bundled `scripts/`

This policy does NOT cover:
- Third-party tools referenced in skill documentation (e.g., Google Analytics, VirusTotal)
- User-modified skill files after installation

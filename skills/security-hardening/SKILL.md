---
name: security-hardening
description: "Defensive code patterns — OWASP Top 10 with real fixes, authN/authZ, CORS, CSP `strict-dynamic` + Trusted Types, rate limiting, dependency security, supply-chain provenance (SLSA/sigstore), AI-app risks (prompt injection, LLM data leakage), incident response. Use when hardening application code."
---
# Security Hardening

> Disambiguation: this skill = defensive code patterns. For active offensive testing see `security-pentester`. For runtime threat intel (URL/wallet/domain scans) see `security-sentinel`.

## Safety gate

Before executing commands or changing external systems, confirm scope, credentials, target environment, rollback, and required approval. Pin and verify third-party artifacts; never expose secrets to client code or logs.

## Reference guide

Read only the references needed for the current request:

- **OWASP Top 10: Vulnerable Code → Fixed Code**: [references/owasp-top-10-vulnerable-code-fixed-code.md](references/owasp-top-10-vulnerable-code-fixed-code.md)
- **AI-App Hardening (LLM / Agent / MCP)**: [references/ai-app-hardening-llm-agent-mcp.md](references/ai-app-hardening-llm-agent-mcp.md)
- **Authentication Deep Dive**: [references/authentication-deep-dive.md](references/authentication-deep-dive.md)
- **Authorization: RBAC and ABAC**: [references/authorization-rbac-and-abac.md](references/authorization-rbac-and-abac.md)
- **CORS Configuration**: [references/cors-configuration.md](references/cors-configuration.md)
- **Content Security Policy (nonce + strict-dynamic + Trusted Types)**: [references/content-security-policy-nonce-strict-dynamic-trusted-types.md](references/content-security-policy-nonce-strict-dynamic-trusted-types.md)
- **Rate Limiting: Distributed with Redis**: [references/rate-limiting-distributed-with-redis.md](references/rate-limiting-distributed-with-redis.md)
- **Dependency Security**: [references/dependency-security.md](references/dependency-security.md)
- **Secrets Management**: [references/secrets-management.md](references/secrets-management.md)
- **Incident Response**: [references/incident-response.md](references/incident-response.md)
- **Summary**: [references/summary.md](references/summary.md)
- **Timeline**: [references/timeline.md](references/timeline.md)
- **Impact**: [references/impact.md](references/impact.md)
- **Root Cause**: [references/root-cause.md](references/root-cause.md)
- **Remediation**: [references/remediation.md](references/remediation.md)
- **Action Items**: [references/action-items.md](references/action-items.md)
- **Security Audit Checklist (50+ Items)**: [references/security-audit-checklist-50-items.md](references/security-audit-checklist-50-items.md)

## Contents

- Security Audit Checklist (50+ Items)
- Authentication (10)
- Authorization (8)
- Input Validation (8)
- Transport & Headers (8)
- Data Protection (6)
- Dependencies (5)
- Monitoring & Response (6)
- Infrastructure (5)

## Security Audit Checklist (50+ Items)

### Authentication (10)
- [ ] Passwords hashed with Argon2id or bcrypt (cost ≥ 12)
- [ ] Brute force protection (rate limiting on login)
- [ ] Account lockout after N failed attempts
- [ ] MFA available for all users, required for admins
- [ ] JWT: short expiry (≤ 15min), pinned algorithm (RS256/EdDSA), `iss`/`aud` checked, minimal payload
- [ ] Refresh token rotation on use
- [ ] Session invalidation on password change
- [ ] Password policy follows NIST SP 800-63B: min length ≥ 12, screen against breached-password lists (e.g. HaveIBeenPwned k-anonymity API), allow all characters incl. spaces/emoji, NO forced composition rules, NO mandatory periodic resets (rotate only on suspected compromise)
- [ ] No credentials in URL parameters
- [ ] Timing-safe password comparison
- [ ] Phishing-resistant MFA (WebAuthn/passkeys) offered; TOTP recovery codes hashed + single-use

### Authorization (8)
- [ ] Server-side authorization on every endpoint
- [ ] Resource ownership verified (not just role)
- [ ] IDOR protection (can't access other users' data by changing IDs)
- [ ] Admin endpoints on separate subdomain/path with extra auth
- [ ] API keys hashed before storage
- [ ] Principle of least privilege for service accounts
- [ ] RBAC/ABAC consistently applied
- [ ] Authorization checked after authentication

### Input Validation (8)
- [ ] All inputs validated server-side (never trust client)
- [ ] Parameterized queries (no string concatenation in SQL)
- [ ] Input length limits on all fields
- [ ] File upload: type validation, size limits, separate storage
- [ ] JSON schema validation on API requests
- [ ] HTML sanitization for user-generated content
- [ ] URL validation for any user-provided URLs
- [ ] No eval() or equivalent with user input

### Transport & Headers (8)
- [ ] HTTPS everywhere (HSTS enabled)
- [ ] TLS 1.2+ only
- [ ] Secure, HttpOnly, SameSite cookies
- [ ] CORS configured correctly (not wildcard with credentials)
- [ ] CSP header set
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Referrer-Policy set

### Data Protection (6)
- [ ] PII encrypted at rest
- [ ] Database connections use TLS
- [ ] Sensitive data not logged
- [ ] No secrets in source code or env files
- [ ] Secrets rotated on schedule
- [ ] Backups encrypted and access-controlled

### Dependencies (5)
- [ ] npm audit clean (no high/critical)
- [ ] Lock file committed and used (npm ci)
- [ ] Automated dependency updates (Renovate/Dependabot)
- [ ] No unnecessary dependencies
- [ ] Supply chain monitoring (Socket.dev or similar)

### Monitoring & Response (6)
- [ ] Failed auth attempts logged and alerted
- [ ] Privilege escalation attempts detected
- [ ] Error responses don't leak stack traces
- [ ] Security events in structured logs
- [ ] Incident response plan documented
- [ ] Security contacts defined

### Infrastructure (5)
- [ ] Least privilege IAM roles
- [ ] No root/admin credentials in application
- [ ] Network segmentation (DB not public)
- [ ] Container images scanned for vulnerabilities
- [ ] Secrets in vault, not environment variables

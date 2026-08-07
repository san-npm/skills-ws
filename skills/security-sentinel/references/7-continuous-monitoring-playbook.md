## Contents

- 7. Continuous Monitoring Playbook
- Agent-Initiated Security Checks
- Incident Response Quick Actions

## 7. Continuous Monitoring Playbook

### Agent-Initiated Security Checks

An autonomous security agent should proactively scan at these trigger points:

```
TRIGGER                          ACTION                         FREQUENCY
──────────────────────────────── ────────────────────────────── ──────────
User shares a URL                → url_scan + domain_threat     Every time
User provides wallet address     → wallet_check                 Every time
New dependency added             → npm audit + snyk check       On change
Pre-deployment                   → header_scan + ssl_audit      Per deploy
Weekly maintenance               → full domain posture check    Weekly
Email campaign setup             → SPF/DKIM/DMARC validation   On setup
Smart contract interaction       → contract_scan + honeypot     Every time
File download from external      → VirusTotal file hash check   Every time
```

### Incident Response Quick Actions

```
1. PHISHING DETECTED
   → Block URL in security headers (CSP)
   → Notify affected users
   → Report it: Google Safe Browsing (safebrowsing.google.com/safebrowsing/report_phish),
     APWG (reportphishing@apwg.org), and the impersonated brand's abuse contact
   → Check if credentials were entered → force password reset

2. SCAM WALLET DETECTED
   → Block transaction
   → Warn user with specific evidence
   → Report to Chainabuse (chainabuse.com/report)
   → Check transaction history for prior interactions

3. COMPROMISED DOMAIN DETECTED
   → Revoke any API keys associated with domain
   → Update DNS if you control it
   → Notify users who may have visited
   → Check for data exfiltration in logs

4. MALICIOUS CONTRACT DETECTED
   → Revoke token approvals (approve(0))
   → Warn user with contract analysis
   → Check for pending transactions to cancel
   → Report to block explorer
```

---

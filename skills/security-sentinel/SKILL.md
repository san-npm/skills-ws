---
name: security-sentinel
description: "Perform multi-source runtime threat triage for unknown links, senders, wallets, domains, and contracts using calibrated evidence and safe handling. Use when deciding whether an external artifact can be trusted. For VirusTotal-specific CLI/API investigation, use `virustotal`; for code hardening or authorized pentesting, use the corresponding security skill."
---
# Security Sentinel

> Disambiguation: this skill = runtime threat intel. For defensive code patterns see `security-hardening`. For active offensive testing see `security-pentester`. For deep VirusTotal API workflows see the optional `virustotal` skill (this skill works standalone without it).

Autonomous threat detection and response. Scan URLs, wallets, domains, emails, and contracts before trusting them.

## Safety gate

Before executing commands or changing external systems, confirm scope, credentials, target environment, rollback, and required approval. Pin and verify third-party artifacts; never expose secrets to client code or logs.

## Reference guide

Read only the references needed for the current request:

- **Decision Framework**: [references/decision-framework.md](references/decision-framework.md)
- **1. URL & Phishing Detection**: [references/1-url-phishing-detection.md](references/1-url-phishing-detection.md)
- **2. Wallet & Address Reputation**: [references/2-wallet-address-reputation.md](references/2-wallet-address-reputation.md)
- **3. Smart Contract Risk Assessment**: [references/3-smart-contract-risk-assessment.md](references/3-smart-contract-risk-assessment.md)
- **4. Email Header Analysis**: [references/4-email-header-analysis.md](references/4-email-header-analysis.md)
- **5. Domain Intelligence**: [references/5-domain-intelligence.md](references/5-domain-intelligence.md)
- **6. Threat Intelligence Lookups**: [references/6-threat-intelligence-lookups.md](references/6-threat-intelligence-lookups.md)
- **7. Continuous Monitoring Playbook**: [references/7-continuous-monitoring-playbook.md](references/7-continuous-monitoring-playbook.md)
- **8. Result Caching**: [references/8-result-caching.md](references/8-result-caching.md)
- **9. API Quick Reference**: [references/9-api-quick-reference.md](references/9-api-quick-reference.md)

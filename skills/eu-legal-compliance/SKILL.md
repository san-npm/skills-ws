---
name: eu-legal-compliance
description: "Navigate GDPR, DSA, DMA, EU AI Act, NIS2, and consumer protection — with specific article references, deadlines, and penalties."
---

# EU Legal Compliance

## GDPR (Regulation 2016/679)

### Lawful Bases (Art. 6)

| Basis | Use Case | Notes |
|-------|----------|-------|
| **Consent** (Art. 6(1)(a)) | Marketing emails, cookies | Must be freely given, specific, informed, unambiguous. Withdrawable. |
| **Contract** (Art. 6(1)(b)) | Service delivery, billing | Only data strictly necessary for the contract |
| **Legal obligation** (Art. 6(1)(c)) | Tax records, AML | Must identify the specific law |
| **Vital interests** (Art. 6(1)(d)) | Medical emergency | Rarely applicable for tech companies |
| **Public interest** (Art. 6(1)(e)) | Government services | Requires legal basis in member state law |
| **Legitimate interest** (Art. 6(1)(f)) | Analytics, fraud prevention, B2B marketing | Requires LIA (balancing test). Document it. |

### Data Subject Rights Implementation

| Right | Article | Response Deadline | Notes |
|-------|---------|-------------------|-------|
| Access | Art. 15 | 30 days | Provide copy in common electronic format |
| Rectification | Art. 16 | 30 days | Must notify recipients |
| Erasure ("right to be forgotten") | Art. 17 | 30 days | Exceptions: legal obligation, public interest |
| Restrict processing | Art. 18 | 30 days | Data kept but not processed |
| Data portability | Art. 20 | 30 days | Machine-readable format (JSON/CSV) |
| Object | Art. 21 | 30 days | Absolute for direct marketing |
| Automated decision-making | Art. 22 | 30 days | Right to human review |

**Build:** API endpoint or admin panel to handle DSARs. Log every request with timestamp, action taken, and completion date. See `references/dsar-implementation-checklist.md`.

### Breach Notification (Art. 33-34)

```
Discovery → 72h → Notify supervisory authority (Art. 33)
         → "Without undue delay" → Notify affected individuals if high risk (Art. 34)
```

**What to report:** Nature of breach, categories/numbers affected, DPO contact, likely consequences, mitigation measures. Document ALL breaches even if not reportable (Art. 33(5)).

### DPIA — Data Protection Impact Assessment (Art. 35)

**Required when:** Systematic profiling, large-scale special category data, public area monitoring, new tech with high risk.

Checklist: see `references/dpia-template.md`

### Cross-Border Transfers (Post-Schrems II)

| Mechanism | Status | When to Use |
|-----------|--------|-------------|
| **Adequacy decision** (Art. 45) | EU-US Data Privacy Framework (2023) | US companies in DPF list |
| **SCCs** (Art. 46(2)(c)) | Valid with TIA | Default for non-adequate countries |
| **BCRs** (Art. 47) | Valid, costly | Intra-group transfers for large orgs |
| **Derogations** (Art. 49) | Limited | Explicit consent, contract necessity — not for systematic transfers |

**Transfer Impact Assessment (TIA):** Required alongside SCCs. Assess destination country surveillance laws. Document supplementary measures (encryption, pseudonymization).

### Penalties

- Up to **€20M or 4% global annual turnover** (whichever higher) — Art. 83(5)
- Lower tier: **€10M or 2%** for processor/technical violations — Art. 83(4)

## Digital Services Act (Regulation 2022/2065)

**Effective:** 17 Feb 2024 (all platforms)

| Platform Size | Obligations |
|--------------|-------------|
| **All intermediaries** | Legal representative in EU, T&C transparency, annual transparency reports |
| **Hosting services** | Notice-and-action mechanism, statement of reasons for removals |
| **Online platforms** | Trusted flaggers, ban dark patterns (Art. 25), ad transparency |
| **VLOPs/VLOSEs** (>45M EU users) | Systemic risk assessments, independent audits, data access for researchers |

**Penalties:** Up to **6% global annual turnover** (Art. 52)

## Digital Markets Act (Regulation 2022/1925)

**Applies to:** Designated gatekeepers (>€7.5B turnover OR >€75B market cap, >45M EU monthly users, >10K EU business users).

**Key obligations (Art. 5-7):**
- No self-preferencing in rankings
- Allow third-party app stores and sideloading
- Interoperability for messaging (Art. 7)
- No combining personal data across services without consent
- Allow users to uninstall pre-installed apps

**Penalties:** Up to **10% global turnover** (20% for repeat)

## EU AI Act (Regulation 2024/1689)

**Phased enforcement:** Prohibited practices from Feb 2025, high-risk obligations from Aug 2026.

| Risk Level | Examples | Requirements |
|------------|----------|-------------|
| **Prohibited** (Art. 5) | Social scoring, real-time biometric ID in public (exceptions for law enforcement), manipulative AI, emotion recognition in workplace/education | Banned outright |
| **High-risk** (Annex III) | Recruitment/HR tools, credit scoring, law enforcement, critical infrastructure | Conformity assessment, risk management, data governance, human oversight, transparency, logging |
| **Limited risk** (Art. 50) | Chatbots, deepfakes, emotion recognition | Transparency obligations — must disclose AI interaction |
| **Minimal risk** | Spam filters, AI in games | No obligations (voluntary codes of conduct) |

**GPAI models (Art. 51-56):** Technical documentation, copyright compliance, transparency. Systemic risk models (>10^25 FLOPs): adversarial testing, incident reporting.

**Penalties:** Up to **€35M or 7% global turnover** for prohibited AI violations

## ePrivacy Directive (2002/58/EC)

- **Cookie consent:** Prior opt-in required for non-essential cookies (Art. 5(3))
- **Exceptions:** Strictly necessary cookies (session, load balancing, cart)
- **Marketing emails:** Opt-in required; soft opt-in exception for existing customers (similar products)
- Implement: cookie banner with reject-all equally prominent as accept-all (EDPB guidance)

## EU Consumer Protection

| Rule | Source | Key Requirement |
|------|--------|----------------|
| **14-day withdrawal** | Consumer Rights Directive 2011/83/EU, Art. 9 | Right to cancel online purchases, no reason needed |
| **Digital content** | Digital Content Directive 2019/770 | Conformity guarantee, updates obligation, 2-year liability |
| **Unfair terms** | Directive 93/13/EEC | Pre-ticked boxes void, unbalanced terms unenforceable |

## NIS2 Directive (2022/2555)

**Transposition deadline:** 17 Oct 2024. Applies to essential and important entities.

**Obligations:** Risk management measures, incident reporting (24h early warning, 72h full notification), supply chain security, business continuity, encryption policies.

**Penalties:** Essential entities up to **€10M or 2% turnover**; important entities up to **€7M or 1.4%**.

**Management liability:** Art. 20 — management bodies personally liable for non-compliance, must undergo cybersecurity training.

## European Accessibility Act (Directive 2019/882)

**Compliance deadline:** 28 June 2025

**Scope:** E-commerce, banking, transport, e-books, computers, smartphones, OS, media services.

**Requirements:** WCAG 2.1 AA as baseline. Products and services must be perceivable, operable, understandable, robust. See `references/eaa-compliance-checklist.md`.

## Compliance Priority Checklist

- [ ] Map all personal data processing activities (GDPR Art. 30 record)
- [ ] Identify lawful basis for each processing activity
- [ ] Implement cookie consent management (ePrivacy)
- [ ] Build DSAR handling workflow with 30-day SLA
- [ ] Conduct DPIAs for high-risk processing
- [ ] Appoint DPO if required (Art. 37: public authority, large-scale monitoring, special categories)
- [ ] Review cross-border transfers, implement SCCs + TIA
- [ ] DSA: implement notice-and-action, transparency reporting
- [ ] AI Act: classify AI systems by risk, begin conformity for high-risk
- [ ] NIS2: incident response plan, 24h/72h notification process
- [ ] EAA: accessibility audit against WCAG 2.1 AA by June 2025
- [ ] Document everything — accountability principle (GDPR Art. 5(2))

See `references/eu-compliance-timeline.md` for full regulatory calendar.


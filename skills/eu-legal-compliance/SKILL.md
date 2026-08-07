---
name: eu-legal-compliance
description: "EU digital/data law for product & engineering teams — GDPR, DSA, DMA, EU AI Act, ePrivacy, NIS2, consumer protection, EAA — with article refs, mid-2026 deadlines, penalty tiers, and inline DSAR/DPIA/RoPA/cookie/SCC/AI-classifier checklists. Use when building consent flows, handling DSAR/breach duties, classifying AI systems, or planning an EU compliance roadmap. Not legal advice."
---

# EU Legal Compliance

> **Scope & disclaimer.** This skill is an engineering/product-oriented reference for EU-level law as of **June 2026**. It is **not legal advice** and does not replace a qualified EU data-protection lawyer or your DPO. EU regulations apply directly, but **directives** (NIS2, EAA, ePrivacy, consumer directives) are transposed into **national law** that varies by member state — always check the local implementing act and the lead/competent authority for your establishment. Engage counsel for: high-risk processing, cross-border transfers, breach notifications, AI Act high-risk/GPAI classification, M&A/data deals, regulator inquiries, and any consumer-facing contract terms.
>
> **Controller vs processor.** Most obligations below differ by role. A **controller** decides the purposes and means of processing (Art. 4(7)); a **processor** acts only on documented controller instructions (Art. 4(8)). Joint controllers (Art. 26) need an arrangement allocating responsibilities. Identify your role per processing activity *before* applying any checklist — it changes who answers DSARs, who notifies breaches, and who signs which contract (controller↔processor needs an Art. 28 DPA).

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

**Response timing (Art. 12(3)):** Act **without undue delay** and **within one month of receipt** (a *calendar month*, not 30 days — e.g. a 15 Jan request is due 15 Feb). Extendable by **two further months** where requests are complex or numerous, but you must **inform the requester of the extension and the reasons within the first month**. If you take no action, you must tell the requester within one month and explain why + their right to complain to a DPA / seek a remedy (Art. 12(4)). Requests are normally **free**; you may charge a reasonable fee or refuse only if **manifestly unfounded or excessive**, and you bear the burden of proving that (Art. 12(5)).

| Right | Article | Response Deadline | Notes |
|-------|---------|-------------------|-------|
| Access | Art. 15 | 1 month (+2) | Copy in common electronic format; don't adversely affect others' rights (Art. 15(4)) |
| Rectification | Art. 16 | 1 month (+2) | Notify each recipient unless impossible/disproportionate (Art. 19) |
| Erasure ("right to be forgotten") | Art. 17 | 1 month (+2) | Exceptions: legal obligation, freedom of expression, public-interest, defence of legal claims (Art. 17(3)) |
| Restrict processing | Art. 18 | 1 month (+2) | Data stored but not otherwise processed; lift only with notice |
| Data portability | Art. 20 | 1 month (+2) | Only data provided by the subject, processed on consent/contract, by automated means; structured machine-readable format (JSON/CSV) |
| Object | Art. 21 | 1 month (+2) | **Absolute** for direct marketing; otherwise you may continue only on compelling legitimate grounds |
| Automated decision-making | Art. 22 | 1 month (+2) | Right to human intervention, to express a view, and to contest the decision |

**Identity verification:** You may request information to confirm identity where there are reasonable doubts (Art. 12(6)), but don't over-collect — the one-month clock starts on receipt; pausing for verification must be proportionate, not a stalling tactic.

**Build:** Expose a DSAR intake (form/email alias/in-app) and an admin tooling path to fulfil each right. Log every request immutably. Use the inline DSAR workflow below.

#### DSAR intake & fulfilment workflow (inline)

**Intake fields to capture:**
- Request ID (immutable), received-at timestamp (starts the clock), channel (email/form/in-app/phone)
- Requester identity + verification method/outcome (Art. 12(6)) and whether requester is the data subject or an authorised agent
- Right(s) invoked (access / rectification / erasure / restriction / portability / objection / Art. 22)
- Scope: accounts, products, date range, specific data categories
- Your **role** for the data in scope (controller / processor — processors forward to the controller and assist per Art. 28(3)(e))
- Due-date (received-at + 1 calendar month), extension flag + reason + extension-notice-sent date

**Fulfilment steps:**
1. **Acknowledge** within a few business days; state the statutory deadline.
2. **Verify identity** proportionately; if reasonable doubt persists, request minimal additional proof.
3. **Discover data** across all systems: primary DB, data warehouse/analytics, logs, backups, email/CRM/support tickets, third-party processors (list them — you must propagate erasure/rectification to processors and downstream recipients, Art. 19). Maintain a **data-source map** so discovery is repeatable.
4. **Apply exemptions/redactions:** withhold third-party personal data and privileged/IP material; for access, never disclose others' data (Art. 15(4)).
5. **Produce output:** access → structured copy + the Art. 15(1) info (purposes, categories, recipients, retention, source, rights, existence of automated decisions). Portability → machine-readable export (and, on request, transmit directly to another controller "where technically feasible").
6. **Execute changes:** erasure must reach backups on the next backup-rotation cycle (document your rotation interval and put the record beyond use meanwhile); restriction must be enforced in code (flag that suppresses processing).
7. **Respond & close** within one month (or notify extension within the first month). Record completion date, action taken, and any refusal + reason + complaint-rights notice.

**Free-tier exceptions:** charge/refuse only when *manifestly unfounded or excessive* — document the justification; "we get a lot of requests" is not sufficient.

### Breach Notification (Art. 33-34)

```
Discovery → 72h → Notify supervisory authority (Art. 33)
         → "Without undue delay" → Notify affected individuals if high risk (Art. 34)
```

**What to report:** Nature of breach, categories/numbers affected, DPO contact, likely consequences, mitigation measures. Document ALL breaches even if not reportable (Art. 33(5)).

### Record of Processing Activities — RoPA (Art. 30)

Required for controllers/processors with ≥250 employees, **or** where processing is not occasional, **or** involves special-category/criminal data, **or** is likely to risk rights (in practice: almost everyone). Maintain as a living register.

**Controller record (Art. 30(1)) — one row per processing activity:**

| Field | Example |
|-------|---------|
| Activity name + purpose(s) | "Customer support — resolve tickets" |
| Controller (+ joint controllers, EU rep, DPO contact) | Acme GmbH; DPO dpo@acme.example |
| Categories of data subjects | Customers, prospects |
| Categories of personal data | Name, email, order history; *flag special categories* |
| Lawful basis (per purpose) | Contract (Art. 6(1)(b)); marketing = consent |
| Recipients / processors | Zendesk (processor), Stripe (controller for payments) |
| Third-country transfers + safeguard | US → SCCs + TIA; or DPF if recipient certified |
| Retention period / criteria | 24 months after last contact |
| Technical & organisational measures (TOMs) | Encryption at rest, RBAC, MFA |

**Processor record (Art. 30(2)):** name/contacts of each controller you act for, categories of processing per controller, transfers + safeguards, and TOMs.

### DPIA — Data Protection Impact Assessment (Art. 35)

**Mandatory when** processing is "likely to result in a high risk," explicitly including: systematic & extensive **profiling with legal/significant effects** (Art. 35(3)(a)), **large-scale special-category or criminal-offence data** (Art. 35(3)(b)), **large-scale systematic monitoring of a publicly accessible area** (Art. 35(3)(c)). Also consult your DPA's **mandatory-DPIA list** (each member-state authority publishes one under Art. 35(4)) and the WP248 nine-criteria test — **two or more criteria** usually triggers a DPIA: evaluation/scoring, automated decisions with legal effect, systematic monitoring, sensitive/highly-personal data, large scale, matching/combining datasets, vulnerable subjects (children, employees), innovative tech (AI/biometrics/IoT), preventing data subjects from exercising a right/using a service.

> If a DPIA shows **high residual risk** that you cannot mitigate, you must **consult your supervisory authority before processing** (prior consultation, Art. 36).

#### DPIA template (inline)

1. **Describe the processing** — nature, scope, context, purposes; data flows diagram; categories of data & subjects; recipients; retention; data volumes.
2. **Necessity & proportionality** — lawful basis per purpose; is the data minimal vs the goal? data-minimisation, accuracy, storage-limitation measures; how data-subject rights are supported; processor/transfer safeguards.
3. **Consult stakeholders** — DPO opinion (record it), and where appropriate seek the views of data subjects/representatives.
4. **Identify & assess risks** — for each risk to rights & freedoms: source, likelihood (low/med/high), severity (low/med/high), overall rating. Cover illegitimate access, unwanted modification, and data disappearance.
5. **Mitigations** — measures + residual risk after mitigation; encryption, pseudonymisation, access controls, retention limits, human oversight, opt-outs.
6. **Sign-off & review** — owner, DPO sign-off, date; **prior consultation (Art. 36)** if high residual risk remains; scheduled review date; trigger to re-run on material change.

### Cross-Border Transfers (Post-Schrems II)

| Mechanism | Status | When to Use |
|-----------|--------|-------------|
| **Adequacy decision** (Art. 45) | Several in force (e.g. UK, Switzerland, Japan, S. Korea + the **EU–US Data Privacy Framework**, 2023) | Recipient country/programme on the Commission's adequacy list — for the US, importer must be **DPF-certified** for that data type |
| **SCCs** (Art. 46(2)(c)) | 2021 modular SCCs; **valid only with a documented TIA** | Default for non-adequate countries; pick the right module (C2C, C2P, P2P, P2C) |
| **BCRs** (Art. 47) | Valid, DPA-approved, costly/slow | Intra-group transfers for large orgs |
| **Derogations** (Art. 49) | Narrow, case-by-case | Explicit consent, contract necessity, legal claims — **not** for repetitive/systematic transfers |

> **DPF caveat (as of Jun 2026):** the EU–US Data Privacy Framework remains in force but is under legal/political challenge (a "Schrems III"-type action is foreseeable). Don't make it your *only* US transfer mechanism — keep SCCs + TIA as a fallback. Verify a US importer's live certification at the official DPF list (dataprivacyframework.gov) and confirm the data type is covered. Check current adequacy decisions at the Commission's adequacy page before relying on one.

**Transfer Impact Assessment (TIA) checklist** (required alongside SCCs/Art. 46 tools, per *Schrems II* / EDPB Recommendations 01/2020):
1. **Map the transfer** — exporter, importer, data categories, purpose, onward transfers, transit countries, processing locations (incl. sub-processors and support access from abroad).
2. **Identify the tool** — SCC module / BCR / derogation; confirm it's signed and current.
3. **Assess the destination's law & practice** — government access powers, surveillance laws, redress for non-nationals; use EDPB/EU sources and the importer's transparency reporting, not just the importer's say-so.
4. **Supplementary measures** — technical (strong **encryption with keys held in the EU/EEA**, end-to-end encryption, pseudonymisation, split processing), contractual (warranties, notice of access requests, challenge obligations), organisational (access logging, policies for handling government requests).
5. **Conclude & document** — is protection "essentially equivalent"? If not even supplementary measures suffice, **do not transfer**. Record the assessment, set a review date, and re-run on legal change.

### Penalties

- Up to **€20M or 4% global annual turnover** (whichever higher) — Art. 83(5)
- Lower tier: **€10M or 2%** for processor/technical violations — Art. 83(4)

## Digital Services Act (Regulation 2022/2065)

**Fully applicable since 17 Feb 2024** to all in-scope intermediaries. Obligations are **cumulative and layered by service type** — each tier inherits the obligations of the ones above it. Find your **most specific** category, then apply that row *plus* everything above it.

| Layer | Who it covers | Obligations added at this layer |
|-------|---------------|---------------------------------|
| **Intermediary services** (mere conduit / caching / hosting) | All providers offering services to EU recipients, regardless of establishment | Single **point of contact** for authorities (Art. 11) and for recipients (Art. 12); **T&C transparency** incl. content-moderation rules (Art. 14); **annual transparency report on moderation** (Art. 15 — *micro/small enterprises exempt* unless VLOP/VLOSE) |
| **+ EU legal representative (Art. 13)** | Only providers **with no establishment in the EU** that offer services in the EU | Appoint a named legal/natural person in a member state where they operate; that rep can be held liable for non-compliance. *(EU-established providers do NOT need this.)* |
| **+ Hosting services** | Store info at a recipient's request (incl. cloud/web hosting) | **Notice-and-action** mechanism (Art. 16); **statement of reasons** to the affected user for any restriction (Art. 17); report suspected serious criminal offences threatening life/safety (Art. 18) |
| **+ Online platforms** | Hosting that also **disseminates info to the public** (social, marketplaces, app stores) | **Internal complaint-handling** system (Art. 20); **out-of-court dispute settlement** (Art. 21); give **priority** to notices from **trusted flaggers** *(designated by the national Digital Services Coordinator, not appointed by the platform)* (Art. 22); measures against misuse (Art. 23); **ban dark patterns** in interface design (Art. 25); **ad transparency** + label (Art. 26); recommender-system transparency (Art. 27); **enhanced protection of minors**, no profiling-based ads to minors (Art. 28). **Micro/small enterprises are exempt from Arts. 20–28.** |
| **+ Online marketplaces (B2C)** | Platforms allowing consumers to conclude distance contracts with traders | **KYBC — trace your trader** (Art. 30); **compliance-by-design** of the interface (Art. 31); **inform consumers** when they bought an illegal product/service (Art. 32) |
| **+ VLOPs / VLOSEs** | Platforms/search engines with **≥45M average monthly EU users**, *designated by the Commission* | Annual **systemic-risk assessment** + mitigation (Arts. 34–35); independent **audits** (Art. 37); recommender opt-out from profiling (Art. 38); **public ad repository** (Art. 39); **data access for vetted researchers** (Art. 40); compliance function + **supervisory fee** to the Commission (Art. 43) |

**Establishment matters:** Art. 13's legal-representative duty is **only** for providers with **no EU establishment** that nonetheless target the EU. Don't tell an EU-incorporated company it needs an Art. 13 rep — it needs Art. 11/12 contact points instead.

#### Notice-and-action workflow (Art. 16, inline — for hosting/platforms)

1. **Easy-to-use electronic submission**, allowing a notice with: explanation of *why* the content is illegal, the exact **URL/location**, the notifier's name + email (except for CSAM/Art. 18 cases), and a good-faith accuracy statement.
2. **Confirm receipt** to the notifier without undue delay.
3. **Decide in a timely, diligent, non-arbitrary, objective** manner; a notice that lets a diligent provider identify illegality without detailed legal examination gives you **actual knowledge** (affecting Art. 6 liability-exemption).
4. **Statement of reasons (Art. 17)** to the affected user for any removal/disabling/demotion/account action: the decision + grounds (legal vs T&C), facts relied on, use of automated means, and **redress options** (internal complaint Art. 20, out-of-court Art. 21, courts).
5. **Internal complaint handling (Art. 20)** for online platforms: free, ≥6 months to appeal, not solely automated, reversible.
6. **Log decisions** and (for non-micro/small) feed the EU **Transparency Database** + your Art. 15/24 reports. Give **priority** to trusted-flagger notices — but you do **not** designate trusted flaggers; the **Digital Services Coordinator** of the establishing member state does (Art. 22).

**Penalties:** up to **6% of global annual turnover** (Art. 52); periodic penalties up to 5% of average daily worldwide turnover for ongoing breaches. Enforcement: national **DSC** (lead = country of establishment, or the rep's country); for VLOPs/VLOSEs, the **European Commission** directly.

## Digital Markets Act (Regulation 2022/1925)

**Applies to:** Designated gatekeepers (>€7.5B turnover OR >€75B market cap, >45M EU monthly users, >10K EU business users).

**Key obligations (Art. 5-7):**
- No self-preferencing in rankings
- Allow third-party app stores and sideloading
- Interoperability for messaging (Art. 7)
- No combining personal data across services without consent
- Allow users to uninstall pre-installed apps

**Penalties:** Up to **10% global turnover** (20% for repeat)

## Data Act (Regulation 2023/2854)

**Applicable since 12 Sep 2025.** Connected products and related services must give users access to the data they generate and allow sharing with third parties; data-processing (cloud) providers must enable switching and remove switching charges over time; unfair data-sharing terms imposed on SMEs are unenforceable; public bodies can request data in emergencies. Relevant if you ship IoT/connected devices or cloud services to the EU.

## EU AI Act (Regulation 2024/1689)

**Phased application** (in force 1 Aug 2024). Note: this is a *staggered* rollout — several obligations are already live in 2026.

| Date | Becomes applicable |
|------|--------------------|
| **2 Feb 2025** | **Prohibited practices (Art. 5)** + **AI-literacy** duty for providers/deployers (Art. 4) — *already in effect* |
| **2 Aug 2025** | **GPAI model** obligations (Arts. 53–55), **governance** (AI Office / national authorities), most **penalty** provisions — *already in effect*. GPAI models placed on the market **before** this date have until **2 Aug 2027** to comply. |
| **2 Aug 2026** | **Most remaining obligations** apply, including the **Art. 50** transparency duties for new systems. But the **Digital Omnibus on AI** (adopted Jun 2026: Parliament 16 Jun, Council 29 Jun) **defers Annex III high-risk obligations to 2 Dec 2027**; Art. 50 content-marking for systems placed on the market *before* 2 Aug 2026 applies from **2 Dec 2026** |
| **2 Aug 2027** | End of the GPAI legacy-model grace period |
| **2 Dec 2027** | **Annex III high-risk** systems (deferred from 2 Aug 2026 by the Digital Omnibus) |
| **2 Aug 2028** | **Annex I high-risk** systems (AI that is a safety component of, or itself, a product already covered by EU product-safety law, e.g. machinery, medical devices, toys); deferred from 2 Aug 2027 by the Digital Omnibus |

> Treat dates as the current schedule verified on 7 Aug 2026. The **Digital Omnibus on AI** entered into force on **27 Jul 2026**; it also adds prohibitions on AI that generates non-consensual intimate content or CSAM. Verify against the current EUR-Lex text before relying on a date for go-live planning.

| Risk Level | Examples | Requirements |
|------------|----------|-------------|
| **Prohibited** (Art. 5) | Social scoring; untargeted facial-image scraping to build databases; manipulative/exploitative AI causing harm; *real-time* remote biometric ID in public for law enforcement (narrow exceptions); **emotion recognition in workplace/education — except for medical or safety reasons**; biometric categorisation inferring sensitive traits | Banned (with the Art. 5 carve-outs) |
| **High-risk** (Annex III) | Recruitment/HR & worker management, credit scoring, essential private/public services eligibility, biometrics, critical infrastructure, education scoring, law enforcement, migration | Risk-management system, data governance, technical documentation, logging, transparency to deployers, **human oversight**, accuracy/robustness/cybersecurity, conformity assessment + CE marking, registration in the EU database |
| **Limited risk** (Art. 50) | Chatbots, generative/deepfake content, *permitted* emotion-recognition systems | Transparency: disclose users are interacting with AI; **machine-readable marking** of AI-generated/manipulated content; label deepfakes |
| **Minimal risk** | Spam filters, AI in games | No mandatory obligations (voluntary codes) |

> The "emotion recognition is banned outright" shorthand is wrong: Art. 5 prohibits it **in the workplace and education**, *but allows it for medical or safety reasons*; elsewhere it falls under Art. 50 transparency. Likewise some Annex III "high-risk" uses can be exempted under **Art. 6(3)** if the system doesn't pose a significant risk (e.g. narrow procedural task) — document that assessment.

**GPAI models (Arts. 51–56):** all GPAI providers — technical documentation, info/documentation to downstream providers, a **copyright policy** (incl. respecting text-and-data-mining opt-outs), and a **public summary of training content**. A model is classed **systemic-risk** if it has "high-impact capabilities" — presumed when **training compute > 10^25 FLOP** **or** by **European Commission designation** (Art. 51); add model evaluation/adversarial testing, systemic-risk assessment & mitigation, **serious-incident reporting**, and cybersecurity. Note the threshold is a rebuttable presumption, not the only route in.

#### AI system classifier (inline decision tree)

1. **Is it an "AI system" (Art. 3(1)) or a GPAI model?** If a general-purpose model → apply GPAI duties (and systemic-risk duties if >10^25 FLOP or Commission-designated).
2. **Does it match any Art. 5 prohibited practice?** → **Stop / redesign.** (Re-check the carve-outs, e.g. emotion recognition for medical/safety.)
3. **Is it Annex I (safety component of a regulated product) or Annex III (listed high-risk domain)?** → likely **High-risk** (live 2 Dec 2027 for Annex III, 2 Aug 2028 for Annex I, per the Jun 2026 Digital Omnibus), unless **Art. 6(3)** exemption applies (document it). Determine if you are **provider** (build/badge it) or **deployer** (use it); duties differ.
4. **Does it interact with humans, generate/manipulate content, or do emotion recognition/biometric categorisation (where permitted)?** → **Limited risk (Art. 50)** transparency + content-marking.
5. **Otherwise** → Minimal risk; consider a voluntary code and still honour GDPR/IP/consumer law.

**Penalties:** up to **€35M or 7% of global annual turnover** for prohibited-AI violations; **€15M or 3%** for most other obligations (incl. high-risk); **€7.5M or 1%** for supplying incorrect/misleading information. (Caps use the *higher* figure; SMEs/startups take the *lower* of the two.)

## ePrivacy Directive (2002/58/EC, as transposed nationally)

> The proposed **ePrivacy Regulation** was formally withdrawn by the Commission (withdrawal published in the Official Journal on 6 Oct 2025), so the directive (and your member state's implementing law, e.g. PECR in the UK, TTDSG/TDDDG in Germany, the French *Code des postes*) governs for the foreseeable future. Consent for cookies must meet the **GDPR consent standard** (freely given, specific, informed, unambiguous, easily withdrawable).

- **Cookie/tracker consent:** Prior opt-in required for **any storage of, or access to, information on the user's device** that is not strictly necessary (Art. 5(3)) — covers cookies, localStorage, SDKs, pixels, fingerprinting.
- **Strictly-necessary exception:** only session/auth, load-balancing, cart, and security cookies the *user explicitly requested*; analytics and ads are **not** strictly necessary.
- **Marketing email/SMS:** opt-in required; narrow **soft opt-in** for existing customers buying *similar* products, provided every message offers an easy unsubscribe.

#### Cookie-consent checklist (inline)

- [ ] **No non-essential cookies/SDKs fire before consent** (no pre-loading analytics/ads on page load).
- [ ] Banner offers **"Reject all" as prominent and easy as "Accept all"** (no dark patterns; EDPB cookie-banner guidance + national DPA decisions, e.g. CNIL).
- [ ] **No pre-ticked boxes**; granular toggles per purpose (analytics / personalisation / advertising), all off by default.
- [ ] Withdrawing consent is **as easy as giving it** (persistent "manage cookies" link), and withdrawal **stops the trackers**.
- [ ] **Consent logged**: timestamp, banner version, choices, consent-string (e.g. TCF) — retained as proof.
- [ ] Re-prompt when purposes/vendors materially change; set a sensible consent **refresh interval**.
- [ ] **Cookie policy** lists each cookie/vendor, purpose, duration; kept in sync with what actually fires.
- [ ] If using Google Consent Mode / a CMP, confirm it actually **blocks tags pre-consent**, not just flags them.

## EU Consumer Protection

| Rule | Source | Key Requirement |
|------|--------|----------------|
| **14-day withdrawal** | Consumer Rights Directive 2011/83/EU, Art. 9 | Right to cancel online purchases, no reason needed |
| **Digital content** | Digital Content Directive 2019/770 | Conformity guarantee, updates obligation, 2-year liability |
| **Unfair terms** | Directive 93/13/EEC | Pre-ticked boxes void, unbalanced terms unenforceable |

## NIS2 Directive (2022/2555)

**Directive — transposed into national law.** The transposition deadline was **17 Oct 2024**, but as of Jun 2026 several member states transposed **late**; some implementing laws and the entity-registration regimes are still bedding in (the Commission opened infringement proceedings against laggards in 2024–25). **Check your member state's NIS2 act and its competent authority/registration portal**, and whether you must self-register as an essential/important entity. Applies to medium+ entities in listed sectors (energy, transport, banking, health, digital infrastructure, ICT service management, public admin, etc.); "**essential**" vs "**important**" entities differ mainly in supervision intensity and penalty ceilings, not in baseline duties.

**Risk-management measures (Art. 21):** an all-hazards baseline incl. risk-analysis policies, incident handling, business continuity/backups & crisis management, **supply-chain security**, vuln handling & disclosure, security testing/audits, **cryptography & encryption** policies, access control & MFA, and HR security.

**Incident reporting (Art. 23) — phased to the CSIRT/competent authority:**

| Stage | Deadline | Content |
|-------|----------|---------|
| **Early warning** | within **24 h** of becoming aware | flag whether suspected unlawful/malicious act or cross-border impact |
| **Incident notification** | within **72 h** | initial assessment (severity, impact, indicators of compromise) — *this is the 72-h step; it is NOT the "full"/final report* |
| **Intermediate updates** | on request / on status change | as the authority requests |
| **Final report** | within **1 month** of the incident notification | detailed description, root cause, mitigation, cross-border impact (interim report if ongoing) |

Trigger: report **significant incidents** (serious operational disruption / financial loss, or material impact to others). Some sectors face additional rules (e.g. **DORA** for finance, which can take precedence as *lex specialis*).

**Penalties:** **essential** entities up to **€10M or 2%** of global annual turnover (higher applies); **important** entities up to **€7M or 1.4%**.

**Management accountability (Arts. 20 & 32):** management bodies must **approve and oversee** the risk-management measures and **undergo cybersecurity training**. Member states must ensure they can be **held accountable**, and authorities may impose **temporary management bans** for essential entities and other consequences. *Whether this amounts to personal civil/financial liability depends on the national implementing law* — don't assume uniform "personal liability"; check the local act.

## European Accessibility Act (Directive 2019/882)

**Now in force — the obligation date was 28 June 2025**, so as of Jun 2026 in-scope products/services placed on the EU market must **already be accessible**; treat this as **ongoing compliance + remediation**, not a future project. (A transitional window exists for some service contracts/self-service terminals running until ~2030, and **microenterprises providing *services*** are exempt — but microenterprise *product* manufacturers are not fully off the hook. Check your national transposing law.)

**Scope:** consumer-facing **e-commerce**, consumer banking, e-books & dedicated readers, electronic communications, **websites/mobile apps**, ticketing & check-in machines, ATMs/payment terminals, computers/OS, smartphones, and access to audiovisual media services.

**Requirements:** the EAA sets functional accessibility requirements (Annex I). In practice you demonstrate conformity against the **harmonised standard EN 301 549**, which references **WCAG**. As of mid-2026, **target WCAG 2.2 Level AA** and track EN 301 549 updates — do **not** treat WCAG 2.1 AA as the full baseline (it's the older floor). Build for **perceivable, operable, understandable, robust (POUR)**.

#### EAA / accessibility audit checklist (inline)

- [ ] **Determine scope & role** — are you a manufacturer, importer, distributor, or service provider of an in-scope product/service? (Each has distinct duties; microenterprise *service* exemption?)
- [ ] **Automated scan** (axe / Lighthouse / WAVE / Pa11y) across key flows — catches ~30–40% of issues only.
- [ ] **Manual audit to WCAG 2.2 AA / EN 301 549**: keyboard-only operation (no traps), visible focus, logical focus order; **screen-reader** pass (NVDA + JAWS on Windows, VoiceOver on macOS/iOS, TalkBack on Android); colour-contrast ≥ 4.5:1 (text) / 3:1 (large/UI); not relying on colour alone; **text resize to 200%** and reflow at 400% zoom without loss; captions/transcripts for media; meaningful **alt text**; correct **ARIA** roles/labels and semantic HTML; accessible forms (labels, error identification & suggestions); accessible PDFs/e-books.
- [ ] **Real assistive-tech & disabled-user testing**, not just tooling.
- [ ] **Accessibility statement** published (status, known limitations, feedback/contact channel, enforcement-procedure reference) — many national laws require it.
- [ ] **Conformity documentation** kept (how you meet Annex I / EN 301 549) and a remediation backlog with owners/dates.
- [ ] **CI guardrails** — add automated a11y checks (e.g. `axe-core`/`jest-axe`/Playwright) to prevent regressions, and design-system component audits.

> Member states designate market-surveillance/enforcement authorities and may levy penalties and order withdrawal of non-compliant products/services; consumers and bodies can file complaints. Check the local transposing act for penalty levels and the complaint route.

## Compliance Priority Checklist

- [ ] Map all personal data processing activities into an **Art. 30 RoPA**; record **controller vs processor** role per activity
- [ ] Identify and document a **lawful basis** for each processing activity (LIA for legitimate interest)
- [ ] Implement **cookie/tracker consent** that blocks non-essential tags pre-consent (ePrivacy)
- [ ] Build a **DSAR workflow** with a **one-month** statutory deadline (calendar month, +2 months extension with first-month notice)
- [ ] Conduct **DPIAs** for high-risk processing; **prior-consultation (Art. 36)** if high residual risk
- [ ] Appoint a **DPO** if required (Art. 37: public authority; core activities = large-scale systematic monitoring; or large-scale special-category/criminal data)
- [ ] Review cross-border transfers; implement **SCCs + a documented TIA** (don't rely on DPF alone)
- [ ] Put an **Art. 28 DPA** in place with every processor; vet sub-processors
- [ ] **DSA:** apply your service-layer obligations; implement notice-and-action + statements of reasons; transparency reports (unless micro/small)
- [ ] **AI Act:** run the classifier; check Art. 5 prohibitions (live since Feb 2025); ship Art. 50 transparency; start conformity for Annex III high-risk (deferred to **2 Dec 2027** by the Digital Omnibus)
- [ ] **Data Act:** if you ship connected products or cloud services, implement user data access/sharing and cloud-switching duties (applicable since 12 Sep 2025)
- [ ] **NIS2:** confirm in-scope + register; incident-response plan with **24 h / 72 h / 1-month-final** reporting; check the national act
- [ ] **EAA:** maintain accessibility against **WCAG 2.2 AA / EN 301 549** (obligation already live since 28 Jun 2025); publish an accessibility statement
- [ ] Document everything — **accountability** principle (GDPR Art. 5(2))
- [ ] **Have qualified EU counsel / your DPO review** anything high-risk before go-live

## Key dates & regulatory timeline (as of Jun 2026)

| Status | Date | Milestone |
|--------|------|-----------|
| ✅ past | 25 May 2018 | GDPR applies |
| ✅ past | 17 Feb 2024 | DSA fully applicable to all intermediaries |
| ✅ past | 17 Oct 2024 | NIS2 national-transposition deadline (several states transposed late — verify local status) |
| ✅ past | 2 Feb 2025 | **AI Act:** prohibited practices (Art. 5) + AI-literacy (Art. 4) apply |
| ✅ past | 28 Jun 2025 | **EAA** obligation date — products/services must already be accessible |
| ✅ past | 2 Aug 2025 | **AI Act:** GPAI obligations, governance & most penalties apply |
| ✅ past | 12 Sep 2025 | **Data Act** applies |
| 🔜 upcoming | **2 Aug 2026** | **AI Act:** most remaining obligations incl. Art. 50 transparency for new systems (Annex III high-risk deferred by the Digital Omnibus, see below) |
| 🔜 upcoming | 2 Dec 2026 | **AI Act:** marking of AI-generated content applies to systems placed on the market before 2 Aug 2026 |
| 🔜 upcoming | 2 Aug 2027 | **AI Act:** GPAI legacy-model grace period ends |
| 🔜 upcoming | 2 Dec 2027 | **AI Act:** **Annex III high-risk** systems (deferred from 2 Aug 2026 by the Digital Omnibus) |
| 🔜 upcoming | 2 Aug 2028 | **AI Act:** **Annex I** (regulated-product) high-risk systems (deferred from 2 Aug 2027) |

> **Verify before relying on a date.** Confirm against the primary sources: EUR-Lex (regulation texts), the EU AI Act timeline (artificialintelligenceact.eu), the EDPB (edpb.europa.eu) for GDPR/transfer guidance, your national DPA and NIS2/EAA competent authorities, and the Commission's adequacy/DPF pages. Directive deadlines and penalty levels can differ by member state.

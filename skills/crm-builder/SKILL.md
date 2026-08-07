---
name: crm-builder
description: "Architect vendor-neutral CRM systems: data models, pipeline semantics, lifecycle definitions, lead scoring, deduplication, migration, and governance. Use when designing a CRM from first principles or specifying its schema and operating model. For HubSpot, Salesforce, or Pipedrive configuration, use `crm-operations`."
---

# CRM Builder

How to design a CRM that sales actually uses and that survives an audit — the data model, pipeline definitions, lifecycle logic, scoring, automation, and the privacy/compliance layer most "CRM checklists" skip.

This skill is the **design/architecture** layer. For platform-specific operational setup (building it inside HubSpot/Salesforce/Pipedrive admin), see the sibling `crm-operations`. For scoring models in depth see `lead-scoring`; for nurture/drip flows see `email-sequence`; for funnel stage strategy see `sales-funnel`; for forecasting and GTM metrics see `revenue-operations`. For EU specifics see `eu-legal-compliance`.

**First principle:** every field you add is a field a rep must fill, a column you must keep clean, and a piece of personal data you become legally responsible for. Model the minimum that drives a decision or an automation. Adoption dies from data-entry burden, not missing features.

---

## 1. Pipeline Design — Stages, Entry/Exit Criteria, SLA

A stage is only legitimate if it has an **objective, verifiable entry criterion** (not "rep feels good"). Vague stages produce garbage forecasts. Max 6–8 stages; more causes confusion and "parking" of deals.

### Reference pipelines

```
B2B SaaS:      Lead → MQL → SQL → Discovery → Demo → Proposal → Negotiation → Closed Won / Closed Lost
B2B Services:  Inquiry → Qualified → Scoping Call → Proposal → Contract Out → Closed Won / Closed Lost
B2C / E-comm:  Visitor → Lead → First Purchase → Repeat → VIP / Churned
PLG / Self-serve: Signup → Activated → Habit → Team Invite → Paid → Expansion
```

### Stage definitions (B2B SaaS) — entry criterion, exit criterion, SLA

| Stage | Entry criterion (objective) | Exit criterion (to advance) | SLA / max age | Default win-prob |
|-------|------------------------------|------------------------------|---------------|------------------|
| MQL | Hit marketing score threshold OR requested demo | Owner assigned + first touch logged | 1 business day to first touch | 5% |
| SQL | Rep confirmed ICP fit + a real problem (BANT/CHAMP qualified) | Discovery call booked | 3 days | 10% |
| Discovery | Discovery call held; pain + impact documented | Demo agenda agreed | 7 days | 20% |
| Demo | Tailored demo delivered to a decision influencer | Verbal interest + next step set | 7 days | 40% |
| Proposal | Pricing/scope sent in writing | Proposal acknowledged + reviewed | 10 days | 60% |
| Negotiation | Terms/redlines or procurement engaged | Verbal yes or signature path agreed | 14 days | 80% |
| Closed Won | Signed contract / payment | — | — | 100% |
| Closed Lost | Explicit no, or no response past SLA | Loss reason **required** | — | 0% |

**Rules of thumb**

- Required fields per stage gate advancement (e.g., cannot enter Proposal without `deal_amount`, `close_date`, `decision_maker`). Enforce with required-property-on-stage or validation rules.
- **Win probability belongs to the stage, not the rep's gut.** Calibrate it quarterly from your own historical conversion rate per stage; don't ship vendor defaults forever.
- One pipeline ≠ one process. Use **separate pipelines** for New Business, Expansion/Upsell, and Renewals — they have different stages and owners. Don't cram them into one.
- "Closed Lost" always requires a structured `loss_reason` (picklist, not free text) — it is your most valuable competitive-intel and product feedback dataset.
- Stalled-deal SLA: if `days_in_stage > SLA`, flag it. This is the single highest-ROI automation (see §5).

---

## 2. Data Model — Objects & Properties

Model four core objects and their relationships. Resist putting everything on the Contact.

```
Company (Account)  1 ──< many  Contact
Company            1 ──< many  Deal (Opportunity)
Contact            many >──< many  Deal   (via "associated contacts" / contact roles)
Deal               1 ──< many  Activity (email, call, meeting, note, task)
Contact            1 ──< many  Activity
```

### Property design rules

- **Type discipline:** dates as date type (not text), money as currency, categorical as **picklist/enumeration** (never free text). Free-text "Industry" is unsegmentable; an enum is.
- **Single source of truth per fact:** company size, industry, region live on **Company**, not duplicated on every Contact. Derive contact-level segmentation by rollup.
- **Naming:** `snake_case` or a consistent convention; prefix custom fields (`cf_`/`x_`) so they're distinguishable from native fields.
- **Lifecycle stage ≠ deal stage.** Lifecycle = the *person/account* relationship state; deal stage = a *specific opportunity's* progress. A customer can have a brand-new opportunity in "Discovery."
- **Mark PII fields explicitly** (see §8) and minimize them.

### Core property set (starter schema)

| Object | Property | Type | Notes |
|--------|----------|------|-------|
| Contact | `email` | email (unique key) | Primary dedupe key. Normalize to lowercase. |
| Contact | `first_name`, `last_name` | text | |
| Contact | `phone` | phone | Store E.164 (`+352…`). PII. |
| Contact | `job_title` | text | |
| Contact | `seniority` | enum | IC / Manager / Director / VP / C-level — drives scoring. |
| Contact | `lifecycle_stage` | enum | See §3. |
| Contact | `lead_source` | enum | First-touch channel (set once, never overwrite). |
| Contact | `latest_source` | enum | Last-touch (overwritten). Keep both. |
| Contact | `owner` | user ref | Assigned rep. |
| Contact | `lead_score` | number | See §4. |
| Contact | `consent_marketing` | enum/bool | `opted_in` / `opted_out` / `unset` + timestamp + source. See §8. |
| Contact | `last_activity_at` | datetime | Drives re-engagement automations. |
| Company | `domain` | text (unique key) | Primary company dedupe key. |
| Company | `name`, `industry`, `employee_count`, `annual_revenue`, `region`, `tier` | mixed | `tier` = A/B/C ICP fit. |
| Deal | `amount` | currency | |
| Deal | `stage` | enum (pipeline) | §1. |
| Deal | `close_date` | date | Required from Proposal on. |
| Deal | `pipeline` | enum | New Biz / Expansion / Renewal. |
| Deal | `loss_reason` | enum | Required on Closed Lost. |
| Deal | `next_step` | text | Required while open; empty = neglected deal. |
| Activity | `type`, `direction`, `timestamp`, `outcome` | mixed | type=call/email/meeting; outcome for calls. |

---

## 3. Lifecycle Stage Definitions

These are deliberately precise so marketing, SDRs, and AE handoffs don't argue. One owner per stage transition.

| Lifecycle stage | Definition | Set by |
|-----------------|------------|--------|
| Subscriber | Opted into content/newsletter only; no buying signal. | Marketing |
| Lead | Gave contact info via a form/event; not yet qualified. | Marketing |
| MQL (Marketing Qualified) | Crossed the lead-score threshold (§4) — fits ICP + showed intent. | Scoring automation |
| SQL (Sales Qualified) | A rep manually confirmed fit + timing; an opportunity is warranted. | SDR/AE |
| Opportunity | Has at least one open Deal. | Auto on deal create |
| Customer | Has a Closed Won deal / active subscription. | Auto on deal won |
| Evangelist | Customer who refers or provides references. | Manual / NPS trigger |
| Churned / Disqualified | Lost customer, or never-a-fit. Keep for suppression + winback, not active selling. | Auto / manual |

**Never let lifecycle stage move backward automatically** (a customer who downloads an ebook is not suddenly a "Lead"). Lifecycle is monotonic forward except for explicit Churn.

---

## 4. Lead Scoring (inline model)

Scoring decides *when* a Lead becomes an MQL. Keep it explainable. Full multi-model treatment (logistic-regression / decayed behavioral / negative scoring) lives in the `lead-scoring` skill — below is a production-ready starting model you can ship today.

**Two-axis model (recommended): Fit × Engagement.** Route on the *combination*, not a single number — a great-fit lead who hasn't engaged needs nurturing, not an AE call.

### Fit score (demographic/firmographic, max 50)

| Signal | Points |
|--------|-------:|
| Title seniority = C-level / VP | +15 |
| Title seniority = Director / Manager | +8 |
| Company size in ICP band | +12 |
| Industry in target verticals | +8 |
| Region = serviceable | +5 |
| Uses a complementary tech (from enrichment) | +5 |
| **Negative:** personal email domain (gmail/outlook) | −5 |
| **Negative:** student / competitor / job-seeker title | −20 |

### Engagement score (behavioral, max 50, with decay)

| Signal | Points |
|--------|-------:|
| Requested demo / "contact sales" | +25 |
| Pricing page viewed | +10 |
| Visited ≥3 high-intent pages in a session | +8 |
| Replied to an email (a *reply*, not an open — see §7) | +10 |
| Webinar attended (not just registered) | +8 |
| Repeat visit within 7 days | +5 |
| **Decay:** subtract 50% of engagement points if no activity in 30 days | × decay |

### Thresholds & routing

```
MQL threshold:  Fit ≥ 25  AND  Engagement ≥ 20
Hot (route to AE now):        Fit ≥ 35  AND  Engagement ≥ 35
Good fit, low engagement:     Fit ≥ 35  AND  Engagement < 20  → enroll in nurture (email-sequence)
Low fit, high engagement:     Fit < 25  AND  Engagement ≥ 35  → SDR review; often a champion at a non-ICP account
```

Re-score on every relevant event. **Audit monthly:** pull your last 200 MQLs and check the SQL→Won rate; if MQLs aren't converting, your fit weights are wrong — recalibrate, don't just raise the threshold.

---

## 5. Automation Recipes

Twenty production workflows. Each is `Trigger → Conditions → Actions`. Build the SLA/assignment/handoff ones first; they have the highest ROI.

**Assignment & routing**

1. **Round-robin assignment** — *Trigger:* new Lead with `owner` empty. *Conditions:* `lifecycle ∈ {Lead, MQL}`. *Actions:* assign next rep in round-robin pool, set `owner`, create "first touch" task due in 1 business day, notify rep.
2. **Territory/segment routing** — *Trigger:* Lead created. *Actions:* route by `region`/`company_size`/`industry` to the matching pool *before* round-robin; enterprise (>1000 emp) → senior AE queue.
3. **Reassign on rep PTO/offline** — *Trigger:* rep set out-of-office. *Actions:* reroute that rep's new inbound to backup; do not reassign open deals.
4. **Inbound-form speed-to-lead** — *Trigger:* high-intent form ("contact sales"/"demo"). *Actions:* page on-call rep immediately (mobile/Slack), 5-minute first-touch SLA. Speed-to-lead is the strongest inbound conversion lever.

**SLA & hygiene**

5. **Stalled-deal alert** — *Trigger:* daily. *Conditions:* deal open AND `days_in_stage > stage_SLA`. *Actions:* task to owner, escalate to manager if 2× SLA. (Highest-ROI automation.)
6. **Empty `next_step` nag** — *Trigger:* daily. *Conditions:* open deal AND `next_step` empty. *Actions:* task owner "set next step."
7. **No-activity re-engagement** — *Trigger:* `last_activity_at > 14d` on an open deal. *Actions:* re-engagement task + suggested email template.
8. **Close-date hygiene** — *Trigger:* daily. *Conditions:* open deal AND `close_date < today`. *Actions:* force owner to update close date (keeps forecast honest).
9. **Duplicate guard** — *Trigger:* contact/company create. *Conditions:* matching `email`/`domain` exists. *Actions:* merge or flag for review (see §6).

**Stage progression & lifecycle**

10. **Auto-advance on meeting booked** — *Trigger:* meeting scheduled via booking link. *Actions:* move deal to Discovery/Demo, set `next_step`.
11. **Lifecycle sync on deal won** — *Trigger:* deal → Closed Won. *Actions:* set Contact + Company `lifecycle = Customer`, stamp `customer_since`, trigger handoff (recipe 17).
12. **MQL promotion** — *Trigger:* `lead_score` crosses MQL threshold (§4). *Actions:* set `lifecycle = MQL`, route (recipe 1/2), notify.
13. **Disqualify loop** — *Trigger:* deal → Closed Lost with reason "not a fit". *Actions:* set `lifecycle = Disqualified`, suppress from active sequences, add to long-term nurture only if reason = "timing".

**Outreach & follow-up** (respect consent — §8)

14. **Proposal follow-up cadence** — *Trigger:* deal → Proposal. *Actions:* tasks at +2d, +5d, +10d if no reply; auto-cancel cadence when prospect replies.
15. **Demo no-show recovery** — *Trigger:* meeting `outcome = no_show`. *Actions:* immediate reschedule email, task to rep, second nudge +1d; mark `Closed Lost (no-show)` after 2 failed reschedules.
16. **Renewal pipeline creation** — *Trigger:* 90 days before `subscription_end`. *Actions:* create deal in Renewal pipeline, assign CSM/AE, task to confirm.

**Handoffs & post-sale**

17. **Won → onboarding handoff** — *Trigger:* deal won. *Actions:* create onboarding record/project, assign CSM, post structured summary (use case, stakeholders, success criteria) to onboarding channel.
18. **Churn-risk flag** — *Trigger:* health signal (usage drop / support spike / NPS detractor) OR `last_activity_at > 60d` for a Customer. *Actions:* task CSM, raise `churn_risk = high`.
19. **Win/loss survey** — *Trigger:* deal closed (won OR lost). *Actions:* send short structured survey; pipe results to `loss_reason`/`win_reason` analytics. Lost-deal insight is competitive intel.
20. **Data-decay refresh** — *Trigger:* enrichment field empty or `>180d` old on an active account. *Actions:* re-enrich (only fields you have a lawful basis to hold) and flag bounced emails as invalid.

---

## 6. Data Quality — Dedupe & Migration

### Deduplication strategy

- **Primary keys:** Contact = normalized lowercase `email`; Company = root `domain` (strip `www.`, subdomains, and free-mail domains). Never dedupe companies by name (too fuzzy).
- **Fuzzy matching** for human error: same `email` ≠ exact match when typos exist — also compare `(first_name + last_name + company_domain)` and normalized phone (E.164).
- **Merge precedence:** keep the record with the most engagement history; prefer non-empty, most-recent values field-by-field; never lose a `consent_marketing = opted_in/out` flag in a merge.
- **Prevention beats cleanup:** enforce uniqueness on create (recipe 9), normalize on input, validate email syntax + MX, reject obvious role addresses where inappropriate.

### Migration checklist (switching/consolidating CRMs)

```
[ ] Inventory source objects, field counts, and record volumes per object.
[ ] Map fields source → target (build a mapping spreadsheet; flag type changes).
[ ] Normalize before import: emails lowercase, phones E.164, dates ISO-8601, enums to target picklist values.
[ ] Dedupe IN the export (don't import dupes). Decide survivorship rules up front.
[ ] Preserve associations: contact↔company↔deal↔activity links and owners (map user IDs).
[ ] Carry over consent state + timestamps + source — legally required, not optional (§8).
[ ] Import order: Companies → Contacts → Deals → Activities → Notes (parents before children).
[ ] Dry-run on a 100-record sample; verify associations, owners, picklist mapping, dates.
[ ] Full import in batches; reconcile counts (source vs target) per object.
[ ] Spot-check 20 records end-to-end. Validate reports/forecasts reproduce.
[ ] Freeze the old system read-only; keep an exported archive (per retention policy, §8).
[ ] Re-point integrations (forms, billing, marketing, BI) and re-enable automations LAST.
```

---

## 7. Email & Activity Tracking (privacy-aware)

Sync email/calls/meetings to the timeline — but be honest about what the signals mean in 2026.

- **Email opens are NOT a reliable buying signal.** Apple Mail Privacy Protection (default for Apple Mail users) pre-fetches images, firing a "open" with no human involved; corporate security scanners and Gmail image proxying do the same. Treat opens as **directional aggregate noise**, never as per-contact intent, and never as a scoring trigger or an alert ("they opened it — call now!" is often a false positive).
- **Score on real engagement:** *replies*, link clicks to high-intent pages, demo/meeting bookings, form fills, portal logins. These require intent.
- **Link click tracking** is more reliable than opens but still inflated by URL-defense scanners (Proofpoint, Microsoft Safe Links) that pre-click links — filter known scanner user-agents/IP ranges before trusting clicks.
- **Consent & lawful basis:** logging a contact's emails and recording calls is processing personal data. Within email **automation/outreach**, honor unsubscribe and consent state (§8); don't enroll `opted_out` contacts. For nurture-flow design see `email-sequence`.
- **Call recording requires consent.** Two-party-consent jurisdictions (e.g., many US states like California, and most of the EU) require explicit notice/consent before recording. Play a disclosure, capture consent, and store the consent record. Don't blanket-record across regions without per-jurisdiction rules.
- **BCC/auto-logging caveat:** auto-logging a rep's whole mailbox can ingest personal/third-party emails. Scope logging to known contacts/domains; give reps a way to mark a thread private.

---

## 8. Privacy, Compliance & Security (do not skip)

A CRM is a regulated store of personal data (names, emails, phones, behavior, recordings, enrichment). Bake this in from day one — retrofitting consent and access control after a breach or DPA request is painful. None of this is legal advice; **confirm specifics with counsel**, and see `eu-legal-compliance` for EU detail.

### Lawful basis & consent

- **Establish a lawful basis** for each processing purpose. Under GDPR the common ones are *legitimate interest* (B2B prospecting, with a balancing test + opt-out) and *consent* (newsletters/marketing email in much of the EU under ePrivacy). Document which applies where.
- **Capture consent properly:** store `consent_marketing` *with* timestamp, source/method (form name), and the exact text shown. A boolean alone is not defensible — you must be able to prove *when and how* consent was given. Opt-in must be unticked-by-default in the EU.
- **CAN-SPAM (US) / CASL (Canada):** every marketing email needs a working unsubscribe (honored within 10 business days under CAN-SPAM; immediately is best practice), a physical postal address, and no deceptive headers/subjects. CASL is opt-in for commercial email to Canadian recipients.
- **Suppression list is sacred:** an unsubscribe/`opted_out` flag must survive merges, imports, and re-enrichment, and must suppress the contact across *all* sequences. Test this explicitly.

### Data subject rights (GDPR / CCPA/CPRA)

- Support **access, rectification, erasure ("right to be forgotten"), portability, and opt-out of sale/sharing**. You need a documented, executable process to find every record for a person across objects + integrations and export or delete it within statutory deadlines (GDPR: 1 month; CCPA: 45 days).
- Maintain a **data map / Record of Processing** (what personal data, where, why, retention, who it's shared with — sub-processors like enrichment/email vendors).

### Retention & minimization

- **Don't keep data forever.** Define retention per category (e.g., inactive lead → review/delete after 24–36 months; closed-lost prospect data per policy; recordings shorter). Automate decay/deletion (recipe 20).
- **Minimize PII:** collect only fields that drive a decision or automation. Every extra PII field is added breach surface and DPA-request scope.
- **Enrichment caveat:** third-party data enrichment must have a lawful basis and you must be able to tell a subject the source of their data. Don't silently append data you can't justify.

### Access control & security

- **Role-based access control (RBAC):** reps see their own/team's records; not the whole database. Restrict export rights (mass export = the #1 insider data-exfiltration vector).
- **Field-level permissions:** sensitive fields (revenue, personal notes, recordings, health/financial data) restricted to roles that need them.
- **Audit logs:** enable record-access and change logging; review exports and bulk edits. Required for SOC 2 and useful for incident response.
- **SSO + MFA** on the CRM; deprovision leavers immediately (offboarding checklist) — a former rep with live access is a breach.
- **Data residency:** if you have EU subjects, know where the CRM stores data and whether transfers rely on adequacy/SCCs. Some vendors offer an EU data region — choose it if required.
- **Vendor due diligence:** confirm the CRM and each integration (enrichment, dialer, email) carry SOC 2 Type II / ISO 27001 and sign a DPA before sending production PII.

---

## 9. Reporting & Forecasting

Build these core reports; tie each to a decision someone makes.

- **Pipeline value by stage** (and stage-weighted) — coverage vs quota.
- **Weighted revenue forecast** — Σ (`amount` × stage win-probability) by close month. Calibrate probabilities from your own history (§1), not vendor defaults.
- **Win rate** by source / owner / segment / month — find where you actually win.
- **Sales-cycle length** by stage (where do deals stall?) — feeds your stage SLAs.
- **Stage conversion funnel** (MQL→SQL→Demo→Won) — find the leak.
- **Activity metrics** per rep (calls/emails/meetings) — leading indicator; watch as input, not vanity.
- **Loss-reason analysis** — top reasons drive product/pricing/competitive plays.
- **Cohort retention / NRR** for customers — pull renewal & expansion signal (see `revenue-operations`).
- **Lead-source ROI** — pipeline & revenue by `lead_source`, closing the loop to marketing spend.

For deep forecasting models and RevOps dashboards, see `revenue-operations`.

---

## 10. Tool Selection

All prices **per user/seat per month, as of Jun 2026** — CRM pricing changes often and varies by region/billing cycle/onboarding fees. **Verify live before recommending** at each vendor's pricing page.

| Tool | Best for | Indicative price (verify) | Where it breaks down |
|------|----------|---------------------------|----------------------|
| **HubSpot Sales Hub** | SMB→mid-market wanting marketing+sales in one suite; fast setup | Free tier exists; Starter ~$15–20; Professional ~$100; Enterprise higher. Pro/Enterprise also carry a **mandatory one-time onboarding/Professional Services fee** (often four figures — confirm current amount). Distinguishes **sales seats** vs cheaper **core seats**. | Cost scales fast with seats + contact tiers; non-trivial Pro/Ent onboarding fees; advanced reporting/permissions gated to higher tiers. |
| **Salesforce Sales Cloud** | Mid-market→enterprise, complex processes, heavy customization | Starter Suite ~$25; Pro Suite ~$100; Enterprise ~$175; Unlimited ~$350; AI (Agentforce) tiers higher. List prices are raised periodically — verify current. | Needs admin/implementation budget; total cost ≫ license once add-ons/integration counted; overkill for small teams. |
| **Pipedrive** | SMB sales teams wanting a clean, deal-centric pipeline | Lite ~$14; Growth ~$24–39; Premium ~$49; Ultimate ~$79 (tiers renamed Jul 2025; annual billing). No free tier. | Lighter on marketing/service; automation/reporting limited on low tiers; less suited to complex enterprise process. |
| **Close** | Inside sales / high-volume calling & SMS; SDR teams | Base ~$19; Startup ~$49; Professional ~$99; Enterprise ~$139. Built-in dialer/SMS. | Narrower ecosystem/integrations than HubSpot/Salesforce; less of a marketing/CMS suite. |
| **Notion / Airtable** | Very early stage or custom non-sales workflows | Free–~$20+ | Not a real CRM: no native sequencing, weak dedupe, manual SLAs, no compliance/RBAC tooling — outgrown fast once you have reps + automation needs. |

**Selection criteria (more durable than price):** (1) process complexity & customization needs; (2) need for native marketing/CMS vs sales-only; (3) calling/SMS volume; (4) team size & admin capacity; (5) integration requirements (billing, BI, dialer, enrichment); (6) compliance posture (SOC 2/ISO, DPA, EU data region); (7) realistic *total* cost incl. onboarding/add-ons/implementation — not headline seat price.

> Pricing/plan names shift frequently. Pull current numbers from `hubspot.com/pricing/sales`, `salesforce.com/sales/pricing`, `pipedrive.com/en/pricing`, and `close.com/pricing` before quoting a client.

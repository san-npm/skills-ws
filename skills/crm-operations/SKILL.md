---
name: crm-operations
description: "CRM setup, pipeline automation, lead routing/scoring, forecasting, data hygiene, and compliance for HubSpot, Salesforce, and Pipedrive — with platform-specific recipes. Use when configuring properties/objects, building workflows/Flows, calibrating lead scoring, designing assignment rules, or fixing CRM data governance."
---

# CRM Operations

Operational playbook for configuring and maintaining a B2B CRM. The generic patterns below are followed by platform-specific recipes for **HubSpot**, **Salesforce**, and **Pipedrive**. For the revenue *metrics* layer (ARR/NRR, funnel conversion, pipeline coverage, board reporting) that sits on top of this data, see the sibling **`revenue-operations`** skill — this skill owns the CRM configuration; that one owns the analysis.

## Workflow

### 1. Property Architecture

**Core contact properties:**

| Property | Type | Purpose |
|----------|------|---------|
| lifecycle_stage | Dropdown | Subscriber → Lead → MQL → SQL → Opportunity → Customer |
| lead_source | Dropdown | How they found you (organic, paid, referral, outbound) |
| lead_score | Number | Calculated engagement + fit score |
| assigned_owner | User | Current owner for routing |
| last_engaged | Date | Last meaningful interaction |
| icp_fit | Dropdown | Strong, moderate, weak |

**Core company properties:**

| Property | Type | Purpose |
|----------|------|---------|
| industry | Dropdown | Vertical classification |
| employee_count | Number | Size segmentation |
| arr_potential | Currency | Estimated deal value |
| tech_stack | Multi-select | Integration opportunities |
| decision_stage | Dropdown | Awareness, consideration, decision |

**Naming convention (platform-aware — do NOT blindly apply `snake_case` everywhere):**

| Layer | HubSpot | Salesforce | Pipedrive |
|-------|---------|-----------|-----------|
| User-facing label | Title Case ("Lead Source") | Title Case ("Lead Source") | Title Case |
| Internal/API name | auto-generated `lead_source` (snake_case) — set deliberately, it is **immutable** after creation | API name `Lead_Source__c` (auto-suffixed `__c`, PascalCase-ish, **immutable**) | `key` is a hash, not human-readable |
| Custom prefix | prefix by category: `billing_`, `product_`, `marketing_` | use a **namespace** in managed packages; otherwise group via a category prefix in the label | tag fields with a label prefix |

Rules: pick the API/internal name once — it is permanent in HubSpot and Salesforce and renaming requires re-mapping every integration. Keep labels human-readable Title Case for reps; reserve `snake_case` for HubSpot internal names and integration payload keys only. Never put a unit or example value in a field name (`revenue_usd` is fine; `revenue_50k` is not).

### 2. Pipeline Design

**SaaS sales pipeline:**

| Stage | Definition | Exit criteria | Win probability |
|-------|-----------|---------------|----------------|
| New | Lead qualified, first meeting booked | Discovery call completed | 10% |
| Discovery | Pain and fit confirmed | Champion identified, budget discussed | 20% |
| Demo | Product demonstrated | Technical validation passed | 40% |
| Proposal | Pricing/terms shared | Verbal agreement on terms | 60% |
| Negotiation | Contract in legal review | Redlines resolved | 80% |
| Closed Won | Contract signed | Payment received or PO issued | 100% |
| Closed Lost | Deal dead | Loss reason documented | 0% |

**Required fields per stage transition:**
- New → Discovery: `pain_point`, `budget_range`, `timeline`
- Discovery → Demo: `champion_name`, `decision_maker`, `competitor`
- Demo → Proposal: `technical_validated = true`
- Proposal → Negotiation: `proposal_sent_date`, `contract_value`
- Any → Closed Lost: `loss_reason` (required, dropdown)

### 3. Lead Scoring

**Two-axis scoring: Fit (demographic) + Engagement (behavioral)**

**Fit scoring (0-50 points):**

| Signal | Points | Rationale |
|--------|--------|-----------|
| ICP industry match | +15 | Right vertical |
| Company size 50-500 | +10 | Sweet spot segment |
| Decision-maker title | +10 | VP+ or C-level |
| Target geography | +5 | In serviceable market |
| Uses complementary tools | +5 | Integration potential |
| Company size < 10 | -10 | Below minimum viable |
| Student/personal email | -15 | Not a buyer |

**Engagement scoring (0-50 points, decays 50% per 30 days inactive):**

| Action | Points | Decay |
|--------|--------|-------|
| Visited pricing page | +10 | Yes |
| Requested demo | +15 | No |
| Downloaded content | +5 | Yes |
| Attended webinar | +8 | Yes |
| Opened 3+ emails in 7 days | +5 | Yes |
| Replied to email | +10 | No |
| Visited 5+ pages in session | +5 | Yes |

**Thresholds — calibrate, never hardcode.** The point values and the example `70 = MQL` line below are *starting placeholders*, not universals. A threshold copied from a blog post will flood sales with junk or starve them of leads. Calibrate against your own data:

1. **Backtest before launch.** Pull the last 6–12 months of closed deals. Compute the score each lead *would have had* at handoff. Plot conversion-to-SQL (and to Closed Won) by score band. Set MQL at the band where conversion lifts sharply above baseline — that knee, not a round number, is your threshold.
2. **Segment the threshold.** A single global cutoff is wrong when sources convert differently. Set separate MQL thresholds (or separate models) by motion: inbound demo-request, content download, outbound-sourced, PLG/product-signup, partner referral. A product-qualified lead (PQL: hit an in-app activation event) often outranks any marketing score and should route directly.
3. **Govern negative scoring explicitly.** Decay (e.g., engagement halves per 30 days inactive) and disqualifiers (competitor domain, student/personal email, unsubscribed, job applicant) must be owned, documented, and reviewed — silent negative rules are the #1 cause of "good leads never reached sales" incidents.
4. **QA the false positives.** Each week, sample 10–20 leads that crossed MQL but were rejected by sales (HubSpot: "disqualified"; Salesforce: "Unqualified" status). Tag the reason; if one signal dominates rejections, down-weight it.
5. **Re-calibrate quarterly.** Conversion rates drift with ICP, pricing, and seasonality. Re-run the backtest each quarter and on any major scoring-rule change; version the model and announce changes to sales.

Example *starting* bands (replace with your calibrated values):

| Band | Action | Notes |
|------|--------|-------|
| ≥ 70 (placeholder) | MQL → route to sales | Confirm the knee is actually here before trusting it |
| 40–69 | Nurture sequence | Re-score on each new engagement |
| < 40 | Marketing automation only | Suppress from sales views to avoid noise |

> Modern alternative: HubSpot **predictive (AI) scoring** and Salesforce **Einstein Lead Scoring** fit a model on your closed data instead of hand-tuned points. Use them when you have ≥ ~1,000 scored leads with enough won/lost outcomes; keep a transparent manual model as a fallback and for explainability. Validate any AI score against the same backtest before letting it auto-route.

### 4. Lead Routing

**Round-robin with rules** (`MQL_THRESHOLD` is your calibrated value from §3, not a literal 70):
```
IF lead_score >= MQL_THRESHOLD AND arr_potential >= ENT_CUTOFF:
  → Route to enterprise AE (named-account match first, else round-robin within ENT pod)
ELIF lead_score >= MQL_THRESHOLD AND arr_potential < ENT_CUTOFF:
  → Route to SMB AE (round-robin, skip reps who are OOO / at capacity)
ELIF MQL_THRESHOLD > lead_score >= NURTURE_FLOOR:
  → Route to SDR for qualification
ELSE:
  → Nurture automation (no human assignment)
```
Always **territory/named-account match before round-robin** so existing-account leads land with the owning AE. Honor rep capacity and OOO so the timer doesn't start against an absent rep.

**Speed-to-lead SLA:** inbound demo requests should be worked fast — industry studies (InsideSales/Harvard Business Review) show contact within ~5 minutes dramatically lifts qualification odds vs. 30+ minutes. Set the first-touch SLA per motion (e.g., 5 min for demo requests, same-business-day for content leads). If unclaimed within 15 minutes, re-route to the next rep and alert the manager. Measure SLA attainment as a dashboard metric (§6), not just an aspiration.

### 5. Deal Forecasting

**Weighted pipeline method:**
```
Forecast = Σ (Deal value × Stage probability × Rep confidence adjustment)
```

| Forecast category | Definition |
|-------------------|-----------|
| Committed | 90%+ probability, verbal/written commitment |
| Best case | 50-89% probability, active engagement |
| Pipeline | 10-49% probability, early stage |
| Upside | Identified but not yet in pipeline |

**Monthly forecast review:** Compare forecast vs actual for last 3 months to calibrate rep-level accuracy.

### 6. Data Hygiene

**Weekly automated cleanup:**
- **De-duplicate carefully** (see the dedup rules below — email-only matching is unsafe).
- Flag (don't delete) contacts with no activity > 90 days for a re-engagement or sunset review.
- Validate email addresses on send and audit quarterly (hard-bounce rate > 2–3% hurts deliverability; suppress hard bounces immediately).
- Standardize company names with a normalization rule (strip `Inc`/`LLC`/`Ltd`/`GmbH`/`S.à r.l.` suffixes for matching, keep the legal name in a separate field).

**Retention & lifecycle — never silently archive or delete revenue history.** Closed-Lost and Closed-Won deals are the training data for forecasting, win/loss analysis, cohort/attribution, sales-cycle benchmarks, and legal/audit trails. Deleting or hard-archiving them at 12 months destroys that. Instead:

| Action | What it means / when |
|--------|----------------------|
| **Keep, don't delete** | Closed deals stay queryable indefinitely; reporting depends on them. Use a `record_status` or list-membership flag (`active` / `dormant`) to hide stale records from working views without removing them. |
| **Archive = reversible & out of working views only** | In HubSpot, *deleting* a record sends it to a 90-day-recoverable Recycle Bin (then it's gone) — that is not archiving. Use **Active vs Static lists** and view filters to declutter instead. Salesforce has no native soft-archive; use a `Record_Status__c` field + list-view filters, or Big Objects for cold storage you can still report on. Pipedrive's **Archive/Delete** on deals hides them from the pipeline but keeps them in reports/exports — prefer Archive over Delete. |
| **Compliance deletion (the only legitimate hard-delete)** | GDPR/CCPA *erasure* requests. Run a documented deletion workflow (below), log who/when/why, and accept the reporting loss as legally required. |

**Compliance & privacy (2026 baseline — confirm requirements with counsel/DPO for your jurisdiction):**
- **Consent & lawful basis:** store opt-in source, timestamp, and lawful basis on the contact. HubSpot has native subscription types + GDPR consent fields; Salesforce uses the **Individual** object + Consent Management; Pipedrive has Marketing-status consent fields. Don't email contacts whose consent you can't evidence.
- **Right to erasure / deletion request:** capture request → verify identity → suppress (add email to a permanent **suppression/Do-Not-Contact** list so re-imports don't resurrect them) → delete personal data within the legal window (GDPR target ~30 days). Retain a minimal anonymized record for audit and to honor the suppression. HubSpot has a built-in **GDPR Delete** (permanent, blocks re-creation); Salesforce requires a manual/scripted delete plus an Individual-level opt-out; Pipedrive supports per-person delete via UI/API.
- **Enrichment & data sourcing:** only enrich with a lawful basis; record the data source/provider on the record. After Clearbit folded into HubSpot as **Breeze Intelligence**, enrichment is native there; for Salesforce/Pipedrive verify your enrichment vendor's lawful-basis terms.
- **Call recording & email tracking:** call recording consent is jurisdiction-specific (many US states + EU require all-party or notified consent) — disclose and store consent. Open/click tracking pixels are increasingly defeated by Apple Mail Privacy Protection (opens are unreliable since 2021) and may require consent in the EU; treat opens as a weak signal and lean on clicks/replies/meetings.

**Dedup rules (email-only matching is unsafe):** people have multiple/shared emails (`info@`, `sales@`), and the same email can span subsidiaries, partners, or job changes.
- **Contacts:** match on a normalized primary email **first**; if no email or shared/role-based inbox, fall back to fuzzy `(first+last name) + company/domain` and queue for **human review rather than auto-merge**. Never auto-merge on name alone.
- **Companies/Accounts:** match on normalized **web domain** (most reliable), not company name; account for subsidiaries and franchises that share a parent domain.
- **Relationships:** preserve the account↔contact link on merge — losing it orphans activity history. Keep the oldest record as the master (or the one with the most engagement), and confirm field-survivorship (which value wins per field) before merging.
- **Platform tools:** HubSpot surfaces duplicate suggestions (Contacts/Companies) and merges keep both timelines; Salesforce uses **Duplicate Rules + Matching Rules** (and Potential Duplicates) — review before merge; Pipedrive has Merge duplicates with a side-by-side picker. Always require review for fuzzy matches.

**Data quality dashboard:**
- % contacts with complete required fields (by owner)
- % open deals with a `next_step` and a future `next_step_date`
- Duplicate contact / duplicate account rate
- Hard-bounce rate on email sends; % contacts with unknown consent status
- % contacts with a valid lifecycle stage (no nulls / no skipped stages)
- Stage **aging**: deals exceeding the expected days-in-stage (see §8 formulas)
- Speed-to-lead SLA attainment % and breach count

### 7. Automation Workflows

**Essential automations:**

| Trigger | Action |
|---------|--------|
| Form submission | Create contact, set lifecycle stage, enroll in sequence |
| Lead score crosses MQL threshold | Notify owner, create task, update lifecycle |
| Deal stage change | Update contact lifecycle, trigger next email |
| No activity 14 days on open deal | Alert owner, create follow-up task |
| Closed Won | Trigger onboarding sequence, notify CS team |
| Closed Lost | Enroll in re-engagement nurture (90 day delay) |

The generic triggers above map to concrete builders on each platform — recipes follow.

### 8. Operational Dashboards (formulas & report definitions)

Build these as saved reports/dashboards; the formulas are platform-agnostic, with the report type noted per platform.

| Metric | Formula / definition | HubSpot | Salesforce | Pipedrive |
|--------|----------------------|---------|-----------|-----------|
| Stage aging | `days_in_current_stage = TODAY − date_entered_current_stage`; flag if `> expected_days[stage]` | Deal report grouped by stage; use "Time in stage" property | Report on Opportunity with `Age` + stage-duration formula field; or Opportunity History | Pipeline view "rotten" flag + Deal duration report |
| Stale next step | `open_deal AND (next_step_date IS NULL OR next_step_date < TODAY)` | Deal list filter | Opportunity report filtered on `NextStep`/`Next_Step_Date__c` | Filter on Next activity date empty/overdue |
| Owner workload | `COUNT(open_deals) by owner` and `SUM(amount × stage_probability) by owner` | Deal report grouped by owner | Opportunity report grouped by Owner | Deals grouped by user |
| Stage conversion | `entered_next_stage / entered_this_stage` per stage (cohort by entry month) | Funnel report | Stage-history / Funnel report | Conversion report |
| Win rate | `won / (won + lost)` over a closed-date window | Deal report | Opportunity win-rate report | Won vs Lost report |
| Sales-cycle length | `AVG(close_date − created_date)` for won deals, by segment | Deal report w/ calculated property | Opportunity formula field + report | Deal duration report |
| Duplicate rate | `dupe_records / total_records` | Duplicate suggestions count | Potential Duplicates report | Merge-duplicates count |
| SLA breach | `COUNT(MQL where first_touch_time − mql_time > sla_minutes)` | Workflow + custom property `time_to_first_touch` | Flow-stamped `First_Touch__c` time vs assignment time | Automation-stamped field + filter |

---

## Platform recipe: HubSpot

**Objects/terms:** Contacts, Companies, Deals (with **Deal stages** inside **Pipelines**), Tickets. Lifecycle is the **`lifecyclestage`** contact+company property (Subscriber→Lead→MQL→SQL→Opportunity→Customer→Evangelist). Lead handoff also uses **`hs_lead_status`**.

**Properties & limits (verify current limits at <https://knowledge.hubspot.com>; they vary by tier):**
- Create custom properties under Settings → Properties. Internal name is auto-`snake_case` and **immutable**; label is editable.
- Property/field and automation limits scale with tier (Starter/Pro/Enterprise) — don't hardcode a number, check your portal's limits page.
- Use **calculated properties** for `lead_score` components and `days_in_stage`.

**Lead scoring:** Marketing → **Lead Scoring** tool (manual fit, engagement, and combined scores on Marketing or Sales Hub Pro+; AI-assisted scoring on Marketing Hub Enterprise). The legacy **HubSpot Score** property (Settings → Properties) stopped updating on August 31, 2025: migrate any workflows, lists, or reports still referencing it. Fit AI scores on your closed data (see §3 calibration).

**Workflow recipe — MQL routing with speed-to-lead SLA:**
```
Workflow: "MQL → Route + SLA"
Enrollment trigger: lead_score >= MQL_THRESHOLD AND lifecyclestage is any of (Lead, MQL)
Actions:
  1. Set property: lifecyclestage = "marketingqualifiedlead"
  2. Branch on ICP / arr_potential:
       - Enterprise → Rotate record to owner (Enterprise AE team)
       - SMB        → Rotate record to owner (SMB AE team)
  3. Set property: hs_lead_status = "NEW"; stamp mql_timestamp = now
  4. Create task "Call within 5 min" assigned to deal/contact owner (due in 5 min)
  5. Send internal Slack/email notification to owner
  6. Delay 15 min → IF hs_lead_status still "NEW" (unworked):
        Rotate to next owner + notify manager   // SLA re-route
```
Use **Active lists** for dynamic segments (auto-update) and **Static lists** for point-in-time snapshots. Hide stale records from sales views with list filters rather than deleting.

**Privacy/AI:** native GDPR delete + subscription types; **Breeze Intelligence** (formerly Clearbit) for native enrichment, **Breeze Copilot/Agents** for AI assist — record enrichment source and respect consent.

---

## Platform recipe: Salesforce

**Object model:** **Lead** (pre-conversion) → on qualification, **Convert** to **Account + Contact (+ Opportunity)**. Opportunities have **Stages** (with `Probability` and a `Forecast Category`). This Lead→Account/Contact/Opportunity split is the biggest difference from HubSpot/Pipedrive — design around conversion, not a single lifecycle field.

**Fields & naming:** custom fields get an auto `__c` suffix and an **immutable API name**; labels are editable. Use **Record Types** + **Page Layouts** (or Dynamic Forms) to show the right fields per process/segment.

**Automation — Flow-first (2026).** Salesforce has **retired Workflow Rules and Process Builder**; build new automation in **Flow** (record-triggered for create/update, scheduled for time-based, screen flows for guided UI). Use **Validation Rules** for required-field-at-stage enforcement, and **Assignment Rules** (native Lead Assignment Rules) or a Flow for routing.

**Validation rule — block stage advance without required fields** (Opportunity, runs on save):
```
AND(
  ISPICKVAL(StageName, "Proposal"),
  OR( ISBLANK(Proposal_Sent_Date__c), Amount == 0 )
)
// Error: "Set Proposal Sent Date and Amount before moving to Proposal."
```
**Record-triggered Flow — MQL routing + SLA** (on Lead create/update):
```
Trigger: Lead, A record is created or updated
Entry:   Lead_Score__c >= MQL_THRESHOLD AND Status != "Working"
Path A (Enterprise: Annual_Revenue__c high / target account):
  - Assign OwnerId = matched named-account AE (else round-robin via assignment Flow)
Path B (SMB): assign via round-robin (skip OOO using a User capacity flag)
Then (all paths):
  - Update Status = "Working"; set First_Assigned__c = NOW()
  - Create Task "Call within 5 min" (due NOW + 5 min) for OwnerId
  - Scheduled path +15 min: IF Status still "Working" with no completed task → reassign + email manager
```
**Forecasting:** use **Collaborative Forecasts** with **Forecast Categories** (Pipeline / Best Case / Commit / Closed) mapped from stages — align these to the categories in §5.

**Privacy/AI:** **Individual** object + Consent Management for consent/erasure; **Einstein** (Lead/Opportunity scoring, Einstein Activity Capture) and **Agentforce** agents for AI — keep a manual scoring fallback for explainability. Salesforce has no soft-archive; use a `Record_Status__c` flag + list views, or **Big Objects** for reportable cold storage.

---

## Platform recipe: Pipedrive

**Objects/terms:** **Leads** (inbox, pre-deal) → **Deals** moving through **Stages** within a **Pipeline**; plus **Persons** and **Organizations**. Activities drive the "next step." Pipedrive is activity-centric — its strength is forcing a scheduled next activity on every open deal.

**Custom fields:** add per object; field key is a hash (not human-readable) — reference by API key in integrations. Use **required fields per stage** (web app: pipeline settings) to enforce data capture on stage change.

**Automation recipe — new-lead routing + rotten-deal alert:**
```
Automation 1: "Route inbound deal"
  Trigger: Deal created
  Condition: Deal value >= ENT_CUTOFF
     True  → Update owner = Enterprise rep; create Activity "Call" due in 5 min
     False → Update owner = next SMB rep (round-robin); create Activity "Call" due in 5 min
  Then: send internal notification to the new owner

Automation 2: "Stale next step"
  Trigger: Activity marked done OR daily scheduled check
  Condition: Deal is open AND has no scheduled future activity
     True → Create Activity "Schedule next step" for owner + notify
```
Set **"rotten" deal flags** per stage (days until a deal rots) so the pipeline view surfaces aging deals automatically. Use **Insights** dashboards for the §8 metrics (conversion, duration, win rate).

**Forecasting:** Pipedrive's **Forecast view** weights `deal value × stage probability` and groups by **expected close date** — set per-stage probabilities to match §2.

**Privacy:** per-Person consent/marketing-status fields; honor erasure by deleting the Person (UI/API) and adding the email to a suppression list so re-imports don't resurrect it. Archive deals (don't delete) to keep them in reports/exports.

---

> **Scope note:** This skill covers CRM *configuration and operations*. For revenue *analysis* on top of this data — ARR/NRR, funnel/cohort conversion, pipeline coverage ratios, sales-capacity and quota planning, and exec/board dashboards — use the sibling **`revenue-operations`** skill. Keep the CRM the system of record; do the heavy metric math in the RevOps layer to avoid duplicating (and diverging) definitions.

---
name: crm-operations
description: "CRM setup and operations for HubSpot, Salesforce, and Pipedrive. Property architecture, pipeline design, lead scoring, lead routing, deal tracking, forecasting, data hygiene, and automation workflows. Use when setting up a CRM, designing pipelines, building lead scoring, or cleaning CRM data."
---

# CRM Operations

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

**Naming convention:** `snake_case`, prefix custom properties with category (e.g., `billing_`, `product_`, `marketing_`).

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

**Thresholds:**
- Score ≥ 70: MQL → auto-route to sales
- Score 40-69: Nurture sequence
- Score < 40: Marketing automation only

### 4. Lead Routing

**Round-robin with rules:**
```
IF lead_score >= 70 AND arr_potential >= $50k:
  → Route to enterprise AE (named accounts)
ELIF lead_score >= 70 AND arr_potential < $50k:
  → Route to SMB AE (round-robin)
ELIF lead_score 40-69:
  → Route to SDR for qualification
ELSE:
  → Nurture automation
```

**SLA:** New MQL must be contacted within 5 minutes (speed to lead matters). If not claimed in 15 minutes, re-route.

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
- Merge duplicate contacts (match on email → company + name)
- Flag contacts with no activity > 90 days
- Validate email addresses quarterly (bounce rate > 5% = problem)
- Standardize company names (remove Inc, LLC, Ltd variants)
- Archive closed-lost deals > 12 months old

**Data quality dashboard:**
- % contacts with complete required fields
- % deals with next step date in future
- Duplicate contact rate
- Bounce rate on email sends
- % contacts with valid lifecycle stage

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

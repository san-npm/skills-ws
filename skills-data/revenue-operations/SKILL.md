---
name: revenue-operations
description: "RevOps frameworks for scaling B2B teams. Funnel metrics, forecasting models, GTM alignment, quota planning, tech stack optimization, and handoff processes. Use when aligning marketing/sales/CS, building forecasting models, designing handoff processes, or auditing GTM operations."
---

# Revenue Operations

## Workflow

### 1. Revenue Funnel Definitions

Align ALL teams on the same definitions:

| Stage | Definition | Owner | SLA |
|-------|-----------|-------|-----|
| Visitor | Hit website or content | Marketing | — |
| Lead | Known contact (form fill, signup) | Marketing | Enrich within 24h |
| MQL | Meets scoring threshold (fit + engagement) | Marketing | Route within 5 min |
| SAL | Sales accepted, meeting booked | SDR/BDR | Contact within 1 hour |
| SQL | Qualified by sales (BANT/MEDDIC confirmed) | AE | Discovery within 3 days |
| Opportunity | In pipeline with defined next steps | AE | Advance or close within 90 days |
| Closed Won | Contract signed, revenue booked | AE → CS | Handoff within 48h |

**Conversion benchmarks (B2B SaaS):**

| Stage transition | Benchmark |
|-----------------|-----------|
| Visitor → Lead | 2-5% |
| Lead → MQL | 15-30% |
| MQL → SAL | 60-80% |
| SAL → SQL | 40-60% |
| SQL → Opportunity | 50-70% |
| Opportunity → Closed Won | 20-30% |

### 2. Forecasting Models

**Weighted pipeline (standard):**
```
Deal forecast = Deal value × Stage probability
Total forecast = Σ all deal forecasts
```

**Historical conversion (more accurate):**
```
Expected revenue = Current stage count × Historical stage-to-close rate × Average deal size
```

**Bottoms-up (most accurate, most work):**
```
Rep forecast = Committed + (Best case × 0.5) + (Pipeline × 0.15)
Team forecast = Σ rep forecasts × Historical accuracy multiplier
```

**Forecast accuracy tracking:**

| Month | Forecast | Actual | Accuracy |
|-------|----------|--------|----------|
| Jan | $250k | $230k | 92% |
| Feb | $280k | $310k | 90% |
| Mar | $300k | $275k | 92% |

Target: ±10% accuracy consistently. If not: reps are sandbagging or being optimistic.

### 3. GTM Alignment

**Weekly GTM standup (30 min):**
- Marketing: pipeline contribution this week, upcoming campaigns
- Sales: deal updates, blockers, competitive intel
- CS: churn risks, expansion opportunities, product feedback
- RevOps: funnel health, forecast update, process issues

**Monthly revenue review (60 min):**
- Funnel conversion rates vs targets
- Pipeline coverage (3x target = healthy)
- Win rate trends by segment, source, rep
- Churn and expansion ARR
- Forecast vs actual analysis

### 4. Quota & Territory Planning

**Quota setting formula:**
```
Company target = Board-approved ARR target
Sales capacity = # ramped AEs × quota per AE
Quota per AE = Company target / # ramped AEs × 1.15 (buffer for attrition)
```

**Territory design principles:**
- Equal opportunity (similar pipeline potential per territory)
- Minimize travel (geographic clustering)
- Account for existing relationships (don't reassign active deals)
- Review quarterly (territories drift as markets change)

**Ramp schedule:**

| Month | % of full quota | Expectation |
|-------|----------------|-------------|
| 1-2 | 0% | Training, shadowing, certification |
| 3 | 25% | First qualified meetings |
| 4 | 50% | First deals in pipeline |
| 5 | 75% | First closed deals |
| 6+ | 100% | Fully ramped |

### 5. Handoff Processes

**Marketing → SDR (MQL handoff):**
```
Trigger: Lead score ≥ MQL threshold
Data passed: Lead source, content consumed, pages visited, company info, score breakdown
SDR action: Research (5 min) → personalized outreach within 1 hour
Feedback loop: SDR marks SAL accepted/rejected with reason → Marketing adjusts scoring
```

**SDR → AE (SAL handoff):**
```
Trigger: Discovery call completed, BANT confirmed
Data passed: Pain points, budget range, timeline, decision process, competitors
AE action: Review notes → demo prep → schedule demo within 3 days
Handoff format: Warm intro email (SDR introduces AE + summarizes conversation)
```

**AE → CS (Closed Won handoff):**
```
Trigger: Contract signed
Data passed: Contract terms, use case, success criteria, stakeholders, technical requirements
CS action: Onboarding kickoff within 48 hours
Handoff format: Internal doc + joint call (AE + CS + customer)
```

### 6. Tech Stack Audit

**Core RevOps stack:**

| Layer | Tool | Purpose |
|-------|------|---------|
| CRM | HubSpot / Salesforce | Single source of truth |
| Engagement | Outreach / Salesloft | Sales sequences |
| Intelligence | Gong / Chorus | Call recording + analysis |
| Enrichment | Clearbit / Apollo | Contact and company data |
| Attribution | HubSpot / Dreamdata | Marketing attribution |
| BI | Looker / Metabase | Cross-functional dashboards |
| Communication | Slack + CRM integration | Real-time notifications |

**Audit checklist:**
- [ ] Data flows bidirectionally between all tools
- [ ] No manual data entry between systems
- [ ] Single source of truth for each data type
- [ ] Reporting pulls from one source (not multiple conflicting dashboards)
- [ ] Total cost < 15% of ARR (healthy range)

### 7. RevOps Metrics Dashboard

| Metric | Cadence | Target |
|--------|---------|--------|
| Pipeline coverage ratio | Weekly | 3-4x quarterly target |
| Win rate | Monthly | 20-30% |
| Average sales cycle | Monthly | Track trend, reduce 10% YoY |
| CAC payback | Monthly | < 12 months |
| Net revenue retention | Monthly | > 110% |
| Forecast accuracy | Monthly | ±10% |
| Speed to lead | Real-time | < 5 minutes |
| Pipeline created per rep | Weekly | Even distribution |

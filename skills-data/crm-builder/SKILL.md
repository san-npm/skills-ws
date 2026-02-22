---
name: crm-builder
description: "CRM system design from scratch or with tools (HubSpot, Pipedrive, Notion, Airtable, Salesforce). Pipeline stages, contact properties, deal workflows, email integration, reporting dashboards, automation rules, lead routing. Use when designing a CRM, setting up sales pipelines, creating contact management systems, building deal workflows, configuring CRM automations, or choosing CRM tools."
---

# CRM Builder

## CRM Design Process

### 1. Define Pipeline Stages

Standard B2B SaaS pipeline:
```
Lead → MQL → SQL → Discovery → Demo → Proposal → Negotiation → Closed Won/Lost
```

Standard B2B Services:
```
Inquiry → Qualified → Meeting → Proposal → Contract → Closed Won/Lost
```

E-commerce/B2C:
```
Visitor → Lead → Customer → Repeat → VIP
```

Rules:
- Max 7-8 stages (more = confusion)
- Each stage has clear entry criteria
- Define required fields per stage (can't advance without them)
- Set expected time in each stage (flag stalled deals)

### 2. Contact Properties

Essential fields:
- Name, email, phone, company, job title
- Lead source (utm_source or manual)
- Lead score (see lead-scoring skill)
- Lifecycle stage (subscriber → lead → MQL → SQL → customer)
- Owner (assigned sales rep)
- Last activity date
- Industry, company size (for segmentation)

Custom fields based on your ICP (Ideal Customer Profile).

### 3. Automation Rules

High-impact automations:
- **Lead assignment**: Route leads by territory, company size, or round-robin
- **Follow-up reminders**: Alert if no activity for X days
- **Stage progression**: Auto-move when criteria met (e.g., demo scheduled → Demo stage)
- **Win/loss notifications**: Slack/email alert on deal close
- **Lifecycle updates**: Auto-update contact lifecycle when deal moves
- **Re-engagement**: Trigger email if deal stalls for X days

### 4. Email Integration

- Sync sent/received emails to contact timeline
- Log meeting notes and call recordings
- Track email opens and link clicks
- Template library for common emails (intro, follow-up, proposal)

### 5. Reporting Dashboard

Essential reports:
- Pipeline value by stage
- Win rate by source/owner/month
- Average deal cycle time
- Activity metrics (calls, emails, meetings per rep)
- Revenue forecast (weighted pipeline)
- Lost deal reasons analysis

### 6. Tool Selection

| Tool | Best For | Price |
|------|----------|-------|
| HubSpot Free | Startups, <5 reps | Free → $50/user/mo |
| Pipedrive | SMB sales teams | $15-99/user/mo |
| Salesforce | Enterprise | $25-300/user/mo |
| Notion/Airtable | Very early stage, custom workflows | Free-$20/user/mo |
| Close | Inside sales, high-volume calling | $29-149/user/mo |

## References

- [references/crm-templates.md](references/crm-templates.md) — Pipeline templates by industry, property sets
- [references/automation-recipes.md](references/automation-recipes.md) — 20+ automation workflows

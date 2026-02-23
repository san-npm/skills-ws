---
name: customer-feedback
description: Design and operate a Voice of Customer program — from NPS/CSAT collection through qualitative analysis to roadmap integration.
category: growth
---

# Customer Feedback

## Metric Framework

| Metric | Question | Scale | When to Use |
|--------|----------|-------|-------------|
| **NPS** | "How likely to recommend?" | 0-10 (Detractor 0-6, Passive 7-8, Promoter 9-10) | Relationship health, quarterly+ |
| **CSAT** | "How satisfied with [interaction]?" | 1-5 stars | Post-transaction, support close |
| **CES** | "How easy was it to [task]?" | 1-7 (strongly disagree→agree) | Post-task completion |
| **PMF Score** | "How disappointed if you couldn't use this?" | Very/Somewhat/Not | Product-market fit (target >40% "very") |

## NPS Survey Design

**Timing triggers (pick ONE per user journey):**
- Post-onboarding: 7-14 days after activation
- Relationship: every 90 days, offset by cohort (avoid survey fatigue)
- Post-milestone: after first value moment (e.g., first project completed)

**Segmentation:** Split by plan tier, tenure, geography, and use-case. Compare NPS across segments — the delta tells you more than the absolute score.

**Survey rules:**
- Max 2 questions: score + open-ended "What's the main reason for your score?"
- Suppress if user surveyed in last 90 days
- Exclude users active < 7 days
- Send in-app for active users, email for dormant (>14 days inactive)

## Feedback Collection Channels

| Channel | Signal Type | Volume | Richness |
|---------|------------|--------|----------|
| In-app widget | Feature requests, bugs | High | Medium |
| Post-support CSAT | Service quality | Medium | Low |
| Email surveys (NPS) | Relationship health | Medium | High |
| Support tickets | Pain points | High | High |
| Social/review sites | Brand sentiment | Low | Medium |
| Sales call notes | Objections, gaps | Low | Very High |
| Community/forum | Power user needs | Medium | High |

## RICE Prioritization for Feature Requests

Score each request: **RICE = (Reach × Impact × Confidence) / Effort**

| Factor | Definition | Scale |
|--------|-----------|-------|
| **Reach** | Users affected per quarter | Absolute number |
| **Impact** | Effect per user (Massive=3, High=2, Medium=1, Low=0.5, Minimal=0.25) | 0.25–3 |
| **Confidence** | Data backing (High=100%, Medium=80%, Low=50%) | 50–100% |
| **Effort** | Person-months | Absolute number |

```
# Example RICE calculation
reach = 2000        # users/quarter
impact = 2          # high
confidence = 0.8    # medium — have support tickets but no interviews
effort = 3          # person-months
rice = (reach * impact * confidence) / effort  # = 1066
```

## Qualitative Analysis Workflow

1. **Tag** — Apply taxonomy: `bug`, `feature-request`, `ux-friction`, `praise`, `pricing`
2. **Theme** — Cluster tags into themes (e.g., "onboarding confusion", "missing integrations")
3. **Sentiment** — Score positive/neutral/negative per theme
4. **Quantify** — Count mentions per theme per period; track trends
5. **Prioritize** — Cross-reference themes with RICE scores and revenue impact

**Tagging rules:** Use max 3 tags per item. Maintain a shared taxonomy (see `references/feedback-taxonomy.yaml`). Review and merge tags monthly.

## Closing the Feedback Loop

```
Respond → Act → Communicate
   │        │        │
   ▼        ▼        ▼
 Acknowledge   Ship fix/   Notify the person
 within 48h    feature     who requested it
```

**Templates:** See `references/feedback-response-templates.md`

- **Detractors (NPS 0-6):** Personal outreach within 24h. Ask to understand, don't defend.
- **Feature shipped:** Email requesters with changelog link. "You asked, we built."
- **Won't build:** Be honest. "We considered this but chose X because Y."

## Churn Surveys (Exit Interviews)

Trigger on cancellation. Keep to 3 questions max:
1. Primary reason (multiple choice: too expensive, missing feature, switched competitor, not needed, other)
2. Open-ended: "What could we have done differently?"
3. "Would you consider returning if we [addressed reason]?" (Yes/No)

Analyze monthly. If >20% cite same reason, escalate to product leadership.

## Beta Testing Program

| Phase | Audience | Size | Duration | Goal |
|-------|----------|------|----------|------|
| Alpha | Internal + 5 power users | 10-20 | 2 weeks | Find breaking bugs |
| Closed Beta | Opted-in segment | 50-200 | 2-4 weeks | Usability + edge cases |
| Open Beta | Feature-flagged rollout | 5-20% of base | 1-2 weeks | Scale validation |

Recruit from NPS promoters (9-10) first — they're invested and forgiving.

## VoC Program Design Checklist

- [ ] Define metrics: NPS (quarterly), CSAT (post-support), CES (post-onboarding)
- [ ] Set up collection channels (in-app, email, support, social monitoring)
- [ ] Build tagging taxonomy and train support team
- [ ] Create feedback board (public or internal) for feature requests
- [ ] Implement RICE scoring for prioritization
- [ ] Schedule monthly feedback review with product + engineering leads
- [ ] Automate close-the-loop notifications when features ship
- [ ] Quarterly VoC report to leadership with trends + recommendations
- [ ] Annual program review: survey response rates, action rate, NPS trend

## Tools Comparison

| Tool | Best For | Pricing Model | Key Strength |
|------|----------|--------------|--------------|
| **Canny** | Public feature voting boards | Per-tracked-user | Transparent roadmap |
| **ProductBoard** | Feedback→roadmap workflow | Per-maker seat | Prioritization frameworks |
| **Pendo** | In-app guides + analytics | Per-MAU | Combines feedback with usage data |
| **Hotjar** | On-page surveys + heatmaps | Per-session | Visual context |
| **Delighted** | NPS/CSAT automation | Per-survey-response | Simple, fast setup |

## Feedback→Roadmap Integration

1. All feedback tagged and stored in single system of record
2. Product reviews feedback board weekly (30 min)
3. RICE-scored items enter backlog with `customer-requested` label
4. Roadmap items link back to original feedback threads
5. Ship notifications auto-trigger to requesters via integration

See `references/feedback-roadmap-workflow.md` for detailed integration diagrams.

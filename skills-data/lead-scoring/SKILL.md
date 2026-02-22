---
name: lead-scoring
description: "Lead scoring models, behavioral signals (page visits, email engagement, feature usage), demographic fit scoring, MQL/SQL definitions, score decay, handoff workflows, BANT/CHAMP/MEDDIC frameworks. Use when building lead scoring models, defining MQL and SQL criteria, setting up behavioral scoring, creating lead qualification frameworks, or designing sales handoff workflows."
---

# Lead Scoring

## Scoring Model Design

### Two-Axis Model
Score leads on two independent axes:
1. **Fit Score** (0-100): How well they match your ICP (demographics)
2. **Engagement Score** (0-100): How actively they interact (behavior)

Combine: `Total Score = (Fit × 0.4) + (Engagement × 0.6)`

### Fit Score (Demographics)

| Signal | Points | Example |
|--------|--------|---------|
| Company size matches ICP | +20 | 50-500 employees |
| Industry match | +15 | SaaS, fintech |
| Job title/seniority | +20 | VP+, Director, C-level |
| Budget range confirmed | +15 | >$50K ARR potential |
| Geography match | +10 | Target market |
| Tech stack match | +10 | Uses compatible tools |
| Revenue range match | +10 | $5M-$50M ARR |

### Engagement Score (Behavior)

| Signal | Points | Decay |
|--------|--------|-------|
| Pricing page visit | +20 | -5/week |
| Demo request | +30 | None |
| Free trial signup | +25 | -5/week inactive |
| Case study download | +10 | -3/week |
| Blog post read | +2 | -1/week |
| Email open | +1 | -1/week |
| Email click | +5 | -2/week |
| Webinar attended | +15 | -3/week |
| Multiple sessions (3+) | +10 | -2/week |
| Returned after 30d absence | +15 | -5/week |

### Score Decay
Apply weekly decay to prevent stale high scores. A lead who visited pricing 3 months ago isn't hot anymore.

### Thresholds

| Score | Classification | Action |
|-------|---------------|--------|
| 0-30 | Cold lead | Nurture sequence |
| 31-50 | Warm lead | Targeted content |
| 51-70 | MQL | Marketing-qualified, alert SDR |
| 71-85 | SQL | Sales-qualified, direct outreach |
| 86-100 | Hot | Immediate sales attention |

## Qualification Frameworks

Details: [references/scoring-models.md](references/scoring-models.md)

## References

- [references/scoring-models.md](references/scoring-models.md) — BANT, CHAMP, MEDDIC frameworks with implementation guides
- [references/signal-weights.md](references/signal-weights.md) — Calibrating signal weights with historical data

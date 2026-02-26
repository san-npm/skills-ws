---
name: project-management
description: "End-to-end project management frameworks covering sprint planning, OKRs, stakeholder management, risk mitigation, and retrospectives."
---

# Project Management

## Sprint Planning

### Capacity Calculation

```
Team capacity = (# engineers) × (days in sprint) × (focus factor 0.6-0.8)
Available points = capacity × historical velocity_per_person_day
```

**Velocity tracking:** Use 3-sprint rolling average. Never commit above 110% of rolling avg.

### Estimation Techniques

| Technique | Best For | Scale |
|---|---|---|
| T-shirt sizing | Epics, roadmap items | XS, S, M, L, XL |
| Planning poker | Sprint stories | Fibonacci: 1,2,3,5,8,13,21 |
| Three-point | Risky/uncertain work | (O + 4M + P) / 6 |

**Rule:** If estimate > 13 points, decompose. If team variance > 2 Fibonacci steps, discuss.

## OKR Framework

### Structure

```
Objective: Qualitative, inspiring, time-bound
  └─ Key Result 1: Measurable outcome (0.0–1.0 scoring)
       └─ Initiative: Concrete project/task driving the KR
  └─ Key Result 2: ...
  └─ Key Result 3: (max 3-5 KRs per objective)
```

### Scoring & Cadence

| Score | Meaning |
|---|---|
| 0.0–0.3 | Failed to make progress |
| 0.4–0.6 | Progress but missed target |
| 0.7–1.0 | Delivered (0.7 is "healthy ambitious") |

- **Weekly:** Check-in on KR progress (15 min)
- **Monthly:** Score and adjust initiatives
- **Quarterly:** Grade OKRs, set next quarter

## Stakeholder Management

### RACI Matrix

| Task | PM | Eng Lead | Design | Exec |
|---|---|---|---|---|
| Requirements | A | C | R | I |
| Architecture | C | R | I | I |
| Launch decision | R | C | C | A |

**R**=Responsible, **A**=Accountable (one per row), **C**=Consulted, **I**=Informed.

### Communication Plan

| Audience | Frequency | Format | Content |
|---|---|---|---|
| Exec sponsors | Biweekly | Email/slides | Status, risks, decisions needed |
| Cross-team deps | Weekly | Sync/Slack | Blockers, timeline updates |
| Team | Daily | Standup | Yesterday/today/blockers |

## Agile Ceremonies

| Ceremony | Duration | Cadence | Output |
|---|---|---|---|
| Standup | 15 min | Daily | Blockers surfaced |
| Sprint Planning | 1-2 hr | Per sprint | Committed backlog |
| Sprint Review/Demo | 1 hr | Per sprint | Stakeholder feedback |
| Retrospective | 1 hr | Per sprint | Action items (max 3) |
| Backlog Refinement | 1 hr | Weekly | Estimated, ready stories |

## Kanban Workflow

```
Backlog → Ready → In Progress → Review → Done
           WIP:∞    WIP:3        WIP:2
```

**Key metrics:**
- **Lead time:** Request → Done (target: track trend, reduce)
- **Cycle time:** In Progress → Done (optimize this)
- **Throughput:** Items completed per week

**WIP limits:** Start with `(team size / 2) + 1`. Adjust based on flow.

## Risk Management

### Probability × Impact Matrix

|  | Low Impact | Med Impact | High Impact |
|---|---|---|---|
| **High Prob** | Medium | High | Critical |
| **Med Prob** | Low | Medium | High |
| **Low Prob** | Low | Low | Medium |

For each High/Critical risk, document: **Risk → Trigger → Mitigation → Owner → Status**

## Project Kickoff Checklist

- [ ] Problem statement and success criteria defined
- [ ] Stakeholders identified (RACI complete)
- [ ] Scope documented (in-scope / out-of-scope)
- [ ] Timeline with milestones
- [ ] Dependencies mapped
- [ ] Risks identified with mitigations
- [ ] Communication plan agreed
- [ ] Tech approach reviewed

## Post-Mortem / Retrospective

### Blameless Post-Mortem Template

1. **Summary:** What happened, impact, duration
2. **Timeline:** Chronological events with timestamps
3. **Root cause:** Use 5 Whys (ask "why" iteratively until systemic cause found)
4. **Contributing factors:** Process gaps, tooling issues
5. **Action items:** Each with owner and deadline
6. **Lessons learned:** What went well, what didn't

### 5 Whys Example

```
Why did the deploy fail? → Config was wrong
Why was config wrong? → Manual edit in prod
Why manual edit? → No automated config management
Why no automation? → Never prioritized
Why? → No visibility into config-related incidents
→ Action: Implement config-as-code with PR review
```

## Dependency Management

Track cross-team dependencies in a table:

| Dependency | Owner Team | Status | Needed By | Risk |
|---|---|---|---|---|
| Auth API v2 | Platform | In Progress | Sprint 5 | Medium |
| Design system update | Design | Blocked | Sprint 4 | High |

Escalate any dependency at risk ≥2 sprints before needed date.

## Burndown Charts

- **Burndown:** Remaining work vs. time (scope creep = line goes up)
- **Burnup:** Completed work + total scope vs. time (shows scope changes explicitly)

Use burnup for stakeholder reporting (makes scope changes visible).

→ See `references/` for templates and detailed framework docs.


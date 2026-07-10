---
name: project-management
description: "End-to-end software project management: charter, throughput-based sprint planning, OKRs, RAID logs, ADR/DACI decisions, dependency contracts, release gates, retros. Use when planning a project/sprint, scoping/estimating, running ceremonies, tracking risks/dependencies, writing status updates, or picking Jira/Linear/GitHub Projects."
---

# Project Management

## Sprint Planning

### Capacity-Calibrated Planning (not a velocity formula)

Velocity is **team-specific and emergent** — do not derive a per-person-day rate and multiply it back up. A person-days × focus-factor formula gives false precision and invites "weaponized velocity" (see Anti-Patterns). Instead, calibrate each sprint against the team's own recent history and adjust for what's actually different this sprint:

1. **Baseline from history.** Take the last 3–6 sprints of *completed* work. Track **throughput** (items finished/sprint) alongside, or instead of, story points — throughput is harder to game and works even with no-estimate teams. Use the **range** (e.g. 28–41 pts, or 9–14 stories), not just the mean.
2. **Adjust for capacity deltas.** Scale the baseline by *known* changes only: PTO/holidays, on-call rotation, ramping new hires (count at ~50% for the first 2–3 sprints), planned support/KTLO load. A simple ratio works: `target = baseline × (available person-days this sprint / typical person-days)`.
3. **Reserve an explicit buffer** for unplanned work (incidents, escaped bugs, urgent asks). Make it visible — e.g. hold back 15–25% of capacity, or carry a named "unplanned" swimlane — rather than over-committing and silently absorbing it.
4. **Commit to a confidence range, not a single number.** Pull stories until you reach the *low* end of your throughput range with high confidence; mark the next 1–2 as "stretch." Carryover, dependencies, and uncertainty live here, not in a fixed cap.

> There is no universal "never exceed X%" rule. A stable team with a clean sprint can pull stretch items; a team with carryover, new joiners, or heavy on-call should commit *below* its average. Let the historical range and the capacity deltas decide.

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
  └─ Key Result 1: Measurable OUTCOME, not an output/task
       └─ Initiative: Concrete project/task driving the KR
  └─ Key Result 2: ...
  └─ Key Result 3: (max 3-5 KRs per objective)
```

**KRs must be outcomes** ("reduce p95 checkout latency to <400ms", "lift activation rate 22%→30%"), never shipped-features ("launch new checkout"). A feature you can mark "done" is an initiative; the outcome it moves is the KR. Output-only OKRs are the most common failure mode (see Anti-Patterns).

### Scoring & Cadence

The classic Google 0.0–1.0 grade is one model; pick the one that drives the conversation you want:

| Model | When to use | How it reads |
|---|---|---|
| **0.0–1.0 grade** | Stretch/aspirational goals | 0.0–0.3 no progress · 0.4–0.6 progress, missed · 0.7–1.0 delivered (0.7 = "healthy ambitious") |
| **Confidence %** | Continuous/weekly planning | Each KR carries a live "% likely to hit" updated at check-in; trend matters more than the absolute |
| **RAG / status health** | Exec & portfolio reporting | On-track (green) / at-risk (amber) / off-track (red) + a one-line "why" — fast to scan, forces a narrative |
| **Outcome health** | Always-on metrics (NPS, uptime, retention) | Track the metric itself vs. target band; no quarter-end "grade," just current state |

Many 2026 orgs run **confidence + RAG continuously** and drop the formal end-of-quarter grade. Whichever you choose: score the *KR*, never the *initiative*, and don't tie bonuses to scores (it kills ambition and breeds sandbagging).

- **Weekly:** 15-min check-in — update confidence/RAG, surface blockers, re-prioritise initiatives
- **Monthly:** Review trajectory, kill or double-down on initiatives
- **Quarterly:** Retrospect on OKRs (not just grade them), set next cycle

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

### Status Update Template

Lead with the verdict, not the activity log. Execs scan the RAG line and the asks; everything else is backup. Keep it to a screen.

```markdown
**<Project> — week of <date>**   Overall: 🟢 On track | 🟡 At risk | 🔴 Off track
Why: <one line — the single most important fact this week>

📈 Progress:  <2–4 outcomes/milestones shipped, in metrics where possible>
🎯 Next:      <what lands by next update>
⚠️ Risks/blockers: <top 1–3, each with owner + what you're doing>
🙋 Decisions/help needed: <explicit asks — who must do what, by when>
🗓️ Timeline:  On track for <milestone @ date> | Slipped to <date> because <reason>
```

**Rules:** the RAG status is honest, not green-by-default; never let a status go red *for the first time* on the deadline (escalate ≥2 sprints early). State asks as actions with an owner and a date, not vague concerns. Outcomes ("activation 24%→27%") beat activity ("worked on onboarding").

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
          (cap)    (WIP cap)    (WIP cap)
```

**The four flow metrics** (per *Kanban Guide*, v2025.5):
- **WIP:** items started but not finished. The lever you control directly.
- **Cycle time:** In Progress → Done, per item. Optimise this; report the distribution (e.g. 50th/85th percentile), not just the average.
- **Work item age:** how long an *in-flight* item has been open — the single most actionable signal. Items aging past your 85th-percentile cycle time get pulled into focus first.
- **Throughput:** items finished per week. Use its recent *range* for forecasting (see Sprint Planning).

**Setting WIP limits — measure, don't guess.** There is no formula like `(team/2)+1`; an arbitrary cap can starve or flood the board depending on item size and handoffs. Instead:
1. Start by capping the **most contended stage** (usually Review/code-review or QA, where work piles up), not every column.
2. Make the team's *current* in-flight count the starting limit, then ratchet **down** until cycle time drops and aging items shrink — lower WIP almost always speeds flow.
3. Give "Ready" a small buffer cap (e.g. one sprint's worth of refined work) so the backlog stays groomed without hoarding.
4. Add **classes of service** when needed — Expedite (1 lane, pre-empts), Standard (FIFO), Fixed-date (deadline), Intangible (KTLO) — so urgent work doesn't blow up every limit ad hoc.

## Risk Management

### Probability × Impact Matrix

|  | Low Impact | Med Impact | High Impact |
|---|---|---|---|
| **High Prob** | Medium | High | Critical |
| **Med Prob** | Low | Medium | High |
| **Low Prob** | Low | Low | Medium |

For each High/Critical risk, document: **Risk → Trigger → Mitigation → Owner → Status**

### RAID Log

The single source of truth for everything that can derail delivery. One living table (or one tab each) reviewed weekly; every item has a **named owner** and a **next review date**. RAID = Risks, Assumptions, Issues, Dependencies.

| Type | What it captures | Key columns |
|---|---|---|
| **R**isk | Might happen, would hurt | Description · Prob×Impact · Trigger · Mitigation · Owner · Status |
| **A**ssumption | Believed true but unverified; becomes a risk if false | Assumption · Validates by (date) · Impact if wrong · Owner |
| **I**ssue | Already happening, needs action now | Description · Severity · Action · Owner · Due · Status |
| **D**ependency | Needs something from elsewhere (see Dependency Contracts) | What · Direction (in/out) · Owner · Needed-by · Status |

```markdown
## RAID — <Project>   (reviewed weekly, last: <date>)
### Risks
| ID | Risk | P×I | Trigger | Mitigation | Owner | Status |
|----|------|-----|---------|------------|-------|--------|
| R1 | Vendor API rate limits block launch traffic | High | >80% quota in load test | Negotiate quota + cache layer | @lead | Open |
### Assumptions
| ID | Assumption | Validate by | If wrong | Owner |
|----|------------|-------------|----------|-------|
| A1 | Legacy data is clean enough to migrate as-is | M1 + 1wk | +2 sprints for ETL cleanup | @data |
### Issues
| ID | Issue | Sev | Action | Owner | Due | Status |
|----|-------|-----|--------|-------|-----|--------|
| I1 | Staging env down, blocking QA | High | Rebuild from IaC | @devops | Today | In progress |
### Dependencies → tracked in Dependency Contracts table
```

**Promote assumptions early.** An untested assumption is a hidden risk; the most common project failure is discovering a load-bearing assumption was false at the worst possible moment. Validate the riskiest ones in discovery.

## Decision Log (ADR / DACI)

Capture *why*, not just *what* — the rationale is the asset future-you and new joiners need. Two complementary tools:

- **DACI** decides: **D**river (drives to a decision), **A**pprover (one person who signs off), **C**ontributors (consulted), **I**nformed. Use it to assign **decision rights** on the charter so decisions don't stall.
- **ADR** (Architecture/Any Decision Record) records the outcome. One short Markdown file per significant decision, committed next to the code, numbered and immutable (supersede, never edit).

```markdown
# ADR-007: Use server-side sessions instead of JWT
Date: 2026-06-07   Status: Accepted   (Proposed | Accepted | Superseded by ADR-NNN)
Driver: @lead   Approver: @eng-director   Deciders: @backend, @security

## Context
What forces this decision now? Constraints, requirements, the problem.

## Options considered
1. Stateless JWT — pros / cons
2. Server-side sessions (Redis) — pros / cons   ← chosen
3. ...

## Decision
We will <X> because <the trade-off we are accepting>.

## Consequences
Positive: <…>   Negative / cost: <…>   Follow-ups: <ADRs/tickets this spawns>
```

**Log a decision when** it's expensive to reverse, affects multiple teams, or someone will ask "why did we do it this way?" in six months. Trivial/reversible (two-way-door) decisions don't need an ADR — decide fast and move on.

## Change Requests & Scope Control

Scope creep is silent; a lightweight change-control step makes it visible and owned. The charter's **In/Out** scope is the baseline — anything that moves the baseline (scope, date, budget, or a frozen dependency contract) is a change request, not a quiet edit.

```markdown
# CR-014: Add SSO to launch scope
Requested by: <name>   Date: <YYYY-MM-DD>   Status: Proposed
What changes: Add SAML SSO to the GA scope (was Out-of-scope in charter).
Why / value: Unblocks 3 enterprise deals (~$Xk ARR).
Impact:  Schedule: +1 sprint  ·  Scope: −1 stretch story  ·  Risk: new IdP dependency (→ RAID R4)
Options: (a) Add now, slip GA 1 sprint  (b) Ship GA, SSO as fast-follow  (c) Decline
Decision (Approver = sponsor): ____   Date: ____
```

**Rule:** small estimate tweaks within scope are normal sprint hygiene — *don't* CR them. Reserve CRs for changes to the **committed baseline**. Every accepted CR updates the charter, the plan, and (if relevant) the dependency contract.

## Discovery → Delivery Handoff

A story is only "Ready" when the team can build it without guessing. Gate the backlog on a **Definition of Ready** and hold acceptance criteria to a quality bar.

**Definition of Ready (DoR)** — a story enters a sprint only if:
- [ ] User-valued and independently shippable (INVEST); vertical slice, not a layer
- [ ] Acceptance criteria written and testable
- [ ] Designs/API contracts attached or explicitly N/A
- [ ] Dependencies identified (→ Dependency Contracts) and not blocking
- [ ] Sized; if > 13 pts or > ~3 days, split it
- [ ] No open questions that block starting

**Acceptance-criteria quality bar.** Prefer **Given/When/Then** (Gherkin) for behaviour; cover the happy path **and** the obvious edge/error cases; make each criterion observable (a tester can pass/fail it without reading the code). Bad: "login works." Good:

```gherkin
Given a registered user with a valid password
When they submit the login form
Then they land on /dashboard and a session cookie is set
And after 5 failed attempts the account is locked for 15 min  # error path
```

**Definition of Done (DoD)** — team-wide, not per-story: code reviewed, tests passing in CI, acceptance criteria met, docs/changelog updated, feature-flagged if risky, deployed to staging, observability (logs/metrics/alerts) in place. "Done" means releasable, not "works on my machine."

## Release Gates & Readiness

Don't decide "ship?" in the launch meeting. Define gates up front; each is a checklist with a named owner who signs off.

**Release readiness checklist:**
- [ ] All committed scope **done** (DoD met) or explicitly de-scoped via CR
- [ ] Acceptance criteria verified; no open Sev-1/Sev-2 bugs
- [ ] Rollout plan: canary/phased %, success metrics, **rollback steps tested** (not just written)
- [ ] Feature flags wired; kill-switch verified in staging
- [ ] Observability: dashboards, alerts, and on-call owner for launch window
- [ ] Load/perf validated against the guardrail metric (e.g. p95 budget)
- [ ] Security/privacy review done (authz, PII, secrets); compliance sign-off if regulated
- [ ] Data migrations reversible / backed up; dry-run on prod-like data
- [ ] Docs, support runbook, and customer comms ready
- [ ] **Go/No-Go**: each gate owner gives an explicit go; sponsor approves

**Post-launch:** watch the success + guardrail metrics through the rollout; keep the on-call owner engaged; schedule a blameless review (below) within a week — for incidents *and* clean launches.

## Project Charter

The one-page contract that aligns everyone before work starts. Write it, get the sponsor to sign off, link it from the tracker. Keep it to a page.

```markdown
# <Project name> — Charter
Sponsor: <single exec who owns the outcome & budget>
Lead / DRI: <single accountable owner>   Date: <YYYY-MM-DD>   Status: Draft

## Problem & why now
<1–3 sentences: the problem, who has it, the cost of not solving it.>

## Outcome / success metrics
- <Measurable outcome, e.g. "checkout conversion +3pp by Q4">
- <Guardrail metric that must NOT regress, e.g. "p95 latency stays <400ms">

## Scope
In:  <bullets — what we ARE doing>
Out: <bullets — explicitly NOT doing, to kill scope creep early>

## Milestones (target, not commitment until planned)
- M1 Discovery complete — <date>
- M2 Beta / first usable slice — <date>
- M3 GA / launch — <date>

## Budget / team       Key risks & assumptions      Decision rights
<headcount, $, infra>  <top 3, link RAID log>       <DACI: see Decision Log>
```

### Kickoff Checklist

- [ ] Charter written and **signed off by the sponsor**
- [ ] Single accountable owner (DRI) named — exactly one
- [ ] Problem statement + success metrics (incl. guardrails) defined
- [ ] Stakeholders identified (RACI complete)
- [ ] Scope documented (in-scope / out-of-scope)
- [ ] Timeline with milestones
- [ ] Dependencies mapped with owners and dates (see Dependency Contracts)
- [ ] RAID log started (Risks, Assumptions, Issues, Dependencies)
- [ ] Communication plan agreed
- [ ] Tech approach reviewed; key decisions captured as ADRs

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

## Dependency Contracts

A tracking table isn't enough — a cross-team dependency needs an explicit **contract** both sides agree to, or it slips silently. For each one, pin down: **what** (the interface/deliverable), **owner** (a named person, not a team), **date** (committed, not "soon"), **acceptance** (how you'll know it's done/correct), and a **fallback** if it's late.

| Dependency | Owner (named) | Interface / contract | Committed by | Acceptance | Fallback if late | Status |
|---|---|---|---|---|---|---|
| Auth API v2 | @platform-lead | OpenAPI spec frozen + staging endpoint | Sprint 5 start | Contract tests green in our CI | Keep v1 behind flag, ship without SSO | In progress |
| Design system update | @design-lead | Figma tokens + published components | Sprint 4 | Components in Storybook | Inline one-off styles, refactor later | At risk |

**Rules of thumb:**
- Freeze the **interface contract** (API schema, event payload, component props) *before* both teams build against it; track schema/contract changes as change requests.
- Prefer **contract tests / mocks** so your team can build against the agreed interface before the dependency is real — decoupling delivery from the other team's timeline.
- Escalate any at-risk dependency **≥2 sprints before** its needed date, via the sponsor and the at-risk owner's manager — don't wait for it to be blocked.
- Every dependency also lives in the **RAID log** (D); the contract table is the working detail.

## Burndown Charts

- **Burndown:** Remaining work vs. time (scope creep = line goes up)
- **Burnup:** Completed work + total scope vs. time (shows scope changes explicitly)

Use burnup for stakeholder reporting (makes scope changes visible).

## Anti-Patterns

| Anti-pattern | Why it bites | Do instead |
|---|---|---|
| **Weaponized velocity** | Velocity becomes a productivity target → estimate inflation, gaming, burnout; it's a *planning* signal, not a KPI | Forecast with throughput ranges; never compare teams or report velocity to execs as performance |
| **Output-only OKRs** | KRs that are shipped features ("launch X") can be "done" while moving no metric — busywork dressed as strategy | Every KR is an outcome; features are initiatives under it |
| **Too many WIP states / no limits** | Long pipelines hide where work stalls; everything "in progress," nothing finishing | Few columns, cap the contended stage, watch work-item age |
| **No single accountable owner** | Shared accountability = no accountability; decisions stall, blame diffuses | Exactly one DRI per project, one Approver (A) per decision/row |
| **Retro theatre** | Same issues every sprint, no change → cynicism, retros get skipped | ≤3 action items, each with owner + due date; review last retro's actions *first* |
| **Scope creep by silence** | Untracked "small" additions blow the date with no decision trail | Charter In/Out baseline + change requests for baseline changes |
| **Status by activity** | "We worked hard on X" hides whether the outcome is at risk | Lead with RAG + outcome metrics + explicit asks |
| **Estimate as commitment** | Treating a forecast as a promise punishes uncertainty, breeds padding and sandbagging | Commit to a confidence range; protect with an unplanned-work buffer |
| **Dependency by hope** | "They said it'd be ready" with no contract → silent slip | Frozen interface contract + named owner + dated commitment + fallback |

## Context Adaptations

**Hybrid Scrum / Kanban (Scrumban).** Common in 2026 for teams with mixed planned + interrupt-driven work. Keep sprint planning + retro for rhythm and stakeholder cadence, but run the board with **WIP limits and flow metrics** instead of a rigid commitment. Add an Expedite lane for interrupts so they don't blow the sprint.

**Remote / distributed / async.** Default to **written + async**: a decision log and status doc beat a meeting nobody remembers. Replace daily standup with an async written check-in; reserve synchronous time for decisions and unblocking, not status. Be explicit about time-zone overlap windows; capture every meaningful decision as an ADR so people across zones aren't blocked waiting to ask.

**Regulated / safety-critical (fintech, health, gov).** Add explicit compliance/security gates to release readiness; keep an **audit trail** (immutable decision log, signed approvals, change requests) — auditors will ask "who approved this and when?" Map controls (SOC 2 / ISO 27001 / HIPAA / GDPR / PCI as applicable) to release gates; never let "move fast" skip a required sign-off. *This is operational guidance, not legal advice — confirm specific obligations with compliance/legal counsel.*

## Tooling (mid-2026)

Pick tools that make the artifacts above *live*, not screenshots in a doc. Capabilities and pricing change often — **verify current plans/limits at each vendor's pricing page** before standardizing.

| Tool | Sweet spot | Notes |
|---|---|---|
| **Linear** | Fast-moving product/eng teams | Opinionated, keyboard-first; cycles ≈ sprints, Projects/Initiatives for roadmap; strong GitHub/Slack sync |
| **Jira** + **Jira Product Discovery (JPD)** | Larger/regulated orgs needing process + audit trail | JPD handles idea/opportunity prioritization → feeds delivery in Jira; heavy but governable |
| **GitHub Projects** | Teams living in GitHub | Issues/PRs as the source of truth; custom fields, roadmap/board views, automation via built-in workflows + Actions |
| **Asana / Notion** | Cross-functional & ops-heavy programs | Notion = charter/RAID/ADR docs + lightweight DB; Asana = structured tasks + rules/automation for status roll-ups |

**AI-assisted tracking (use, but verify):** AI meeting notetakers can auto-draft action items, decisions, and owners — pipe them straight into the decision log and tracker. LLM assistants in Linear/Jira/Notion can draft status updates from board state, summarize a sprint, triage/dedupe incoming issues, and surface stale work-items. **Always have a human verify owners, dates, and the RAG call before anything goes to stakeholders** — an AI summary that quietly mislabels a red project as green is worse than no summary.

> **Cross-skill:** for competitive/market inputs that feed a charter's "why now" or OKR targets, see the `competitor-intelligence` skill.


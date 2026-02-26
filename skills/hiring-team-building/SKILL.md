---
name: hiring-team-building
description: "Hire, onboard, and build high-performing teams in the EU — covering labor law, structured interviews, remote work regulations, and team design."
---

# Hiring & Team Building

## EU Labor Law Essentials

### Employment Contracts

**Required written terms (Directive 2019/1152, "Transparent Working Conditions"):**
- Job title, description, start date, workplace
- Salary, pay frequency, benefits
- Working hours, overtime rules
- Notice period, probation period (max 6 months)
- Applicable collective bargaining agreements
- Social security contributions

**Key rules by jurisdiction:** See `references/eu-labor-law-by-country.md`

| Topic | Typical EU Range | Watch Out |
|-------|-----------------|-----------|
| Probation | 1-6 months | Some countries cap at 3 months for short contracts |
| Notice period | 1-3 months (scales with tenure) | Germany: up to 7 months after 20 years |
| Paid leave | 20-30 days/year | EU minimum 4 weeks (Directive 2003/88/EC, Art. 7) |
| Max weekly hours | 48h average (Working Time Directive) | Opt-out only in UK (post-Brexit), not EU |
| Works councils | Mandatory above thresholds | Germany: ≥5 employees; France: ≥11; Netherlands: ≥50 |

### TUPE Transfers (Directive 2001/23/EC)

When acquiring a company or outsourcing services: employees transfer automatically with existing terms. Cannot dismiss due to transfer. Must inform/consult employee representatives.

## Job Description Framework

```markdown
# [Role Title] — [Team]

## Impact
What this person will achieve in first 12 months (3 bullet max)

## Responsibilities (6-8 bullets)

## Requirements (hard filters only — things you'd reject a CV for)
- X years experience with [specific technology]
- Legally authorized to work in [country]

## Preferred (nice-to-haves — never used to reject)
- Experience with [adjacent tech]
- Background in [domain]

## What We Offer
- Compensation range: €X-Y (transparent)
- Benefits, equity, remote policy
```

**Inclusive language checklist:**
- [ ] No gendered pronouns or coded language ("rockstar", "ninja", "manpower")
- [ ] Requirements list ≤5 items (women apply at 100% match; men at 60%)
- [ ] State salary range (required by law in some EU jurisdictions)
- [ ] Mention accommodations available

## Structured Interview Design

### Interview Scorecard

| Competency | Question | 1 (Miss) | 3 (Meet) | 5 (Exceed) | Score |
|-----------|----------|----------|----------|------------|-------|
| Technical depth | "Walk me through how you'd design [system]" | Cannot articulate trade-offs | Solid design with reasonable trade-offs | Novel insights, anticipates edge cases | _ |
| Problem-solving | "Tell me about a time you debugged a complex issue" | Vague, no structure | STAR format, clear resolution | Systemic fix, prevented recurrence | _ |
| Collaboration | "Describe a disagreement with a colleague" | Blames others | Resolved constructively | Changed team process for the better | _ |
| Ownership | "Tell me about a project you drove end-to-end" | Executed tasks only | Owned scope and delivery | Identified the need, proposed and delivered | _ |

**Process:**
1. **Screen** (30 min) — Recruiter: role fit, expectations, salary alignment
2. **Technical** (60 min) — Live problem-solving or take-home (respect candidate time: max 3h)
3. **System design** (45 min) — Architecture discussion, trade-offs
4. **Culture/values** (45 min) — Behavioral questions, scorecard above
5. **Debrief** — All interviewers score independently BEFORE group discussion (avoid anchoring)

**Anti-bias rules:** Same questions for all candidates. Score before discussing. No "gut feeling" — evidence only.

## Remote Work in the EU

### Right to Disconnect

Enacted or proposed in: France, Spain, Belgium, Portugal, Ireland, Italy. Employers must define policies on after-hours communication. See `references/right-to-disconnect-by-country.md`.

### Cross-Border Tax & Social Security

| Scenario | Rule |
|----------|------|
| Employee in Country A, employer in Country B | Social security: generally where employee works (Reg. 883/2004) |
| Remote worker >25% in home country | Social security in home country (A1 certificate required) |
| Permanent establishment risk | >183 days or fixed place of business may create tax presence |
| Posted Workers Directive (96/71/EC, revised 2018/957) | Must apply host country minimum pay, max work periods, safety standards |

**Action:** For each cross-border remote employee: get A1 certificate, check PE risk, apply host-country minimum terms.

## Onboarding Framework (30-60-90)

| Phase | Focus | Deliverables |
|-------|-------|-------------|
| **Pre-boarding** (before day 1) | Admin + welcome | Signed contract, equipment shipped, accounts provisioned, welcome pack |
| **Days 1-30** | Learn | Meet team, understand architecture, complete first small PR/task, assigned buddy |
| **Days 31-60** | Contribute | Own a feature or project area, attend on-call rotation (shadow), give first demo |
| **Days 61-90** | Own | Independent delivery, first performance check-in, feedback both directions |

**30-60-90 check-in template:** See `references/onboarding-checkin-template.md`

## Compensation & Equity

### Benchmarking Sources
- levels.fyi, Glassdoor, Figures.hr (EU-specific), Ravio, Mercer
- Compare by: role, seniority, city/region, company stage

### ESOP in EU Context

| Country | Tax Event | Favorable Regime |
|---------|-----------|-----------------|
| **Germany** | Exercise (dry income problem) | §19a EStG: defer tax until liquidity event (for startups <€100M revenue) |
| **France** | Exercise + sale | BSPCE: favorable 12.8% flat tax for qualifying startups |
| **Netherlands** | Exercise | Stock option deferral possible for startups since 2023 |
| **Ireland** | Exercise | KEEP scheme: CGT rate (33%) instead of income tax for qualifying |

**Key issues:** Dry income (tax on exercise with no cash), cliff/vesting enforceability, leaver provisions. Always get local tax + employment counsel. See `references/esop-eu-comparison.md`.

## Team Topology Patterns

| Pattern | When to Use | Communication |
|---------|-------------|---------------|
| **Stream-aligned** | Default. Teams own a product/service area end-to-end | Low cross-team dependency |
| **Platform** | Shared infrastructure (CI/CD, auth, data) | Self-service APIs, minimal tickets |
| **Enabling** | Temporary coaching (e.g., help team adopt k8s) | Time-boxed, skill transfer focus |
| **Complicated subsystem** | Deep specialist domain (ML, video codec) | Clear interface contract |

**Rule of thumb:** Minimize cognitive load per team. If a team can't hold their domain in their heads, split it.

## Performance Reviews (OKR-Based)

**Quarterly cycle:**
1. **Set OKRs** — 3-5 objectives, 2-4 key results each. Mix output (ship X) and outcome (improve Y by Z%)
2. **Monthly check-in** — Progress on KRs, blockers, support needed (15 min 1:1 agenda item)
3. **Quarter end** — Self-assessment + manager assessment. Score KRs 0-1.0. Target 0.6-0.7 (stretch goals)
4. **Calibration** — Cross-team calibration to ensure consistency

**Decouple from comp:** OKR scores should NOT directly determine bonuses. Otherwise people sandbag targets.

## Diversity & Inclusion

- [ ] Blind CV screening (remove name, photo, university)
- [ ] Diverse interview panels (min 1 underrepresented interviewer)
- [ ] Track pipeline diversity at each stage (application→screen→interview→offer→accept)
- [ ] Set targets (not quotas) and report progress quarterly
- [ ] Inclusive benefits: parental leave (all genders), flexible hours, mental health support
- [ ] Pay equity audit annually — correct gaps proactively
- [ ] EU Pay Transparency Directive (2023/970): companies >100 employees must report gender pay gap by June 2027

## Hiring Process Checklist

- [ ] Write inclusive job description with salary range
- [ ] Define scorecard before opening role
- [ ] Source candidates (job boards, referrals, direct outreach — diversify channels)
- [ ] Structured interviews with independent scoring
- [ ] Reference checks (2 minimum, ask about collaboration not just skills)
- [ ] Written offer with all terms per Directive 2019/1152
- [ ] Pre-boarding checklist triggered on acceptance
- [ ] 30-60-90 onboarding plan shared with new hire and manager
- [ ] Probation review scheduled at midpoint and end

See `references/hiring-process-flowchart.md` for the full workflow diagram.


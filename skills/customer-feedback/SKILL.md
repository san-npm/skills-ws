---
name: customer-feedback
description: "Design and operate a Voice of Customer program — NPS/CSAT/CES collection, survey instrumentation, feedback data model, AI-assisted tagging, RICE+ prioritization, and roadmap integration. Use when standing up VoC, normalizing satisfaction metrics, writing survey copy/triggers, deduping feedback to accounts, or running churn/beta loops."
---

# Customer Feedback

## Metric Framework

| Metric | Question | Scale | When to Use |
|--------|----------|-------|-------------|
| **NPS** | "How likely are you to recommend [product] to a friend or colleague?" | 0-10 (Detractor 0-6, Passive 7-8, Promoter 9-10). NPS = %Promoters − %Detractors, range −100..+100 | Relationship health, quarterly+ |
| **CSAT** | "How satisfied were you with [interaction]?" | 1-5 (1 Very dissatisfied → 5 Very satisfied). CSAT% = (count of 4+5) / total responses × 100 | Post-transaction, support close |
| **CES** | "[Product] made it easy for me to [handle my issue]." | Agreement scale. Normalize to %top-2-box | Post-task completion |
| **PMF Score** | "How would you feel if you could no longer use [product]?" | Very / Somewhat / Not disappointed (Sean Ellis test; target >40% "very") | Product-market fit |

### Scale wording matters — pick a standard and stick to it

The single biggest source of "our scores don't match the benchmark" is silently changing scale length, labels, or polarity. Lock these down before launch and never change them mid-program (a change resets your trend line).

- **NPS** — always 0-10, 11 points, label only the endpoints ("Not at all likely" / "Extremely likely"). Report the net score AND the raw distribution (a +30 from 60/30/10 behaves nothing like a +30 from 30/70/0).
- **CES** — two competing conventions exist; choose one and document it:
  - **CES 2.0 (recommended)** — *agreement* statement "[Product] made it easy to handle my issue" on a **7-point** scale (1 Strongly disagree → 7 Strongly agree). Score = mean, or %top-2-box (6-7). This is the modern CEB/Gartner form; higher = less effort = better.
  - **Legacy CES 1.0** — *effort* question "How much effort did you personally have to put forth?" on 1-5 or 1-7 where **higher = MORE effort = worse**. Polarity is inverted vs. CES 2.0 — mixing the two silently flips your trend. Avoid unless you have historical data on it.
  - 5-point agreement is acceptable for low-literacy/mobile audiences; just don't compare a 5-point mean to a 7-point mean. Always normalize cross-survey comparisons to **%top-2-box** rather than raw means.
- **CSAT** — 1-5 is standard; some teams use 1-3 (mobile) or 1-7. Report %satisfied (top-2-box) for comparability, not the mean (means hide bimodal "love it / hate it" splits).

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

### Survey instrumentation (copy + triggers + suppression)

Exact in-app NPS micro-survey copy:

```
Q1: "How likely are you to recommend Acme to a friend or colleague?"
    [0]──────────────[10]   labels: 0 = "Not at all likely", 10 = "Extremely likely"
Q2 (shown after Q1 answered, branched on score):
    Detractor 0-6:  "We're sorry to hear that. What went wrong?"
    Passive 7-8:    "Thanks! What's the one thing we could improve?"
    Promoter 9-10:  "Great! What do you love most?"   (then optionally a review/referral CTA)
```

**Trigger conditions (eligibility, all must be true):**

```yaml
# survey-eligibility.yaml — evaluate at the trigger event, server-side
triggers:
  nps_relationship:
    fire_on: scheduled_cohort_tick        # NOT on every session — pre-assign cohort, fire on its day
    eligibility:
      - account_age_days: ">= 30"
      - last_active_days: "<= 30"          # don't survey ghosts in-app; route them to email
      - role_in: [admin, owner, billing]   # survey decision-makers, not every seat
    suppression:
      - surveyed_any_within_days: 90       # global frequency cap across ALL surveys
      - dismissed_within_days: 30          # respect a dismissal
      - in_active_support_ticket: true     # don't ask "how likely to recommend" mid-fire
      - churned_or_past_due: true          # exclude; route to churn survey instead
      - sampling_rate: 0.25                # cap in-app exposure; rotate cohorts
```

Apply ONE global frequency cap across every survey channel (NPS, CSAT, CES, in-app polls). Per-survey caps still let a user get hit four times in a week. Suppression must also fire on dismissal, not just on completion.

### Event schema (instrument once, analyze forever)

Emit a typed event the moment a response lands so the warehouse, not the survey tool, is your source of truth:

```json
{
  "event": "survey_responded",
  "survey_type": "nps",            // nps | csat | ces | pmf | churn
  "survey_version": "2026-q2-v1",  // bump when wording/scale changes — protects trend integrity
  "score_raw": 8,                  // exact answer as given
  "scale_min": 0, "scale_max": 10, // store the scale so a later rescale is reversible
  "bucket": "passive",             // derived, not authoritative
  "verbatim": "Loved onboarding, billing UI is confusing",
  "verbatim_lang": "en",
  "channel": "in_app",             // in_app | email | sms | link
  "locale": "en-US",
  "user_id": "u_123", "account_id": "a_456",
  "trigger": "nps_relationship",
  "ts": "2026-06-07T10:00:00Z"
}
```

### Localization & accessibility

- Translate BOTH question and endpoint labels; never localize numbers into words ("eight" vs "8" breaks parsing and benchmarks). Store `verbatim_lang` and translate open-ends to a pivot language before tagging.
- Keep scale **polarity identical across locales** (left = worst everywhere). Some locales read right-to-left — flip the visual layout, not the semantic mapping.
- Accessibility: the rating control must be keyboard-operable and screen-reader labeled (radio group with an `aria-label` per point, not a bare slider); color must never be the only cue (don't use a red→green gradient alone). Provide a text alternative to emoji-face CSAT scales.
- Beware cross-cultural scale bias (e.g., some cultures avoid extreme ends) — segment and benchmark within region, never pool a global raw mean.

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
| **Reach** | Users (or accounts) affected per quarter | Absolute number |
| **Impact** | Effect per user (Massive=3, High=2, Medium=1, Low=0.5, Minimal=0.25) | 0.25–3 |
| **Confidence** | Data backing (High=100%, Medium=80%, Low=50%) | 50–100% |
| **Effort** | Person-months | Absolute number |

```python
# Example RICE calculation
reach = 2000        # users/quarter
impact = 2          # high
confidence = 0.8    # medium — have support tickets but no interviews
effort = 3          # person-months
rice = (reach * impact * confidence) / effort  # = 1066.67
```

### RICE is necessary but not sufficient

Plain RICE optimizes for breadth of users and ignores money, strategy, and risk. A feature 5 enterprise accounts demand can beat one 2,000 free users want. Use RICE to **rank within a lane**, then apply these gates and weights:

| Dimension | Why RICE misses it | How to fold it in |
|-----------|-------------------|-------------------|
| **Revenue / account value** | Reach counts heads, not ARR. 5 accounts at $80k ≫ 2,000 free seats | Weight Reach by ARR-at-stake, or run a separate `revenue_at_risk` track and reserve roadmap capacity for it |
| **Strategic fit** | A high-RICE item can pull off-vision | Multiply by `strategic_fit` (0.5 off-strategy → 1.5 core bet); kill <0.5 regardless of RICE |
| **Regulatory / security / compliance** | Non-negotiable; has no "Reach" | Treat as a **gate, not a score** — GDPR/SOC2/accessibility/legal items jump the queue; never let RICE deprioritize a compliance deadline |
| **Dependency / sequencing risk** | Effort hides "blocked on platform work" | Add a `risk` divisor or block items behind their prerequisites; flag external-dependency items |
| **Strategic debt / enabler value** | Reach ≈ 0 for refactors that unblock 10 future features | Score the *downstream* reach it enables, or carve a fixed % of capacity for enablers |

```python
# RICE+ — rank within a lane, after gating compliance/legal separately
weighted = rice * strategic_fit / max(risk, 1)
arr_adjusted = weighted * (arr_at_risk / median_arr_at_risk)  # optional B2B tilt
# Capacity split (tune per company stage), e.g.:
#   60% customer-requested (RICE+),  20% strategic bets,  20% reliability/debt/compliance gates
```

Document the scoring rubric so scores are comparable across PMs; an un-anchored "Impact" or "Confidence" makes the whole queue noise.

## Qualitative Analysis Workflow

1. **Tag** — Apply taxonomy: `bug`, `feature-request`, `ux-friction`, `praise`, `pricing`
2. **Theme** — Cluster tags into themes (e.g., "onboarding confusion", "missing integrations")
3. **Sentiment** — Score positive/neutral/negative per theme
4. **Quantify** — Count mentions per theme per period; track trends
5. **Prioritize** — Cross-reference themes with RICE scores and revenue impact

**Tagging rules:** Use max 3 tags per item. Maintain ONE shared, versioned taxonomy (below). Review and merge tags monthly — uncontrolled tag sprawl ("login-bug", "log-in", "auth-issue") is the #1 reason VoC dashboards rot.

### Feedback taxonomy

Keep it shallow: a closed list of **types** (mutually exclusive, what kind of signal), a controlled vocabulary of **themes** (the product area / job), and free **attributes** (severity, sentiment, source). Map raw tags to canonical IDs so renames don't break history.

```yaml
# feedback-taxonomy.yaml — version it; changing IDs breaks trend lines
version: 2026-q2

types:                      # exactly one per item
  - id: bug                 # broken vs documented/expected behavior
  - id: feature_request     # net-new capability
  - id: enhancement         # improve existing capability
  - id: ux_friction         # works, but hard/confusing
  - id: performance         # slow, timeouts, latency
  - id: pricing_packaging   # cost, plan limits, billing model
  - id: docs_education      # missing/unclear docs, onboarding
  - id: trust_compliance    # security, privacy, data residency, SLA
  - id: praise              # positive, no action required
  - id: churn_reason        # cited at cancellation (see churn survey)

themes:                     # controlled vocabulary; tie to product areas
  - id: onboarding
  - id: integrations
    children: [integration_salesforce, integration_slack, integration_api]
  - id: reporting_analytics
  - id: collaboration_permissions
  - id: mobile
  - id: billing_admin
  - id: reliability_uptime

attributes:
  severity:    [blocker, high, medium, low]   # for bug/performance
  sentiment:   [positive, neutral, negative]
  source:      [in_app, support, nps, csat, ces, sales_call, review, community, social, churn_survey]
  customer_segment: [free, smb, mid_market, enterprise]   # join from CRM, don't hand-enter

aliases:                    # raw → canonical, so tag merges are lossless
  "log-in": login          # (login lives under a theme tag, not a type)
  "auth-issue": login
  "sso": integration_api
```

**Governance:** one owner approves new theme IDs; everything else routes to `aliases`. Audit monthly: list tags used < 3 times → merge or alias. Never delete an ID (it orphans history) — deprecate and alias it.

### AI-assisted qualitative analysis (2026)

LLM-assisted tagging, clustering, and summarization now do the first pass on high-volume verbatims; humans verify. Treat it as augmentation, not autopilot.

- **Pipeline:** (1) **redact PII before the model sees it** — strip emails, phone numbers, names, card/account numbers, IDs with a deterministic redactor; (2) classify against the *closed* taxonomy above (constrain the output to known IDs — don't let the model invent tags); (3) cluster verbatims into emergent themes for human naming; (4) **human reviews** low-confidence and all `trust_compliance`/legal items; (5) sample-audit ~10% of auto-tags weekly for drift.
- **Consent & data terms:** only send customer text to a model whose **data-retention and training terms** you've checked — prefer a zero-retention / no-train enterprise tier (or self-hosted/open-weights for regulated data). Confirm whether your survey consent and privacy policy actually permit "AI processing of feedback"; if not, update them. For EU data, confirm processing region and a DPA/sub-processor listing.
- **Quality:** measure agreement between auto-tags and a human gold set (target ≥ 0.8 on top types); pin the model/version so a vendor upgrade doesn't silently shift your trend; keep a human-in-the-loop for anything that drives a roadmap or refund decision.
- **Never** auto-send a customer-facing response or auto-resolve a ticket purely on model output for detractors or compliance issues.

## Closing the Feedback Loop

```
Respond → Act → Communicate
   │        │        │
   ▼        ▼        ▼
 Acknowledge   Ship fix/   Notify the person
 within 48h    feature     who requested it
```

- **Detractors (NPS 0-6):** Personal outreach within 24h. Ask to understand, don't defend.
- **Feature shipped:** Email requesters with changelog link. "You asked, we built."
- **Won't build:** Be honest. "We considered this but chose X because Y."

### Response templates

Plain text from a human's name (not "noreply@"). Use placeholders `{first_name}`, `{product}`, `{feature}`, `{verbatim_quote}`. Reply from the SAME channel the feedback arrived on where possible.

**Detractor (NPS 0-6) — within 24h, 1:1, from a human:**
```
Subject: Sorry we let you down, {first_name}

Hi {first_name},

You rated us a {score} — that's on us, and I'd genuinely like to
understand what went wrong. You mentioned: "{verbatim_quote}".

Could we grab 15 minutes this week? I'd rather hear it directly than
guess. Either way, thank you for telling us — it's the only way we fix it.

— {your_name}, {your_title}
```
Rules: acknowledge, don't defend; one specific ask; no discount bribe in the first touch (it reads as buying silence). Log the root cause to the taxonomy.

**Passive (7-8):**
```
Thanks for the {score}, {first_name}. You said the one thing to improve
was "{verbatim_quote}" — we've logged it. What would make this a 9 or 10
for you?
```

**Promoter (9-10):**
```
Love to hear it, {first_name}! If you've got 30 seconds, a quick review
on {review_site} genuinely helps others find us: {review_link}
```
(Only ask promoters for reviews/referrals; never bait detractors toward public reviews.)

**Feature shipped — close the loop with original requesters:**
```
Subject: You asked, we built it: {feature}

Hi {first_name},

A while back you asked for {feature}. It's live today. Here's what changed
and how to use it: {changelog_link}.

Thanks for pushing us — feedback like yours sets the roadmap.

— The {product} team
```

**Won't build (declining a request) — be honest, leave the door open:**
```
Hi {first_name},

Thanks for suggesting {feature}. We looked hard at it and decided not to
build it right now, because {reason} (we're prioritizing {alternative}).

I know that's not the answer you wanted. If your use case changes or this
becomes a blocker, reply here — we revisit these quarterly.
```

**Acknowledge-on-receipt (in-app/board auto-reply):**
```
Got it, thanks! We read every piece of feedback. We won't promise a date,
but you'll hear from us here if this ships. — {product}
```
Set a clear expectation (you read it; no SLA on building) rather than silence or a false promise.

## Churn Surveys (Exit Interviews)

Trigger on cancellation. Keep to 3 questions max:
1. Primary reason (multiple choice: too expensive, missing feature, switched competitor, not needed, other)
2. Open-ended: "What could we have done differently?"
3. "Would you consider returning if we [addressed reason]?" (Yes/No)

**Analyze with sample size and revenue weighting — not a flat percentage.** "20% cite the same reason" means nothing without `n`: 20% of 5 cancellations (1 customer) is noise; 20% of 500 is a fire. Apply a floor and weight by value:

- Require a minimum `n` before acting (e.g., ≥ 30 responses in the period for a reason to be actionable; below that, treat as anecdote and watch the trend).
- Weight reasons by **churned ARR**, not headcount. Ten free users leaving over "missing feature X" is a lower priority than two enterprise accounts leaving over the same — surface both a count view and a $-lost view.
- Use a rolling window and a control limit, not a hard 20%: escalate when a reason's share rises significantly above its own trailing baseline (a sudden jump matters more than a stable absolute level), or when reason-weighted ARR-at-risk crosses your retention team's threshold.
- Segment churn reasons by plan, tenure, and acquisition source before concluding — an aggregate "too expensive" can hide that only one cohort is price-sensitive.

## Beta Testing Program

| Phase | Audience | Size | Duration | Goal |
|-------|----------|------|----------|------|
| Alpha | Internal + 5 power users | 10-20 | 2 weeks | Find breaking bugs |
| Closed Beta | Opted-in segment | 50-200 | 2-4 weeks | Usability + edge cases |
| Open Beta | Feature-flagged rollout | 5-20% of base | 1-2 weeks | Scale validation |

**Recruit a representative panel, not just fans.** Seeding beta only from NPS promoters (9-10) produces flattering, low-signal results — happy, forgiving users won't surface the friction that drives churn. Build the cohort deliberately:

| Recruit | Why | Rough mix |
|---------|-----|-----------|
| **Promoters (9-10)** | Engaged, will actually use it and reply | ~25% |
| **Passives / target-segment neutrals (7-8)** | The persuadable majority — closest to your real median user | ~40% |
| **High-value detractors / at-risk accounts (0-6)** | They feel the pain most; fixing them validates the feature *and* may save the account | ~20% |
| **Representative edge cases** | Power users, large data volumes, accessibility/assistive-tech users, non-English locales, integration-heavy accounts | ~15% |

Stratify by the segments that matter for the feature (plan tier, company size, geography, device). Match the panel to the audience the feature ships to — not to who likes you. Track completion/usage per segment so silent drop-off (a quiet "this is broken") isn't mistaken for approval.

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

> Pricing **models** below are directional and change frequently — vendors repackage tiers, rename plans, meter on different units, and move features behind add-ons regularly. Treat these as "how they tend to charge," not quotes. **As of Jun 2026, verify current packaging and price on each vendor's pricing page** (canny.io, productboard.com, pendo.io, hotjar.com, delighted.com) before committing, and re-check at renewal. Watch for unit traps: "per tracked user" and "per MAU" scale with your growth, "per response" punishes high survey volume, and seat-based tools meter *makers/admins*, not viewers.

| Tool | Best For | Pricing Model (verify) | Key Strength |
|------|----------|--------------|--------------|
| **Canny** | Public feature voting boards | Tiered; tracked-users/admins | Transparent roadmap |
| **Productboard** | Feedback→roadmap workflow | Per-maker seat | Prioritization frameworks |
| **Pendo** | In-app guides + analytics | Per-MAU | Combines feedback with usage data |
| **Hotjar** | On-page surveys + heatmaps | Per-session/identified user | Visual context |
| **Delighted** | NPS/CSAT automation | Per-response/tiered | Simple, fast setup |

Adjacent categories worth a look (also verify pricing): **Dovetail / Marvin** (AI research repository + verbatim tagging), **Sprig** (in-product surveys + AI analysis), **Enterpret / Unwrap.ai** (LLM auto-tagging across all feedback sources), **Typeform / Qualtrics** (general survey), **Intercom / Zendesk** (support-embedded CSAT). For B2B, confirm the tool can **stitch feedback to CRM accounts and ARR** (see data model) — a pretty voting board that can't tie a request to a $-value is half the value.

## Feedback Data Model

A VoC program is only as good as its data model. The trap is letting the survey tool or the support inbox be the source of truth — you can't dedupe, weight by ARR, or close the loop without a normalized store (warehouse or product DB). Core entities:

```
feedback_item
  id                pk
  source            enum  # in_app | support | nps | csat | ces | sales_call | review | community | social | churn_survey
  source_ref        text  # external id (ticket #, survey response id, board post id) — for idempotent ingest
  type              enum  # FK -> taxonomy.types (bug, feature_request, ...)
  themes            text[] # FK -> taxonomy.themes (max ~3)
  sentiment         enum  # positive | neutral | negative
  severity          enum  # blocker | high | medium | low (nullable)
  verbatim          text
  verbatim_lang     text
  pii_redacted      bool  # true once scrubbed for AI processing
  user_id           fk -> user (nullable: anonymous feedback allowed)
  account_id        fk -> account (nullable)
  created_at        ts
  dedup_group_id    fk -> feedback_item.id (canonical item this merges into)
  linked_opportunity_id  fk -> crm_opportunity (nullable)  # open/expansion deal riding on this
  linked_roadmap_id      fk -> roadmap_item (nullable)

user
  id, account_id, email_hash, role, locale, first_seen, last_active
  # identity keys for stitching: email_hash, anonymous_id (pre-login), external_ids[]

account
  id, name, plan_tier, arr, segment (free|smb|mid_market|enterprise),
  csm_owner, renewal_date, health_score, region   # joined from CRM, never hand-typed

roadmap_item
  id, title, status (idea|planned|in_progress|shipped|wont_do),
  rice_score, strategic_fit, arr_at_risk (sum of linked accounts' ARR),
  changelog_url, shipped_at
```

**Deduplication & identity stitching (do not skip):**
- **Dedupe** on ingest: same `source` + `source_ref` is idempotent (re-syncs don't double-count). Across sources, cluster near-duplicate verbatims (embedding similarity or shared theme + same account in a window) into a `dedup_group_id` so "500 mentions" reflects 500 *distinct* signals, not one viral ticket re-imported.
- **Identity stitch** anonymous → known: carry an `anonymous_id` on pre-login feedback and merge to `user_id`/`account_id` on auth so a free-trial complaint follows them into a paid account. Stitch users → accounts from CRM so you can roll feedback up to ARR. Maintain an alias/merge map; never overwrite history on merge.
- **Permissions:** verbatims contain PII and candid criticism — gate raw verbatim access by role (support/PM see their queue; broad org sees aggregates only). Public feature boards must never expose private account names or another customer's text. Apply row-level scoping by `account_id` for CSMs.

## Privacy, Consent & Compliance

Feedback data is personal data. Bake these in from day one, not after a complaint:

- **Survey consent & transparency:** state in the survey/privacy policy what you collect, why, and that responses may be processed (incl. by AI) and stored. Don't pre-tick marketing opt-ins on a feedback form. Honor unsubscribe/quiet preferences in your global frequency cap.
- **Call/meeting recording & transcription:** get explicit consent before recording sales/support/research calls; some jurisdictions require **all-party** consent. Announce the recording and bot/notetaker, allow opt-out, and don't transcribe where consent is refused. Store transcripts under the same retention rules as other PII.
- **AI processing of feedback:** see "AI-assisted qualitative analysis" — redact PII before the model, use a vendor tier with **no-training / limited-retention** terms (and a DPA + sub-processor list for EU/regulated data), and keep humans in the loop for decisions.
- **Cross-border processing:** know where survey/support/AI vendors process and store data; for EU/UK personal data confirm a lawful transfer mechanism and processing region.
- **Retention & minimization:** set a retention TTL on raw verbatims and recordings; keep aggregates longer than raw PII. Don't hoard.
- **Deletion / DSAR propagation:** a deletion or access request must fan out to **every** store that holds the person's feedback — warehouse, survey tool, support system, research repo, recordings, and any AI vendor cache. Design the data model with a stable `user_id`/`email_hash` so deletion is a tractable join, not a manual hunt. Document the propagation path.
- This is general guidance, not legal advice — confirm specifics (GDPR/CCPA/CPRA, recording laws, sector rules) with your privacy/legal counsel for your jurisdictions.

## Feedback→Roadmap Integration

The loop only works if every signal flows into ONE system of record, gets prioritized on a fixed cadence, and ships a notification back to the humans who asked. End-to-end:

```
 sources                 ingest / normalize           prioritize              act / close loop
┌────────────┐         ┌──────────────────┐      ┌────────────────┐     ┌────────────────────┐
│ in-app     │         │ dedupe (source_ref│      │ RICE+ score    │     │ roadmap_item.status│
│ support    │  ──────▶│  + verbatim sim)  │─────▶│ gate compliance│────▶│  = shipped         │
│ NPS/CSAT   │  webhook│ tag → taxonomy IDs│ link │ weight by ARR  │ link│ → fire changelog + │
│ sales calls│         │ stitch user/acct  │      │ label customer-│     │   notify requesters│
│ reviews    │         │ store (warehouse) │      │ requested      │     │   on linked items  │
└────────────┘         └──────────────────┘      └────────────────┘     └────────────────────┘
       ▲                                                                          │
       └─────────────────────  status changes notify back  ◀──────────────────────┘
```

**Operating procedure:**
1. **Single system of record.** Every source writes a `feedback_item` (via webhook/integration), tagged to the shared taxonomy and stitched to `user`/`account`. No feedback lives only in someone's inbox.
2. **Weekly triage (30 min, PM + support lead).** Clear the untriaged queue: confirm type/theme, merge dupes into `dedup_group_id`, link to an existing `roadmap_item` or create one. Items inherit the requesters' accounts for ARR rollup.
3. **Prioritize on cadence.** Run RICE+ (gate compliance/legal separately; weight by `arr_at_risk`). Items entering the backlog get a `customer-requested` label and a link back to their feedback threads.
4. **Bidirectional links.** `roadmap_item.linked feedback ⇄ feedback_item.linked_roadmap_id`. A status change (planned → shipped) is the trigger for the loop-close — you can't notify requesters you can't trace.
5. **Auto close-the-loop.** On `status = shipped`, fire the "You asked, we built it" template to every distinct requester on the item (and update a public board entry if you keep one). Stamp `shipped_at` and the changelog URL.

### Reporting cadence

| Cadence | Owner | Audience | Contents |
|---------|-------|----------|----------|
| **Weekly** | PM + support | Product team | Untriaged queue cleared, new top themes, spikes vs. baseline |
| **Monthly** | PM | Product + eng leads | Theme trends, churn-reason analysis (n-gated, ARR-weighted), top RICE+ items, **action rate** (% of triaged feedback that moved to a decision) |
| **Quarterly** | VoC owner | Leadership | NPS/CSAT/CES trend by segment, what shipped from feedback + outcome, top unmet themes + recommendation |
| **Annual** | VoC owner | Leadership | Program health: survey response rates, sample sizes, action/close-the-loop rate, metric trend, tooling + taxonomy review |

Track meta-metrics, not just scores: **response rate** (is the sample representative?), **action rate** (does feedback change anything?), and **close-the-loop rate** (do requesters hear back?). A high NPS with a 2% action rate means you're collecting theater.

---
*Related skills: see `community-building` for forum/power-user feedback channels and `mvp-launcher` for early validation surveys (PMF/Sean Ellis test) when you don't yet have a customer base.*


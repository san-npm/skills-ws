## Contents

- 2. Activation Framework
- Defining Your Aha Moment
- Time-to-Value (TTV) Optimization
- Onboarding Patterns
- Activation Metrics and Benchmarks

## 2. Activation Framework

### Defining Your Aha Moment

The aha moment is the action (or set of actions) that correlates most strongly with long-term retention. It's when the user first experiences your product's core value.

**Famous examples (historical / anecdotal — treat as illustrations of the *pattern*, not as current benchmarks):**

These figures come from growth talks and case studies circa 2013–2020; the exact thresholds were never independently audited and the products have changed since. Use them to understand the *shape* of an aha moment, then derive your own from your data (method below). Do not quote these numbers as if they were current facts.

| Company | Aha Moment (as reported) | Reported signal | Era |
|---------|--------------------------|-----------------|-----|
| Slack | Team sends ~2,000 messages | High retention past this threshold | ~2014–2015 |
| Dropbox | Saves ≥1 file to a synced folder | Markedly higher retention vs non-savers | ~2010s |
| Facebook | 7 friends in 10 days | Retention cliff below this | ~2008–2012 |
| Zoom | Hosts first meeting | High return rate | ~2017–2019 |
| Figma | Invites a collaborator to a file | Higher retention vs solo users | ~2018–2020 |
| Notion | Creates several content-filled pages | Habit-formation threshold | ~2019–2020 |
| Calendly | Shares a link and gets first booking | Value realized | ~2018–2020 |

**The takeaway is the *type* of action, not the literal number:** the durable aha moments are collaborative (invite/share), data-creating (save/create), or outcome-producing (first booking/meeting). Always recompute the threshold for your own product.

**How to find YOUR aha moment:**
1. List all user actions in first 7 days
2. For each action, calculate Day 30 retention rate for users who did it vs didn't — **and the sample size in each group** (a 90% delta on 11 users is noise)
3. Rank candidates by retention delta, but discard any where either arm has < ~100 users or where the difference isn't statistically significant
4. **Beware confounders:** the action may just be a marker of an already-engaged user (selection bias), not the cause of retention. Control for an engagement proxy (e.g., sessions in days 0–2) before crediting the action
5. **Prove causation, don't assume it:** run a holdout experiment — randomly nudge half of new users toward the action and leave the other half alone, then compare Day-30 retention. If retention rises in the nudged arm, the action is causal and worth designing onboarding around. Correlation alone (steps 2–3) only generates the hypothesis

```sql
-- Find aha-moment candidates: for each candidate action,
-- compare day-30 retention of users who did it vs users who didn't.
WITH user_actions AS (
  SELECT
    e.user_id,
    MAX(CASE WHEN e.event = 'invited_teammate'     THEN 1 ELSE 0 END) AS invited,
    MAX(CASE WHEN e.event = 'created_project'      THEN 1 ELSE 0 END) AS created_project,
    MAX(CASE WHEN e.event = 'connected_integration' THEN 1 ELSE 0 END) AS connected
  FROM events e
  JOIN users  u ON u.id = e.user_id
  WHERE e.created_at BETWEEN u.signup_date AND u.signup_date + INTERVAL '7 days'
  GROUP BY e.user_id
),
retention AS (
  SELECT DISTINCT e.user_id, 1 AS retained_d30
  FROM events e
  JOIN users  u ON u.id = e.user_id
  WHERE e.created_at BETWEEN u.signup_date + INTERVAL '28 days'
                         AND u.signup_date + INTERVAL '35 days'
),
candidate AS (
  SELECT 'invited_teammate'       AS action, invited         AS did_it, user_id FROM user_actions
  UNION ALL
  SELECT 'created_project',       created_project, user_id FROM user_actions
  UNION ALL
  SELECT 'connected_integration', connected,       user_id FROM user_actions
),
stats AS (
  SELECT
    c.action,
    COUNT(*) FILTER (WHERE c.did_it = 1)                                  AS n_yes,
    COUNT(*) FILTER (WHERE c.did_it = 0)                                  AS n_no,
    AVG(COALESCE(r.retained_d30, 0)) FILTER (WHERE c.did_it = 1)::numeric AS p_yes,
    AVG(COALESCE(r.retained_d30, 0)) FILTER (WHERE c.did_it = 0)::numeric AS p_no
  FROM candidate c
  LEFT JOIN retention r ON r.user_id = c.user_id
  GROUP BY c.action
)
SELECT
  action,
  n_yes, n_no,
  ROUND(p_yes, 3)                       AS retention_if_yes,
  ROUND(p_no,  3)                       AS retention_if_no,
  ROUND(p_yes - p_no, 3)                AS abs_delta,
  ROUND(p_yes / NULLIF(p_no, 0), 2)     AS lift_ratio,   -- relative risk; >1 means the action correlates with retention
  -- two-proportion z-score: |z| > 1.96 ≈ p < 0.05 (treat smaller |z| as "not yet significant")
  ROUND(
    (p_yes - p_no) / NULLIF(
      sqrt( ((p_yes * n_yes + p_no * n_no) / NULLIF(n_yes + n_no, 0))
          * (1 - (p_yes * n_yes + p_no * n_no) / NULLIF(n_yes + n_no, 0))
          * (1.0 / NULLIF(n_yes, 0) + 1.0 / NULLIF(n_no, 0)) ), 0)
  , 2)                                  AS z_score
FROM stats
WHERE n_yes >= 100 AND n_no >= 100      -- drop under-powered candidates
ORDER BY abs_delta DESC;
-- Pick the action with the largest abs_delta AND |z_score| > 1.96.
-- Correlation only — confirm causality with a randomized nudge holdout before re-architecting onboarding.
```

### Time-to-Value (TTV) Optimization

**TTV = time from signup to aha moment.** Shorter TTV = higher activation rate.

| TTV Benchmark | Rating | Action |
|--------------|--------|--------|
| < 5 minutes | Excellent | Maintain, optimize edges |
| 5-30 minutes | Good | Remove friction steps |
| 30 min - 2 hours | Needs work | Redesign onboarding |
| > 2 hours | Critical | Product/UX overhaul needed |

**TTV reduction tactics:**
- Pre-fill data (templates, sample projects, demo content)
- Defer account setup (let them DO something before asking for profile info)
- Reduce required integrations before first value
- Use magic links instead of password creation
- Progressive profiling (ask questions across sessions, not all upfront)

### Onboarding Patterns

**1. Checklist pattern (Notion, Asana)**
- 4-6 tasks that guide to aha moment
- Progress indicator (completion %)
- Each task teaches a core feature
- Celebrate completion (confetti, badge, etc.)
- Dismiss option (don't trap power users)

**2. Progressive disclosure (Figma, Linear)**
- Start with simplest interface
- Reveal advanced features as user demonstrates readiness
- Contextual tooltips triggered by user behavior
- Never show everything at once

**3. Empty state design (Basecamp, Trello)**
- Empty states are NOT blank screens
- Show what it will look like with data
- One-click sample/template to populate
- Clear CTA: "Create your first [thing]"

### Activation Metrics and Benchmarks

| Metric | Formula | Benchmark by segment |
|--------|---------|---------------------|
| Activation rate | Users who hit aha moment / Total signups | B2B SaaS: 20-40%, Consumer: 10-25% |
| Time to activate | Median time from signup to aha moment | Target: < 1 day |
| Setup completion | Users who complete onboarding / Total signups | 40-60% is healthy |
| Day 1 retention | Users active day after signup / Total signups | 40-60% |
| Day 7 retention | Users active 7 days after signup / Total signups | 20-35% |

---
name: growth-hacking
description: "Growth strategy and experimentation — AARRR funnels, viral/referral loop economics, PLG onboarding, experiment design, and growth metrics, with responsible-growth and privacy guardrails. Use when modeling viral/referral loops, building activation or PLG onboarding funnels, designing growth experiments, or standing up growth dashboards."
---

# Growth Hacking

The orchestration layer for growth: pick the bottleneck, design an experiment, ship it, read the result honestly, compound the wins. This skill owns frameworks, loop economics, experiment design, instrumentation, and the guardrails that keep growth *legal and non-manipulative*. For deep execution it cross-links to siblings (do not duplicate them):

- **Experiment statistics / sample size / sequential testing** → `ab-testing`
- **PLG mechanics, freemium tiering, self-serve revenue** → `product-led-growth`
- **Churn, cohort, health/engagement scoring, win-back** → `retention-analytics`
- **Referral *program* mechanics, payouts, partner tracking** → `affiliate-marketing`
- **GA4, attribution models, dashboards** → `marketing-analytics`
- **Welcome/nurture/winback email + bulk-sender compliance** → `email-sequence`
- **GDPR/ePrivacy/consent (EU)** → `eu-legal-compliance`

Golden rule: **growth-hack the funnel, not the human.** Every tactic below must be truthful, reversible, and something you'd be comfortable explaining to the user out loud. Manipulative dark patterns are out of scope and increasingly illegal (see Responsible Growth).

---

## 1. AARRR Framework (Pirate Metrics)

| Stage | Core metric | How to read it | Typical SaaS reference range* |
|-------|-------------|----------------|-------------------------------|
| **Acquisition** | New qualified signups / channel | Cost (CAC) and quality (downstream activation), not raw volume | Channel-dependent; judge by CAC payback < 12 mo |
| **Activation** | % reaching the *aha* action in first session/week | Define the single action correlated with retention | Self-serve B2C 20–40%; PLG B2B 30–50% |
| **Retention** | Cohort retention at the natural usage cadence | Look at the curve *shape* (does it flatten?), not one number | Varies wildly by category — see note below |
| **Revenue** | Free→paid conversion / expansion (NRR) | Separate new conversion from expansion | Freemium 2–5%; free-trial 10–25%; NRR target >100% |
| **Referral** | Viral coefficient K and referral share of new users | Decompose K (see §2) instead of trusting one number | K rarely >1 in practice; >0.4 is already strong |

\* **These are loose reference ranges, not goals.** A 2% freemium conversion and a 25% free-trial conversion can describe equally healthy businesses. Benchmarks are meaningless without context: business model (freemium vs trial vs sales-assist), price point, ACV, acquisition channel, persona, and product category all move them by 5–10×. **Always establish your own baseline first, then cohort it** by channel and persona, and compare *yourself to yourself over time* (see §6). Public benchmark decks (OpenView PLG, ChartMogul, Lenny's surveys) are directional starting points — re-derive for your segment.

**Where to focus:** Fix the leakiest stage *that is upstream of money*. A common trap is optimizing acquisition while activation leaks 70% — you just pay to fill a bucket with a hole. Find the biggest absolute drop-off in the funnel, size the opportunity (`extra users retained × LTV`), and attack that. Retention is usually the highest-leverage and most-neglected stage: improving week-4 retention lifts every cohort that follows and raises the ceiling on viral and paid spend simultaneously.

---

## 2. Viral & Referral Loop Design

### 2.1 Loop types

| Type | Mechanism | Examples | Where it breaks |
|------|-----------|----------|-----------------|
| **Inherent / collaborative** | Using the product *requires* pulling others in | Slack channels, Zoom invites, Figma multiplayer, shared docs | Single-player use cases; recipient friction to join |
| **Incentivized referral** | Reward for inviting; ideally double-sided | Dropbox (+500 MB each), Uber/ride credits, fintech cash bonuses | Fraud, mercenary users, reward cost > LTV |
| **Content / embed** | User output is public and branded | "Made with X" footers, Spotify Wrapped, Canva share links, Typeform | Generic content nobody shares; brand fatigue |
| **Network-effect / social proof** | Value rises as the user's network joins | Marketplaces, "3 colleagues are here" | Cold-start; empty network on day one |

Word-of-mouth ("people just talk about it") is **not a loop you design** — it's an *output* of a great product plus a shareable moment. To make it actionable, instrument it: add a measurable share/invite surface at the emotional peak (e.g., right after the aha or a success event), give people a concrete asset to share (a result, a number, a badge), and track referral attribution so you know it's real rather than assumed.

### 2.2 The viral coefficient — done properly

The textbook formula `K = invites_sent × conversion_rate` is true only in a narrow first-order model and **routinely overstates growth.** Use this fuller decomposition:

```
K = i × c
  where
  i = (% of users who send invites) × (avg invites per inviting user) × (1 − fraud_rate)
  c = (% of invites delivered & seen) × (invite→signup conversion) × (1 − audience_overlap)
```

- **K > 1 does NOT mean "infinite/exponential growth."** Real loops decay because of:
  - **Cycle time (T):** time from signup → sending invites. Effective growth rate ≈ `K^(t/T)`. A K of 1.2 with a 30-day cycle grows far slower than K=1.2 with a 2-day cycle. **Optimize T as hard as K.**
  - **Invite saturation / audience overlap:** each user's network overlaps with existing users, so realized conversion falls over time. A loop that starts at K=1.1 often settles below 1.
  - **Fraud & incentive abuse:** self-referrals, fake accounts, multi-accounting drain rewards and inflate vanity K.
  - **Channel limits & deliverability:** email invites land in spam; SMS/push hit platform caps and consent rules.
  - **Retention dependency:** churned users stop inviting. Sustainable virality needs the *retained* cohort to keep looping.
- **Amplification (the right intuition):** instead of "K>1 = exponential," use total invited users from one cohort ≈ `signups × K/(1−K)` for K<1. Example: K=0.5 means each cohort eventually drives ~1× extra users (a 2× total multiplier) — hugely valuable and far more attainable than K>1. Treat sustained K in the **0.3–0.7** band as the realistic, high-value target; K>1 is rare and usually temporary.

### 2.3 Viral-loop design worksheet (fill this in before building)

```
LOOP NAME: ____________________________
1. Trigger        — what moment prompts sharing? (aha event / success / friction-of-collaboration)
2. Inviter action — exactly what does the user do? (1-click invite, share link, public artifact)
3. Channel        — how is it transmitted? (in-product, email, SMS, social, embed) + consent path
4. Incentive      — single- or double-sided? reward type/amount? abuse ceiling?
5. Recipient view — what does the invitee see? value prop in <5s? friction to convert?
6. Aha for invitee— how fast can THEY reach value? (short = high c)
7. Attribution    — how is the referral tracked end-to-end? (ref code, deferred deep link, cookie + server)
8. Cycle time T   — target days from signup → first invite sent
9. Guardrails     — fraud checks, reward cap, eligibility, unsubscribe/opt-out (see §5)

INSTRUMENT THESE EVENTS:
invite_surface_shown → invite_sent → invite_delivered → invite_opened
→ invitee_signup → invitee_activated → reward_granted
COMPUTE: i, c, K, cycle time T, fraud rate, reward cost / referred LTV
```

### 2.4 Referral-program economics

A referral program is only healthy when **reward cost stays well below referred-user LTV** and fraud is contained. Quick model:

```
Per-referral cost     = inviter_reward + invitee_reward + platform/processing
Contribution margin   = referred_LTV × gross_margin% − per_referral_cost
Program is viable when: contribution_margin > 0  AND  referred users retain ≥ organic users
Rule of thumb:          total reward ≤ ~15–25% of expected referred gross profit
```

- **Double-sided** rewards (both inviter and invitee get value) almost always beat single-sided — they reduce the invitee's friction and the inviter's "feels spammy" hesitation.
- **Match the reward to product value**, not cash, when possible (storage, credits, premium days). It costs less, attracts better-fit users, and deepens activation.
- **Trigger the ask at the peak**, not at signup: after a win/aha, or when collaboration is natural. Asking a cold new user to refer converts terribly.
- **Gate rewards on a real milestone** (invitee activates or pays), not on signup, to kill fraud and mercenary signups.
- **Watch cohort quality:** referred users who churn faster than organic = the program is buying the wrong people; tighten eligibility or change the incentive.

> For the operational side — commission tiers, payout schedules, partner/affiliate tracking pixels, and tax/1099 handling — use **`affiliate-marketing`**. This skill covers the *growth math and loop design*; that one covers running the program.

---

## 3. Product-Led Growth (PLG)

PLG = the product is the primary acquisition, activation, and expansion engine; sales (if any) assists rather than gates. Core principles:

- **Free tier or trial with *real* value** — solve one job completely for free. A crippled free tier kills the loop; the goal is to create a "can't go back" dependency, then charge for scale/teams/advanced jobs.
- **Self-serve onboarding** — a motivated user reaches value with zero human contact. Every required sales call is a leak.
- **Time-to-aha in the first session** — the single biggest PLG lever. Cut every step between signup and the aha action.
- **Usage-based expansion** — natural path from individual → team → org; pricing follows the value metric (seats, usage, workspaces).
- **In-product virality** — sharing/collaboration is baked into the core workflow (ties back to §2 inherent loops).

### 3.1 PLG onboarding checklist (activation engineering)

```
PRE-VALUE (remove every avoidable step)
[ ] Signup asks only what's needed to deliver value (defer profile/billing)
[ ] No mandatory sales call / "request a demo" wall for self-serve tier
[ ] SSO/social login + email magic-link to cut password friction
[ ] First-run state is NOT empty — seed a template, sample data, or demo workspace
[ ] One clear primary CTA per screen; no decision paralysis

TIME-TO-VALUE
[ ] Define ONE aha action (the event most correlated with retention — see §3.2)
[ ] Onboarding is a checklist/progress UI toward that action, skippable, resumable
[ ] Contextual empty states teach the next step where the user already is
[ ] Celebrate the aha (success state) — and place the invite/upgrade surface there
[ ] Measure median time-to-aha and % reaching aha in session 1 / week 1

POST-VALUE (habit + expansion)
[ ] Day-2 / week-1 lifecycle nudge to the *next* high-value action (not generic "come back")
[ ] Natural collaboration/share prompt at a relevant moment
[ ] Usage signals surfaced (you used X, your team did Y) to build investment
[ ] In-product upgrade prompts tied to hitting a value/limit, not arbitrary nags
```

### 3.2 Activation-event mapping (how to find your aha)

1. Pull a cohort with enough history (e.g., users who signed up 60–90 days ago).
2. Split into **retained** vs **churned** at your natural cadence.
3. For each candidate early action (created project, invited teammate, connected integration, sent N messages), compute the **correlation with retention** *and* the % of users who did it.
4. The aha action is the one with **high correlation AND material reach**, ideally completable in session 1 (classic patterns: Facebook "7 friends in 10 days," Slack "2,000 messages sent," Dropbox "1 file in 1 folder on 1 device").
5. **Validate causally** — correlation ≠ cause. Run an experiment that *increases* the action for a test group and check whether retention actually moves (otherwise you may be optimizing a proxy).

> Deeper PLG (freemium tier construction, reverse-trial vs free-trial vs freemium decision, pricing-as-a-loop, self-serve revenue expansion) lives in **`product-led-growth`**. Churn/cohort/health-score mechanics live in **`retention-analytics`**.

---

## 4. Experimentation

Growth is a search problem: you cannot reason your way to the winning tactic, you have to test cheaply and fast. Maintain a **backlog → prioritize → brief → ship → analyze → document** loop.

### 4.1 Prioritization — ICE, RICE, PXL

**ICE** (fast, subjective triage; good for a first pass):
Score Impact, Confidence, Ease each 1–10. `ICE = (I + C + E)/3`. Cheap but noisy — confidence is easily gamed. Use for quick sorting, not final calls.

**RICE** (better when reach/effort vary a lot):
- **Reach** — users affected per time period (real number)
- **Impact** — Massive 3 / High 2 / Medium 1 / Low 0.5 / Minimal 0.25
- **Confidence** — High 100% / Medium 80% / Low 50% (discount for weak evidence)
- **Effort** — person-weeks

`RICE = (Reach × Impact × Confidence) / Effort`

**PXL** (Conversion-team variant; reduces guesswork by forcing evidence): score binary/weighted questions — "above the fold?", "addresses a noticed problem?", "based on user research/analytics?", "easy to build?". Higher evidence → higher score. Useful when teams over-rate hunches.

> **Don't over-trust any score.** Prioritization frameworks rank a backlog; they do not predict outcomes. Re-score with results, and keep a documented hypothesis for every test (below) so confidence is grounded in evidence, not vibes.

### 4.2 Experiment brief template (use for every test)

```
EXPERIMENT: <short name>                          OWNER: ____   DATE: ____
HYPOTHESIS:  Because <evidence/observation>,
             we believe that <change>
             for <segment/audience>
             will cause <metric> to <move by ~X%>.
             We'll know we're right when <primary metric> hits <threshold>.

PRIMARY METRIC:   <one number this test moves>           (decision metric)
SECONDARY:        <supporting metrics>
GUARDRAIL METRICS: <metrics that must NOT regress — churn, refunds, latency,
                    unsubscribe rate, support tickets, NPS>   (see §6)

DESIGN:           A/B | A/B/n | holdout | switchback   (stats → `ab-testing`)
UNIT / SPLIT:     user | account | session  (pick the unit that avoids cross-contamination)
SAMPLE SIZE / MDE: computed before launch — see `ab-testing`
DURATION:         ≥ 1–2 full business cycles AND until sample size met (avoid weekday bias)
QUALITATIVE:      what we'll watch beyond the number (session replays, tickets, replies)

DECISION RULE (pre-registered):
  SHIP if primary +X% at p<0.05 (or chosen method) AND no guardrail regression
  KILL if no lift or any guardrail breach
  ITERATE if directional but inconclusive — note next variant
RESULT:           ___ lift ___ p/CI ___ decision ___ learning to log
```

### 4.3 Experiment hygiene (the failure modes that fake wins)

- **Peeking / early stopping** inflates false positives. Either fix the sample size up front, or use a sequential/Bayesian method explicitly designed for monitoring (see `ab-testing`). Never stop the moment it's "significant."
- **Too-small samples** → you "win" on noise. Compute MDE and required n *before* launch.
- **Wrong randomization unit** → if users collaborate or share devices, randomize at account/cluster level to avoid leakage between variants.
- **Multiple comparisons** → testing many variants/metrics inflates false discovery; correct for it or pre-declare one primary metric.
- **Novelty & primacy effects** → existing users react to *any* change; segment new vs returning and let it settle.
- **Local maxima** → ICE/RICE biases toward small, safe, easy tests. Deliberately reserve budget for a few bold, high-variance bets.
- **Survivorship/selection bias** → don't analyze only the users who completed the funnel; include the ones who dropped.
- **Always log the learning, even on losses.** A documented "this didn't move the needle, here's why" is the compounding asset; a folder of unrecorded tests is waste.

> For sample-size math, statistical power, sequential testing, Bayesian vs frequentist choice, and significance interpretation, defer to **`ab-testing`**.

---

## 5. Responsible Growth (read before shipping anything)

Growth tactics touch consent, money, notifications, and psychology. The fastest way to destroy a brand — and now to get fined — is a manipulative or non-compliant tactic. **This section is mandatory, not optional.** When a tactic involves legal, tax, or jurisdiction-specific rules, verify with a qualified professional and the current text of the relevant law; the notes below are practitioner guidance, not legal advice.

### 5.1 No dark patterns

Design for the user's genuine interest, not against it. **Banned in this skill:**

- **Fake urgency/scarcity** ("only 2 left!" when untrue, fake countdowns that reset).
- **Confirmshaming** ("No thanks, I hate saving money").
- **Manipulative loss framing** — e.g., scary "your data will be DELETED" or "you'll lose your streak" copy designed to coerce. *Truthful, neutral retention reminders are fine* ("Your free export expires Friday — here's how to keep it"); fear-based or false ones are not.
- **Roach motel** — easy to subscribe, near-impossible to cancel. Cancellation must be as easy as signup.
- **Hidden costs, pre-ticked consent boxes, forced continuity, disguised ads, nagging that can't be dismissed.**

These aren't just unethical — they're regulated. **The EU Digital Services Act prohibits dark patterns on online platforms;** the **FTC** in the US enforces against deceptive design and (under the Click-to-Cancel direction) requires cancellation to be as simple as enrollment; **GDPR/ePrivacy** make pre-ticked or coerced consent invalid. Treat "would I be embarrassed if this tactic were on the front page?" as the bar. *(Regulatory specifics evolve — as of Jun 2026 confirm current obligations for your jurisdictions; for EU specifics see `eu-legal-compliance`.)*

### 5.2 Consent, anti-spam & messaging compliance

Any referral, email, push, SMS, or in-app messaging tactic must satisfy:

| Channel | Non-negotiables (as of Jun 2026 — verify current rules per jurisdiction) |
|---------|---------------------------------------------------------------------------|
| **Email** | Lawful basis/consent (GDPR/ePrivacy in EU; CAN-SPAM in US), one-click unsubscribe, honor opt-outs fast, valid physical address, no misleading subjects. Bulk senders must meet **Google/Yahoo bulk-sender requirements** (SPF, DKIM, DMARC, low spam-complaint rate, easy unsubscribe). |
| **Push** | OS-level permission; don't dark-pattern the permission prompt; respect quiet hours; provide granular opt-outs. |
| **SMS** | Prior express consent, identify sender, opt-out keyword (STOP), follow **TCPA** (US) and carrier rules; high penalties for violations. |
| **In-app** | Frequency-cap; dismissible; never block core functionality; don't disguise as system messages. |
| **Referral invites** | The *inviter* must consent to share contacts; you must have a lawful basis to message the *invitee*; never silently scrape/import address books; give recipients an opt-out. |

> For lifecycle email design + the full Google/Yahoo bulk-sender + deliverability checklist, use **`email-sequence`**. For EU GDPR/ePrivacy/consent-banner specifics, use **`eu-legal-compliance`**.

### 5.3 Referral terms & fraud/abuse controls

- **Publish clear program terms:** eligibility, reward, payout timing, caps, and an anti-abuse clause reserving the right to claw back fraudulent rewards.
- **Fraud controls:** gate rewards on a verified milestone (activation/payment), dedupe by device/payment fingerprint, rate-limit invites, block self-referral (same email domain/payment/IP heuristics), and review outliers manually.
- **Money/tax:** cash or cash-equivalent rewards can create **tax-reporting obligations** (e.g., US 1099 thresholds) and must respect promotion/sweepstakes and consumer-protection law in each market. **Verify with finance/legal counsel before launching cash incentives** — see `eu-tax-accounting` for EU and consult a professional for US.

### 5.4 Privacy & analytics governance

- **Data minimization & purpose limitation** — collect only events you'll act on; document why.
- **Consent-gated tracking** — non-essential analytics/marketing cookies and identifiers require consent in the EU/UK (ePrivacy). Server-side and first-party setups still require a lawful basis.
- **PII hygiene** — never log raw PII (emails, names, tokens) in event payloads; use stable hashed/opaque user IDs. Honor deletion/DSAR requests across your analytics stack.
- **Document a governance policy** — who can create events, naming conventions, retention windows, and a way to deprecate stale events.

---

## 6. Analytics & Instrumentation

You cannot grow what you can't measure correctly — and most growth "wins" evaporate under honest measurement.

### 6.1 Event taxonomy (define before you instrument)

- **Object → action naming** convention, consistently `snake_case` past tense: `project_created`, `invite_sent`, `subscription_upgraded`. Pick one convention and enforce it.
- **Properties on every event:** `user_id` (stable, opaque), `timestamp`, plan/tier, source/channel, plus event-specific props. Keep a single source of truth (a tracking plan / schema) and version it.
- **Track the funnel, not just pages:** signup → activation (aha) → key actions → upgrade → referral. Page views alone don't tell you why people leak.
- **Identity:** stitch anonymous → identified on signup so you don't lose pre-signup touchpoints; reconcile cross-device where consented.

### 6.2 Funnels & cohort retention

- **Funnel instrumentation:** measure conversion *and* time between each step; segment by channel and persona (an aggregate funnel hides where the leak actually is).
- **Cohort retention by sign-up week/month:** read the **shape** of the curve. A curve that *flattens* (stabilizes at some %) = product-market fit and a real retained base; a curve that decays to ~0 = no PMF, and viral/paid spend will leak out.
- **N-day vs unbounded vs rolling retention:** choose the definition that matches your natural usage cadence (daily app vs monthly tool) — the wrong window makes a healthy product look dead or vice-versa.

### 6.3 Attribution — and its limits (2026 reality)

- **Attribution is directional, not truth.** Last-touch over-credits bottom-funnel; first-touch over-credits discovery; multi-touch models are assumptions, not measurement.
- **Modern constraints (plan around them):** third-party cookies are largely gone/restricted, mobile signal is limited (Apple ATT/SKAN-style aggregation, Android Privacy Sandbox), and walled gardens report self-attributed conversions. **Lean on first-party data, server-side event collection (with consent), and modeled/aggregated reporting** rather than precise per-user cross-site tracking.
- **AI search / answer-engine distribution is now a real channel.** A growing share of discovery happens inside AI assistants and answer engines that summarize without a click, so traditional last-click attribution undercounts it. Track branded/direct/organic lift and assisted conversions, not just clickable referrals. (For making content surface in those engines, see `seo-geo`.)
- **Channel saturation:** paid channels saturate and CAC rises as you scale spend; the marginal user costs more than the average. Watch *marginal* CAC and diversify into owned/community/creator channels.

### 6.4 Incrementality > correlation

- **The question that matters: would this user have converted anyway?** Attribution can't answer that; **incrementality testing** can.
- **Holdout groups:** withhold a tactic (an email, a retargeting audience, a referral nudge) from a randomized control and measure the *difference*. The lift over the holdout is the true incremental impact — often dramatically smaller than attributed numbers, especially for retargeting and bottom-funnel.
- **Geo / time-based tests** for channels you can't split by user (e.g., out-of-home, broad paid social): turn spend up/down by region or period and measure lift.
- **Guardrail metrics on every growth change:** never optimize one metric blindly. Pair each test's primary metric with guardrails (churn, refund rate, unsubscribe/spam-complaint rate, latency, support load, NPS). A "win" that spikes a guardrail is a loss.

> For GA4 setup, channel/attribution configuration, and dashboard building, use **`marketing-analytics`**. For statistical design of holdouts and tests, use **`ab-testing`**.

---

## 7. Retention Hooks (truthful by construction)

Retention is the engine of compounding growth (and the input to virality and LTV). Build *genuine* habit, never coercion.

- **Habit loop (Hooked model):** Trigger → Action → Variable Reward → Investment. The "investment" (data, content, connections the user adds) is what makes the product stickier over time and seeds the next trigger.
- **Progress mechanics:** streaks, levels, completion %, milestones — motivating *as long as they reflect real progress and value*. Don't fabricate stakes.
- **Truthful reminders, not fear:** ✅ "Your trial ends Friday — export your data in one click" / "You have 3 unread messages." ❌ manipulative "your data will be DELETED!" or guilt-tripping streak-loss copy designed to scare. (See §5.1 — fear-based/false framing is a banned dark pattern.)
- **Social proof — only when real:** "Your teammate Alex joined" / "3 colleagues are active" are powerful *when true*. Never invent activity or fake counts.
- **Notification strategy:** right channel + right moment + frequency cap + easy opt-out (per §5.2). The goal is a notification the user is *glad* to receive; if you'd be annoyed by it, don't send it. Earn the next open.

> For churn prediction, cohort health scoring, engagement scoring, and structured win-back programs, use **`retention-analytics`**; for the lifecycle email flows themselves, use **`email-sequence`**.

---

## 8. A 90-Day Growth Operating Cadence

1. **Instrument first** (§6): tracking plan, funnel events, cohort retention, guardrail metrics. Without this, every later step is guesswork.
2. **Find the bottleneck** (§1): biggest absolute drop-off upstream of revenue; size it in users × LTV.
3. **Generate & prioritize** (§4): fill the backlog, score with RICE/PXL, write a brief with a pre-registered decision rule for the top bets.
4. **Run weekly experiments** against that bottleneck; respect hygiene (§4.3) and guardrails; defer stats to `ab-testing`.
5. **Compound:** ship winners, kill losers, **log every learning**, and re-evaluate the bottleneck — it moves as you fix things.
6. **Layer loops** (§2–3): once a stage is healthy, build the viral/referral/PLG loop that makes that stage self-reinforcing.
7. **Stay clean** (§5): every tactic truthful, consented, compliant, and reversible.

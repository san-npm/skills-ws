---
name: community-building
description: "Playbook to build, grow, moderate, and measure online communities (Discord, Slack, Circle, Reddit, GitHub Discussions) from zero to 10,000+ members: onboarding, engagement rituals, trust & safety SOPs, metrics, and a 30/90-day launch plan. Use when launching/scaling a community, fixing low engagement/retention, or writing moderation rules."
---

# Community Building

## Platform Comparison

| Platform | Best For | Pros | Cons (2026 reality) |
|----------|----------|------|------|
| Discord | Dev/gaming/crypto/creator communities | Free, real-time, rich (Onboarding, AutoMod, Forum/Media channels, threads, audio Stages) | Noisy, weak native search, public-by-default unless you gate; mod tooling needs setup |
| Slack | B2B, professional/internal communities | Familiar, threaded, deep integrations, Canvases & Lists | **Free plan limits you to recent message history & file access (~90 days), not the old "10,000-message" cap** (as of Jun 2026; verify at slack.com/pricing); paid scales costly per active member |
| Circle | Course/membership/paid communities | Clean UX, Spaces, native events, courses, paywall, mobile app | Paid SaaS, less real-time than Discord, you don't own the data layer |
| GitHub Discussions | OSS projects | Free, lives next to the code, async, Q&A "answered" marking, categories | Dev-only audience; no real-time, no DMs, limited moderation/analytics |
| Reddit (subreddit) | Public discovery & SEO | Indexed in Google + cited by LLMs, massive reach, anonymous low-friction posting | You don't own the audience or DMs; heavy mod load (spam/ban-evasion/brigading); API access is now rate-limited/paid for 3rd-party tools; Reddit's content policy + admin actions override your rules. See the `reddit-community-engagement` sibling skill for subreddit-specific playbooks. |

**Other 2026 options:** Skool and Mighty Networks (creator/cohort communities, built-in payments + gamification); Discourse (self-hostable forum, best long-tail SEO + LLM citation); Telegram/WhatsApp (huge in crypto/emerging markets, but near-zero structure, moderation, or analytics — treat as a broadcast/chat layer, not a home base). **Pick ONE home base; don't run parallel communities you can't staff.** Match the platform to where members already are and to your moderation capacity, not to feature lists.

## Discord/Slack Channel Structure

```
📢 announcements        (read-only, major updates)
👋 introductions         (new members post here first)
💬 general               (main discussion)
❓ help / support        (Q&A, encourage helping each other)
💡 ideas / feedback      (product input, feature requests)
🎯 show-and-tell         (members share what they built)
🔧 off-topic             (human connection, non-work chat)
── Staff/Mod channels (private) ──
🛡️ mod-log               (actions taken)
📊 team-internal          (strategy, planning)
```

Start with fewer channels (5-6 max at launch). Empty channels signal a dead community — add only when an existing channel's conversation visibly splits into a recurring sub-topic, then create the channel and pin a seed post.

**Adapt the structure to the platform — don't force the Discord layout everywhere:**

- **Discord Forum/Media channels** for `help`, `show-and-tell`, `ideas`: each question/post becomes its own searchable thread with tags. Far better than a flat text channel for Q&A and showcases — threads don't get buried and can be marked solved. Use a Media channel for screenshot/build galleries.
- **Discord Onboarding** (Server Settings → Onboarding): set the server to Community, require members to pick interests/roles at join, and surface 3-5 "default channels" so newcomers land somewhere useful. Pair with **Verification Level: Medium/High** and **rules screening** to cut spam-bot raids.
- **Slack**: there are no read-only channels natively, so use a `#announcements` channel with posting restricted to admins, a pinned **Canvas** as the persistent "start here / rules" doc, and a **List** for tracking events or member projects. Threads are the unit of conversation — train members to reply in-thread, not in-channel.
- **GitHub Discussions**: model channels as **Categories** (Announcements [announcement format], Q&A [enables answer marking], Ideas [poll/upvote], Show and tell, General). There is no real-time chat or DM — set async expectations.
- **Circle/Skool**: model channels as **Spaces**; gate paid spaces behind the membership and keep one free public space for discovery.

## Onboarding Flow

1. **Welcome message** → prefer an in-server onboarding post/ephemeral system message over a cold DM. Link to the intro channel + ONE quick action.
2. **Intro prompt**: Template in #introductions (below) — keep it to 3 short fields so it's frictionless.
3. **Role assignment**: React-roles or native Onboarding to self-select interests (drives relevant channel routing).
4. **First value moment**: Within 24 hours — answer their question, react to/welcome their intro, or invite to the next event. This single moment is the strongest retention lever you have.
5. **Day 3 nudge**: A public @mention in a relevant channel or a *single* opt-in check-in — not a recurring DM sequence.

**Goal**: New member → first meaningful interaction in <24 hours.

### DM / proactive-messaging guardrails (read before automating anything)

Unsolicited DMs are the fastest way to get your bot banned and your community reported. Rules:

- **Consent first.** Only DM members who opted in (joined via your invite *and* didn't disable server DMs, or explicitly asked for updates). Never scrape members and cold-DM them — on Discord this triggers anti-spam flags and account bans; on Slack/Reddit it violates platform policy.
- **One welcome DM, then stop.** A single bot welcome DM is acceptable; a drip of unsolicited DMs is spam. If they don't reply, do not follow up by DM — re-engage publicly instead.
- **Honor platform rate limits.** Discord bots are rate-limited (HTTP 429 with `retry-after`; mass-DM patterns get flagged regardless of the per-route limit). Send welcomes on the `guildMemberAdd` event one-by-one with backoff; never blast all members. Slack/Reddit have their own message rate limits — respect `Retry-After`.
- **Always offer an opt-out.** Every automated DM ends with "Reply STOP / leave the server to stop these." Maintain a suppression list and honor it.
- **Privacy.** Don't store DM contents beyond what you need; don't expose member IDs/emails; disclose any logging. See the Trust & Safety section for data-handling rules.

### Inlined onboarding templates

**Welcome DM (bot, single send):**
```
👋 Welcome to {Community}, {name}!

The fastest way to get value here:
1. Say hi in #introductions (template's pinned there)
2. {ONE high-value action — e.g. "Drop your current project in #show-and-tell"}

Our next live event is {event + date}. Hope to see you there!
(Reply STOP or leave the server anytime to stop these messages.)
```

**#introductions pinned prompt:**
```
New here? Copy this and fill it in 👇
• **Who you are:** (name / what you do)
• **What you're working on:** (one line)
• **What you want from this community:** (one thing)

React with 👋 to anyone whose intro resonates.
```

**Re-engagement (public, for a member who joined but never posted — NOT a DM):**
```
@{name} welcome aboard! What are you building right now? 
Even a one-liner in #introductions helps us point you to the right people.
```

## Community Health Metrics

| Metric | How to Measure | Healthy Benchmark |
|--------|---------------|-------------------|
| DAU/MAU ratio | Active users daily vs monthly | >20% for engaged community |
| Messages per active user | Total messages / active users | 3-10/week |
| Response time | Time to first reply on questions | <4 hours |
| Retention (30-day) | Members active after 30 days | >40% |
| New member activation | % of joiners who post within 7 days | >30% |
| Lurker ratio | Read-only members / total | <80% (some lurking is fine) |

Track weekly. Tooling: Discord's built-in Server Insights (needs Community enabled, ~500+ members for full data), **Common Room** (note: the original Orbit was acquired by Postman in April 2024 and the standalone product was sunset shortly after; "Orbit" today refers to unrelated products, so default to Common Room), or a DIY pipeline (below). For <500 members, weekly manual sampling beats any dashboard.

### Instrumentation plan (DIY)

You can't improve what you don't log. Capture every relevant interaction as a typed event into your warehouse (Postgres/BigQuery) or a product-analytics tool (PostHog, Mixpanel).

**Event taxonomy** (verb-noun, snake_case, one row per occurrence):

| Event | Key properties | Fires when |
|-------|---------------|-----------|
| `member_joined` | member_id, source (invite_code/link), ts | Join |
| `member_left` | member_id, tenure_days, ts | Leave/ban |
| `message_sent` | member_id, channel_id, is_reply, has_attachment, thread_id, ts | Any message |
| `intro_posted` | member_id, ts | First post in #introductions |
| `question_asked` | member_id, channel_id, message_id, ts | Post in help channel |
| `question_answered` | answerer_id, asker_id, latency_sec, ts | First reply to a question |
| `reaction_added` | member_id, target_member_id, emoji, ts | Reaction |
| `event_rsvp` / `event_attended` | member_id, event_id, ts | Event signup / join |
| `role_earned` | member_id, role, ts | Champion/contributor role granted |

Pull these from the **Discord Gateway** (`messageCreate`, `guildMemberAdd`, `guildMemberRemove`, `messageReactionAdd`) via a bot, the **Slack Events API**, or platform exports. Hash/pseudonymize `member_id` if storing long-term, and document retention (see Trust & Safety / privacy).

**Weekly health dashboard — define each metric as one query.** Example schema + SQL on a `events` table `(event, member_id, ts, props jsonb)`:

```sql
-- DAU/MAU stickiness (run for the reporting day)
WITH dau AS (
  SELECT COUNT(DISTINCT member_id) d
  FROM events WHERE ts::date = CURRENT_DATE - 1
    AND event IN ('message_sent','reaction_added','event_attended')
), mau AS (
  SELECT COUNT(DISTINCT member_id) m
  FROM events WHERE ts >= CURRENT_DATE - INTERVAL '30 days'
    AND event IN ('message_sent','reaction_added','event_attended')
)
SELECT d, m, ROUND(100.0*d/NULLIF(m,0),1) AS stickiness_pct FROM dau, mau;

-- 7-day activation funnel for last week's joiners
WITH joiners AS (
  SELECT member_id, MIN(ts) AS joined_at
  FROM events WHERE event='member_joined'
    AND ts >= CURRENT_DATE - INTERVAL '14 days'
    AND ts <  CURRENT_DATE - INTERVAL '7 days'   -- give each a full 7-day window
  GROUP BY 1
)
SELECT
  COUNT(*) AS joined,
  COUNT(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM events e WHERE e.member_id=j.member_id
      AND e.event='message_sent' AND e.ts BETWEEN j.joined_at AND j.joined_at + INTERVAL '7 days'
  )) AS activated,
  ROUND(100.0 * COUNT(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM events e WHERE e.member_id=j.member_id
      AND e.event='message_sent' AND e.ts BETWEEN j.joined_at AND j.joined_at + INTERVAL '7 days'
  )) / NULLIF(COUNT(*),0),1) AS activation_pct
FROM joiners j;

-- Question answer-rate & median first-response latency (last 7d)
SELECT
  COUNT(*) FILTER (WHERE event='question_asked') AS asked,
  COUNT(*) FILTER (WHERE event='question_answered') AS answered,
  ROUND(100.0*COUNT(*) FILTER (WHERE event='question_answered')
        /NULLIF(COUNT(*) FILTER (WHERE event='question_asked'),0),1) AS answer_rate_pct,
  PERCENTILE_CONT(0.5) WITHIN GROUP (
    ORDER BY (props->>'latency_sec')::numeric) FILTER (WHERE event='question_answered')
    AS median_latency_sec
FROM events WHERE ts >= CURRENT_DATE - INTERVAL '7 days';
```

**Cohort retention** (group joiners by ISO join-week, measure % active N weeks later):

```sql
WITH cohort AS (
  SELECT member_id, DATE_TRUNC('week', MIN(ts)) AS cohort_week
  FROM events WHERE event='member_joined' GROUP BY 1
),
activity AS (
  SELECT DISTINCT member_id, DATE_TRUNC('week', ts) AS active_week
  FROM events WHERE event IN ('message_sent','reaction_added')
)
SELECT c.cohort_week,
       FLOOR(EXTRACT(EPOCH FROM a.active_week - c.cohort_week)/604800)::int AS week_n,
       COUNT(DISTINCT a.member_id) AS active_members
FROM cohort c JOIN activity a USING (member_id)
GROUP BY 1,2 ORDER BY 1,2;
```

Read this as a triangle: each row is a cohort, each column is weeks-since-join, the cell is retained members. **W4 retention is the number to obsess over** — if W4 is below ~40% your activation/onboarding is leaking faster than you can fill it, and growth spend is wasted.

**Alert thresholds** (page yourself / mod team when a weekly metric crosses these):

| Signal | Warn | Critical |
|--------|------|----------|
| DAU/MAU stickiness | <20% | <12% |
| New-member 7-day activation | <30% | <20% |
| Question answer-rate | <70% | <50% |
| Median first-response latency | >4h | >24h |
| Weekly net member growth | flat | negative 2 wks running |
| % messages from top 1% of members | >50% (over-reliant) | >70% (community = 1 person) |

## Engagement Tactics

### Events
- **Weekly office hours / AMA**: Founder or expert answers questions live
- **Monthly showcase**: Members demo projects (builds connection + UGC)
- **Challenges**: 7-day or 30-day challenges with public accountability

### Async Engagement
- **Question of the week**: Pinned prompt to spark discussion
- **Wins thread**: Weekly "share your win" — normalizes participation
- **Polls**: Quick opinion polls on relevant topics (low-effort engagement)

### Recognition
- Shout out helpful members in announcements
- Leaderboard or point system (careful — can feel gamified/hollow)
- Exclusive roles for active contributors

## Ambassador / Champion Program

```
Criteria to join:
- Active for 60+ days
- Consistently helpful (answers questions, welcomes newbies)
- Aligned with community values

Benefits:
- Private channel with team access
- Early access to features/roadmap
- Swag, event invites, reference/resume credit
- Direct influence on product direction

Responsibilities:
- Welcome 3+ new members/week
- Answer questions in support channels
- Flag issues/toxicity to mod team
- Attend monthly ambassador sync
```

Start with 3-5 champions. Scale to ~1 per 200 members.

## Moderation & Trust-and-Safety

Moderation is a safety function, not just tidiness. A commercial community needs a written policy, an audit trail, an appeals path, and a severe-incident escalation plan **before** the first incident.

### Rules / Code of Conduct (inlined template — post in #rules + pin)

```
{Community} Code of Conduct

You agree to:
1. Be respectful. No harassment, hate speech, slurs, threats, doxxing, or
   personal attacks. This applies to DMs initiated via this community too.
2. Keep it safe & legal. No sexual content, no content involving minors,
   no illegal goods/services, no malware, no sharing others' private info.
3. No spam / undisclosed promotion. Self-promo only in #show-and-tell or with
   mod permission. No unsolicited DMs to members. No referral/affiliate spam.
4. Stay on topic; use the right channel. Search before asking.
5. One account per person. No ban evasion via alts.

Enforcement: mods may remove content and warn, mute, or ban at their discretion.
Decisions can be appealed (see below). By participating you consent to mods
retaining records of enforcement actions for safety and appeals.

Report problems: @mention @mods or use {report channel / form / DM a named mod}.
```

Tailor #1-#5 to your audience, but keep illegal-content, minor-safety, and anti-doxxing clauses verbatim — they are non-negotiable.

### Tiered enforcement (severity-based, not one-size-fits-all)

| Tier | Examples | Action |
|------|----------|--------|
| **Minor** | Off-topic, mild rule-bend, first-time low-effort spam | Friendly public nudge or quiet message; no formal record needed |
| **Standard** | Repeated spam, incivility, ignoring mod guidance | Formal **warning** (logged) → **timeout/mute 24h** → **7-day ban** → **permanent ban** |
| **Serious** | Targeted harassment, hate speech, doxxing, scams, ban evasion | **Immediate timeout + content removal**, log evidence, then permanent ban after mod review (skip the warning ladder) |
| **Severe / emergency** | Credible threats of violence, sexual content involving minors (CSAM), self-harm/suicide intent | See "Severe-incident escalation" — do NOT handle as routine moderation |

The Warning → mute → ban ladder applies to the **Standard** tier only. Serious abuse skips straight to removal; severe incidents leave the moderation track entirely.

### Evidence capture & incident log

Before you delete anything, preserve it — deleted messages can't be un-deleted, and you'll need them for appeals or law-enforcement requests. Screenshot or export the message(s) **with timestamp, user ID, and channel**, then act. Log every Standard+ action in a private #mod-log (or a sheet) with this format:

```
[2026-06-07 14:32 UTC] action=warn  target_id=123…  mod=@alice
  rule=#3 spam  evidence=<msg link / screenshot ref>  note="3rd affiliate link today"  appealable=yes
```

Keep logs in a restricted channel, retain only as long as needed for safety/appeals, and don't expose them publicly.

### Appeals

State the path in the CoC: a banned/muted user may appeal once via {a dedicated form, a single email/DM to a named mod, or an appeals server}. A **second mod** (not the one who issued the action) reviews the evidence and decides; record the outcome in the log. Don't argue enforcement in public channels — it invites pile-ons and rules-lawyering.

### Moderator permissions, roles & safety

- **Least privilege.** Junior mods get timeout + message-delete only; ban/kick and role-management stay with senior mods/admins. On Discord, give mods only the specific permissions they need and require **2FA on the server** (Server Settings → Safety Setup → require 2FA for moderation actions). Don't hand out Administrator.
- **No solo moderation of serious cases.** Two-person review for permanent bans and all appeals.
- **Protect your mods.** Mods see the worst content and get targeted. Provide a private mod channel for venting/decisions, rotate coverage to prevent burnout, never publish a mod's real identity, and let mods escalate harassment of themselves to admins. Mods are unpaid volunteers in most communities — set humane expectations and thank them.
- **Conflicts of interest.** A mod should not rule on a thread they're personally arguing in.

### Severe-incident escalation (memorize this)

Some situations are emergencies, not moderation calls:

- **Self-harm / suicide intent:** Respond with care, share region-appropriate crisis resources (e.g. findahelpline.com for international lines; in the US the 988 Suicide & Crisis Lifeline), do **not** publicly broadcast the person's situation, and if there's imminent danger and you have identifying info, contact local emergency services. You are a community manager, not a clinician — connect, don't counsel.
- **Sexual content involving minors (CSAM):** Do **not** download, forward, or "investigate." Remove it, ban the account, **preserve the platform-side evidence (report in-app so the platform retains it)**, and report to the platform and to NCMEC CyberTipline (report.cybertip.org) in the US or your national hotline. This is legally mandatory in most jurisdictions.
- **Credible threats of violence:** Preserve evidence, remove/ban, and report to the platform and to law enforcement if a specific person/place is threatened.
- **Legal / law-enforcement requests & subpoenas:** Don't improvise. Route to your company's legal contact; only produce data in response to a valid legal process, and tell members in your privacy notice what you log and when you'd disclose it.
- **Data / privacy requests (GDPR/CCPA):** If you store member data, honor deletion/export requests within the statutory window and document your retention. Don't dox, and don't publish member PII even in mod discussions.

### Tooling (2026)

- **Discord AutoMod**: built-in keyword/regex filters, the managed *Commonly Flagged Words* and *spam/mention-raid* presets, and **Raid Protection** + join-gate **Verification Levels** and **rules screening**. Configure AutoMod to *alert mods* on borderline terms and *auto-block* slurs/links — start permissive and tune from false positives.
- Set **Server → Safety Setup**, enable **Onboarding** (cuts bot spam), and consider a verification bot for paid/gated communities.
- **Slack**: restrict who can post in announcement channels, use admin content controls, and on Enterprise plans use DLP/eDiscovery; otherwise moderate manually.
- Add an audit-log/mod-log bot so actions are traceable even if a mod goes rogue.
- Closely related: see the `reddit-community-engagement` sibling skill for subreddit AutoModerator configs and brigading defenses.

## Scaling Stages

| Stage | Focus | Key Actions |
|-------|-------|-------------|
| 0→100 | Seed & personal touch | Invite individually, be in every conversation, DM everyone |
| 100→1K | Habits & rituals | Weekly events, onboarding flow, first champions |
| 1K→5K | Systems & delegation | Mod team, ambassador program, documented processes |
| 5K→10K+ | Culture & self-sustaining | Members help members, UGC engine, sub-communities |

**Critical insight**: 0→100 is founder-led. You personally invite, personally welcome, personally engage. There's no shortcut.

## Launch Sequence (first 30 & 90 days)

Don't open the doors to an empty room. Seed it first, then invite in waves.

**Pre-launch (week -1): seed so it's never empty.** Set up the 5-6 channels, AutoMod, Onboarding, rules, and the welcome flow. Hand-invite 10-20 "founding members" (people you know are your ICP), give them a Founding role, and ask them to post intros and a couple of questions/answers *before* anyone else arrives. A new visitor should see live, on-topic conversation in the first 30 seconds.

**Days 1-30 — establish a heartbeat (founder budget: ~1-2 hrs/day):**
- **Daily:** be present. Greet every new join, answer every question within hours, post one prompt/question. Reply to everything — your response rate sets the culture.
- **Pick ONE weekly ritual and never skip it.** Office hours/AMA, a "what are you working on this week?" thread, or a wins thread. Consistency > variety early.
- Sample posts: *"☕ Monday check-in — what's the one thing you're shipping this week? I'll go first: …"* / *"Stuck on anything? Drop it in #help, the fastest way to get unstuck here is to ask."*
- Invite in **small waves** (10-25 at a time), not a press blast — so each cohort gets a personal welcome and the ratio of new-to-existing stays healthy.
- **30-day exit check:** ≥1 recurring ritual with attendance, DAU/MAU climbing, question answer-rate >70%, and 3-5 members who reliably show up unprompted. If not, fix activation before inviting more.

**Days 31-90 — rituals, first delegation, self-sustaining loops (founder budget: tapering to ~30-45 min/day):**
- Add a second cadence: a **monthly showcase/demo** and a 7- or 30-day **challenge** for accountability.
- **Recruit your first 3-5 champions** (criteria below) and hand them welcoming + first-line support. Your job shifts from doing everything to enabling them.
- Stand up the **weekly health dashboard** (above) and review it every Monday; act on whatever alert threshold trips.
- Start the **UGC + feedback loops**: repurpose the best showcase posts, and ship one visible thing the community asked for, then announce it back ("you asked, we built it").
- **90-day exit check:** members answer each other's questions without you, your weekly ritual runs even if you're out a day, W4 cohort retention >40%, and you're no longer the top 1% of message volume by yourself.

## Community-Led Growth

- **Invite program**: Members invite others → recognition or perks (not monetary — attracts wrong people)
- **UGC pipeline**: Member content → amplified on company social/blog (with credit)
- **Feedback loop**: Community ideas → product roadmap → ship → announce back to community
- **Social proof**: "Join 5,000 builders" — community size as marketing asset
- **Integration with product**: Community link in app, "Ask the community" in help docs

## Feedback Loops to Product

1. Designate #ideas channel with structured template: "Problem / Proposed Solution / Who it helps"
2. Product team reviews weekly, reacts with 👀 (seen) → 🗓️ (planned) → ✅ (shipped)
3. Monthly "roadmap update" in community — what shipped from community suggestions
4. Close the loop publicly: "X suggested this, we built it" → reinforces participation

## Content from Community (UGC)

- Showcase threads → repurpose as case studies or blog posts
- Member tutorials → feature on official docs/blog with attribution
- Community quotes → use in marketing (with permission)
- Event recordings → YouTube/podcast content

## Related skills

This skill owns community ops end-to-end (platform, onboarding, engagement, trust & safety, metrics, launch). For adjacent depth, reach for the siblings instead of duplicating here:

- **`customer-feedback`** — turning the #ideas channel and member signals into a structured feedback/insights pipeline (this skill covers the loop mechanics; that skill covers analysis and prioritization).
- **`reddit-community-engagement`** — subreddit-specific moderation (AutoModerator), brigading defense, and Reddit growth.
- **`retention-analytics`** — deeper cohort/churn modeling beyond the community-health queries above.
- **`product-led-growth`** — wiring the community into in-product growth and activation loops.
- **`webinar-events`** — running the live events (AMAs, office hours, showcases) referenced in the engagement and launch sections.


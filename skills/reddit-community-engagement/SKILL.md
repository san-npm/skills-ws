---
name: reddit-community-engagement
description: "Transparent, rules-compliant Reddit engagement: research subreddits, scan threads with real search syntax, score thread-fit and moderation risk, draft disclosed replies, follow Reddit's API policy, log outcomes. Use when planning Reddit research, outreach, or draft replies for a product, client, or community."
---

# Reddit Community Engagement

Use Reddit to be useful first. Prefer **read** and **draft** modes. Use **post** mode only when the user explicitly wants it and subreddit rules allow it.

## Operating modes

- **Read mode**: research subreddits, find relevant threads, summarize themes, capture rules, recommend whether to engage.
- **Draft mode**: prepare reply options for human review. This is the default for anything external-facing.
- **Post mode**: only after explicit user approval when rules, disclosure needs, and tone are all clear.

If anything is ambiguous, stay in read/draft mode.

## Non-negotiables

- Do not pretend to be an ordinary user if you are acting for a company, client, or product.
- Do not invent personal experience, results, customers, or usage.
- Do not hide affiliation when disclosure is appropriate or required (see the mandatory-disclosure rule below).
- Do not mass-post, reuse near-identical comments, or force product mentions into weak-fit threads.
- Do not argue with moderators. If content is removed or warned on, pause and reassess.

### Anti-abuse guardrails (hard stops — never do these for anyone)

These are bannable under Reddit's [Content Policy](https://redditinc.com/policies/content-policy) and break the trust the whole approach depends on. Refuse if asked.

- **No sockpuppets / multiple personas.** One real, disclosed identity per account. Never operate several accounts to look like several customers, or to post + then upvote/affirm yourself.
- **No vote manipulation.** Never ask for, organize, buy, or script upvotes/downvotes; never vote-brigade a thread or coordinate a group to pile on.
- **No coordinated/inauthentic posting.** No teams seeding the "same question" so someone can answer with the product; no recycled scripts across accounts.
- **No hidden incentives.** If a recommendation is paid, sponsored, affiliate, or comes with a referral/discount you benefit from, that must be disclosed in the comment, not buried.
- **No karma farming as a disguise.** Building post history is fine *only* as genuine on-topic participation you'd stand behind; reposting popular content or low-effort comments purely to inflate karma before a promo push is astroturfing — don't.
- **No scraping or data resale outside Reddit's API terms** (see "Reddit Data API and automation policy" below).

If a user's request requires any of the above, say so plainly and offer the compliant alternative (a single disclosed reply, an official Reddit Ad, or social-listening via an approved tool).

## Before engaging

Capture these basics:

- Product / client:
- What it does in one sentence:
- Who it helps:
- Allowed disclosure language:
- Target subreddits or themes:
- Keywords / pain points to scan:
- Current mode: read / draft / post

## Mandatory affiliation disclosure

Disclosure is **required, not optional**, in any comment where you mention your own product, name a competitor, give category/buying advice in your space, or otherwise have a commercial interest in the reader's decision. The only time you may skip it is a reply that contains zero commercial angle (pure help, no product, no competitor, no nudge toward your category). When unsure, disclose.

Put the disclosure in the comment itself (first line or right before the product mention) — never rely on profile bio, flair, or "it's obvious." Keep it one short clause, plain and human.

Disclosure templates by role:

| Your role | Template |
|---|---|
| **Founder** | "Full disclosure, I'm the founder of [Product] — so take this with that grain of salt." |
| **Employee** | "Heads up, I work at [Company] (on [team/role]), so I'm biased here." |
| **Agency / marketer** | "Disclosure: I do marketing for [Client], so this isn't neutral." |
| **Investor / advisor** | "For transparency, I'm an investor in [Product]." |
| **Open-source maintainer** | "Maintainer of [Project] here (it's free/open source), so I'm partial." |
| **Affiliate / referral** | "Note: my link below is a referral and I get a small credit if you sign up." |

Bad disclosure (do not do): omitting it and hoping flair covers you; burying "btw I made this" in the last sentence of a long pitch; "I've heard great things about [my own product]" (pretends to be a third party).

## Account readiness

The goal is a real account with a real track record — not a "warmed-up" disguise. The test for any pre-outreach activity: *would you stand behind this comment if a moderator asked why you posted it?* If the honest answer is "to build karma so I can promote later," it's astroturfing — don't.

- Participate genuinely in communities you actually care about and expect to revisit, with no plan to convert that history into a sales channel.
- Earn standing by being useful on topics where you have real expertise; let promotion be a rare, disclosed exception, not the purpose.
- Keep activity human-paced; never batch comments or run a posting schedule to manufacture a history.
- Do not mention your product or drop links until you genuinely understand a subreddit's norms — and even then, only where it's allowed and additive.
- If the account is new, low-karma, single-purpose (only ever talks about one product), or has removals, favor read mode or draft mode and slow down.
- One person, one account for this work. See the anti-sockpuppet rule above.

## Read mode: research and thread scanning

This is where most sessions should live. Find communities, find threads, capture evidence, score fit — without posting anything.

### 1. Find candidate subreddits

- Reddit search bar → "Communities" tab for `[your category]`, `[problem you solve]`, `[competitor name]`.
- Look at where competitors and adjacent tools get discussed (search a competitor name across all of Reddit, note which subs surface).
- For each candidate sub, record: name, subscriber count, posting activity, and whether self-promo/links/vendors are allowed (from the rules — see the rubric below).

### 2. Search threads with real query syntax

Use Reddit's search operators (work in the site search box and the API `search` endpoints):

| Operator | Example | Finds |
|---|---|---|
| `subreddit:` | `subreddit:webdev best ci tool` | matches within one sub |
| `title:` | `title:"alternative to"` | phrase in the title only |
| `selftext:` | `selftext:slow build` | phrase in the post body |
| `author:` | `author:someuser` | posts by a user |
| `self:yes` | `self:yes pricing` | text posts only (skip link/image posts) |
| quotes | `"can't figure out"` | exact phrase |
| `OR` / `-` | `(alternative OR vs) -hiring` | boolean; `-` excludes |
| `flair:` | `flair:"Help"` | restrict to a flair |

Sort by **New** to catch live questions you can still help with, and by **Top → past month/year** to learn recurring pain points and the language people actually use. Intent keywords that signal a help/recommendation thread: `recommend`, `alternative to`, `vs`, `best ... for`, `how do I`, `is there a tool`, `frustrated with`, `stuck`.

### 3. Score thread-fit before drafting

Score each thread 0–2 on five axes; only threads scoring **8+/10** are worth a reply draft, **5–7** are value-only candidates, **<5** skip:

| Axis | 0 | 1 | 2 |
|---|---|---|---|
| Relevance | off-topic | adjacent | squarely your use case |
| Intent | venting/closed | discussing | actively asking for help/recs |
| Sub allows it | promo banned | links restricted | vendors/promo allowed |
| You add value | nothing new | minor | answers the real question (even w/o your product) |
| Freshness | stale/locked | weeks old | active in last few days |

### 4. Capture these fields per thread (your evidence log)

- Thread title + **permalink URL**
- Subreddit and its promo/link rule (one line)
- Post age + last-active signal, and **timestamp you reviewed it** (Reddit threads move; recommendations expire)
- OP's stated need (quote the line that shows intent)
- Fit score (from above) and reply / value-only / skip call
- Any disclosure that would be required if you reply

Always keep the permalink and your review timestamp — they're how a human reviewer re-checks the thread is still open and your read of the rules is current.

## Reddit Data API and automation policy (verify currency before relying on it)

If you go beyond manual reading in a browser into any programmatic access, you are bound by Reddit's developer terms. As of **Jun 2026**, verify all specifics against the official [Reddit Data API Wiki](https://support.reddithelp.com/hc/en-us/articles/16160319875092-Reddit-Data-API-Wiki) and the [Developer Terms / Data API Terms](https://redditinc.com/policies) — these change and the numbers below are approximate.

- **Pre-approval is required for every app**, including hobby and personal projects (Reddit's [Responsible Builder Policy](https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy), updated Nov 2025 — self-service API key creation has ended; expect a multi-week review). Register an app and authenticate with OAuth before any call.
- **Rate limits (approx., verify):** ~100 queries/minute per OAuth client ID, averaged over a 10-minute window (so bursts are tolerated); unauthenticated requests are far stricter (~10/min, IP-tracked). Back off on `429` and respect the `X-Ratelimit-*` response headers.
- **User-Agent is mandatory and must be unique/descriptive**, e.g. `platform:app-id:version (by /u/your-username)`. Generic or spoofed agents get throttled or blocked.
- **No unauthorized scraping.** Bulk-collecting Reddit content outside the approved API/terms is prohibited. Don't crawl pages to dodge the API.
- **No commercializing or relicensing Reddit data** (including using it to train ML/AI models, ad targeting, or reselling) without express written approval from Reddit. Commercial API access is enterprise/sales-gated and priced per request — assume it requires a paid agreement; **do not quote a price from memory, get a current quote from Reddit.**
- **Respect user privacy.** Don't aggregate, store, or republish individuals' post histories to profile them; honor deletions (if a user deletes content, drop it from your store).
- **Prefer the right tool for the job.** For paid reach use [Reddit Ads](https://ads.reddit.com); for monitoring mentions at scale use an approved social-listening product rather than a homegrown scraper. Manual, human-paced reading and replying in a browser is fine and is the default for this skill.

## Rule and risk check

Before drafting any reply for a subreddit, verify:

1. Sidebar / about / pinned rules
2. Whether self-promotion, links, surveys, or company participation are restricted
3. Whether user flair, account age, or karma minimums are required
4. Whether the thread is asking for recommendations, troubleshooting help, comparison advice, or something unrelated
5. Whether a reply from a brand rep would feel additive or intrusive

### Subreddit rules rubric (check each, note the answer)

Subreddit rules vary wildly; read them every time. Capture a quick yes/no/where for each:

| Check | What to look for |
|---|---|
| **Self-promo allowed?** | Many subs ban it outright, cap it (e.g. "1-in-10" / "9:1" rule), or confine it to a weekly thread. |
| **Links allowed?** | Some block all external links, some allow-list domains, some auto-remove new-account links. |
| **Vendor / brand rep rule** | Some require flair, a verified-vendor tag, or modmail pre-approval before you represent a company. |
| **Megathread-only** | Promotion, "what are you working on," surveys, or job posts may be confined to a pinned/scheduled thread. |
| **Surveys / recruiting** | Often banned or restricted to a specific day/thread; some require mod approval. |
| **Account-age / karma minimum** | Common AutoModerator gate; new/low-karma accounts get auto-removed. |
| **Flair required** | Posts (and sometimes comments) may need a flair to stay up. |
| **Removal / mod history** | Skim recent removed posts and any "we removed your post" mod notes to learn what actually gets pulled. |

If a rule is unclear or a vendor/brand reply needs sign-off, send **modmail and ask first** — that's the legitimate path (see the modmail example below), and it's the opposite of sneaking in.

## Decide: reply, value-only, or skip

### Strong candidates

- The post clearly matches the product’s use case or expertise
- The user is asking for help, recommendations, or tool comparisons
- The subreddit allows this kind of participation
- You can answer the actual question even without mentioning the product

### Value-only candidates

- The thread is relevant but promo rules are strict
- A direct answer helps, but mentioning the product adds risk
- Disclosure is still needed if speaking as a representative

### Skip immediately

- Rules ban self-promo, brand accounts, or links and the reply would clearly be promotional
- The thread is grief-heavy, legal/medical/high-risk, hostile, or moderation-sensitive
- The product is only loosely relevant
- Another reply would be repetitive, opportunistic, or defensive
- You cannot be honest about affiliation without hurting trust or breaking norms

When in doubt, skip.

## Drafting guidance

Write like a helpful participant, not an ad.

- Answer the question first
- Keep it specific to the post
- Use plain language; avoid slogans, hype, or CTA-heavy phrasing
- Mention the product only if it is genuinely useful and allowed
- Prefer no link unless the thread, rules, and user intent clearly support it
- If affiliated, disclose briefly and naturally
- Offer next-step help without pressure

## Simple reply pattern

1. Acknowledge the exact problem
2. Give 1–3 practical points that help on their own
3. If appropriate, add a brief disclosed mention of the product
4. End with a low-pressure offer or clarifying question

## Worked examples

Scenario for all examples: you're the founder of **Tasklite**, a lightweight task app. Thread: *"Anyone know a to-do app that isn't bloated? Notion is overkill for me."* in a productivity sub that allows disclosed vendor replies.

**Reply (good — disclosed, helps first):**
> Full disclosure, I'm the founder of Tasklite, so I'm biased. But for "Notion is overkill" specifically, a few things to try first regardless of app: turn off everything but a single "Today" list, and timebox instead of tagging — half the bloat people feel is unused features. If you do want something minimal, Tasklite, Things, and TodoTxt are all in that lane; Things if you're Apple-only, TodoTxt if you like plain text. Happy to answer setup questions either way.

Why it works: discloses up front, gives advice that stands alone, names competitors honestly, no link-dropping, no pressure.

**Reply (bad — undisclosed pitch):**
> Have you tried Tasklite? It's the best minimal to-do app out there, way better than Notion. Link in my bio!

Why it fails: no disclosure, pure ad, "best/way better" hype, bio-link funnel, adds nothing the OP can use.

**Value-only draft (promo rules are strict here, so no product mention):**
> "Notion is overkill" usually means you're using a database where a list would do. Two quick fixes: collapse to one view called Today, and stop tagging — sort by due date instead. If you still want lighter, look for apps that open straight to a single list with no setup. That alone fixed it for a lot of people I've talked to.

Why it works: genuinely useful, no product, no affiliation angle so no disclosure needed.

**Skip rationale (write this instead of a draft):**
> Skip — the sub's rule 4 bans all vendor/self-promo and there's no way to mention Tasklite honestly without breaking it. The OP already picked an app two comments down, so even a value-only reply is late and adds nothing. Leaving it.

**Modmail request (when a vendor reply needs pre-approval):**
> Subject: Vendor participation question
> Hi mods — I'm the founder of Tasklite (a to-do app). I see occasional threads asking for minimal task-app recommendations and I'd like to participate honestly. Is disclosed vendor participation allowed, and if so are there rules (flair, frequency, link policy) I should follow? Happy to stay hands-off if it's not welcome. Thanks.

**Post-removal response (a mod removed your comment):**
> Do **not** repost or argue. Acknowledge once, ask what the right path is, then drop it:
> "Understood, sorry — I misread the rule. Is there a thread or format where this kind of reply is okay, or should I keep out? Thanks for the heads up." Then log the removal in the outcome log and pause activity in that sub.

## Draft output format

For each candidate thread, produce:

- **Thread**: title + URL
- **Subreddit**:
- **Intent**: what the user seems to need
- **Rules / risk**: short note
- **Recommendation**: reply / value-only / skip
- **Why**: one or two sentences
- **Draft reply**: only for reply or value-only
- **Disclosure note**: exact wording if needed

## Moderation-risk score and go/no-go

Before recommending a post, score the *risk* (separate from thread-fit). Add the points; this gates the decision:

| Risk factor | Points |
|---|---|
| Self-promo / vendor replies banned or capped in this sub | +3 |
| External link in the draft | +2 |
| Account is new, low-karma, single-purpose, or has recent removals | +2 |
| Product/affiliation is the main point of the reply (vs. incidental) | +2 |
| No flair/age/karma requirement met that the sub demands | +2 |
| Thread is emotional, legal/medical, hostile, or already mod-active | +3 |
| You can't disclose honestly without it reading as an ad | +3 |

**Go / no-go on total risk:**

- **0–2 → Go** (in explicit post mode, with all checklist items below satisfied).
- **3–5 → Value-only or modmail first** — strip the product/link, or ask the mods before posting.
- **6+ → No-go, skip** and log why.

Any single hard stop (vote manipulation, sockpuppet, undisclosed paid push, scraping outside API terms) is an automatic no-go regardless of score.

### Final go/no-go template

Fill before any post:

```
Thread: <title + permalink>
Subreddit: <name>  | promo rule: <allowed / capped / banned / megathread-only>
Thread-fit: <score>/10   Moderation-risk: <score>
Disclosure used: <exact wording, or "none — no commercial angle">
Link included? <no / yes — justified because ...>
Account standing: <ok / new-low-karma → slow down>
Decision: <GO / VALUE-ONLY / MODMAIL FIRST / SKIP>
Reason: <one or two sentences>
```

## Posting checklist

Only in explicit post mode:

- User approved the draft
- Rules were checked in this session
- Disclosure wording is appropriate
- No copied text from another thread
- Pace is conservative; avoid bursts
- Log the outcome after posting or attempted posting

## Outcome logging

After a session, record a short summary with:

- Date
- Mode used
- Subreddits reviewed
- Threads scanned
- Drafts prepared
- Posts actually made
- Skips and why
- Any removals, warnings, or rule changes noticed
- Recommended next step

## Good defaults

- Default to draft mode
- Default to no link
- Default to skip over borderline cases
- Default to transparency over cleverness

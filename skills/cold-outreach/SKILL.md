---
name: cold-outreach
description: "B2B cold email and LinkedIn outreach: deliverability (SPF/DKIM/DMARC), copy frameworks, sequences, personalization, suppression, and compliance (CAN-SPAM/GDPR/CASL). Use when writing or diagnosing compliant cold outbound, fixing spam-folder/deliverability issues, or lifting reply/meeting rates; not for consumer bulk or scraped lists."
---

# Cold Outreach

## Workflow

### 1. Deliverability Setup

Do this BEFORE sending a single email. Skipping this = spam folder.

**DNS records (required) — publish only the ESP you actually send through.** Do not copy a multi-include SPF "starter" record; each `include:` costs DNS lookups (SPF hard-fails at **10 lookups** per RFC 7208) and an unused include both wastes a lookup and authorizes a sender you don't use.

```
# SPF — pick ONE example matching your ESP. Use ~all (softfail) while warming, -all once stable.
# Google Workspace:   v=spf1 include:_spf.google.com ~all
# SendGrid:           v=spf1 include:sendgrid.net ~all
# Microsoft 365:      v=spf1 include:spf.protection.outlook.com ~all
# Amazon SES:         v=spf1 include:amazonses.com ~all
# Most cold-email senders (Instantly/Smartlead) ship a dedicated domain — use the
# exact SPF/DKIM strings from THEIR setup wizard, not the strings above.

# DKIM — your ESP generates the keypair and gives you the exact TXT record + selector.
# Publish it verbatim. Prefer a 2048-bit key. Example selector:
sg._domainkey.example.com  TXT  "v=DKIM1; k=rsa; p=MIGfMA0GCSq..."   # value from ESP

# DMARC — start at p=none with reporting; tighten only after SPF+DKIM align cleanly for ~2 weeks.
_dmarc.example.com  TXT  "v=DMARC1; p=none; rua=mailto:dmarc@example.com; fo=1"
```

> **Alignment, not strictness.** DMARC passes on **relaxed** alignment by default (org-domain match), which is all Gmail/Yahoo require. Do **not** reflexively set `aspf=s; adkim=s` — strict mode breaks legitimate setups where the ESP signs with a subdomain or rewrites the envelope (common with shared sending domains). Leave alignment relaxed (the default) unless you control every signing surface and have a specific spoofing reason.

**Verify before you send** (run these; don't trust the dashboard alone):
```bash
dig +short TXT example.com                         # SPF: exactly one v=spf1 record, <10 includes
dig +short TXT sg._domainkey.example.com           # DKIM: your selector resolves to v=DKIM1 ...
dig +short TXT _dmarc.example.com                   # DMARC: v=DMARC1; p=...; rua=...
# Count SPF lookups (must stay <=10):
dig +short TXT example.com | grep -o 'include:' | wc -l
# End-to-end: send one message to a Gmail account, open "Show original" → expect
#   SPF: PASS,  DKIM: PASS,  DMARC: PASS
```
If you use a **click/open tracking domain**, host it as a CNAME on a subdomain you control (e.g. `track.example.com`) and confirm it isn't on a blocklist — a shared/blacklisted tracking domain tanks deliverability even when auth passes.

**Domain warmup schedule (new domain):**

| Week | Emails/day | Target |
|------|-----------|--------|
| 1 | 5-10 | Known contacts, internal, friends |
| 2 | 15-25 | Warm leads, existing network |
| 3 | 30-50 | Mix of warm and cold |
| 4 | 50-80 | Full cold outreach |
| 5+ | 80-100 | Steady state |

**Domain strategy — tradeoff, not a rule.** "Never send cold from your primary domain" is a heuristic, not a law: a sending subdomain (`mail.example.com`) shares the **organizational** domain's reputation, so it isolates DKIM/IP reputation but does **not** fully wall off the brand. Common patterns:

| Pattern | When to use | Tradeoff |
|---|---|---|
| Primary domain (`example.com`), authenticated | Low-volume, high-trust, relationship sales; founder-led | A spam spike can hurt your transactional/marketing mail and brand search. |
| Sending subdomain (`mail.example.com`) | Most teams; isolates DKIM/IP, keeps brand recognition | Shares org-level DMARC reputation; not a clean firewall. |
| Separate lookalike domain (`example-team.com`) + redirect | Higher-volume programmatic outbound | Maximum isolation, but lookalike domains are lower-trust and can read as phishing if mismatched. Never impersonate. |

Whatever you choose, authenticate it fully and never run cold volume through the domain that carries your password-reset / billing / transactional mail.

### 2. Copy Frameworks

**PAS (Problem-Agitate-Solve):**
```
Subject: [Problem they have]

Hi [Name],

[Problem]: Most [their role] at [their company type] struggle with [specific problem].

[Agitate]: This usually means [consequence] — which costs [quantified impact].

[Solve]: We help [similar companies] [specific outcome] by [method].

[CTA]: Worth a 15-min call this week?
```

**QVC (Question-Value-CTA):**
```
Subject: Quick question about [their specific situation]

Hi [Name],

[Question]: How are you handling [specific challenge] at [Company]?

[Value]: We helped [similar company] [specific result with numbers]
by [brief method].

[CTA]: Open to hearing how?
```

**BAB (Before-After-Bridge):**
```
Subject: [Desired outcome] for [Company]

Hi [Name],

[Before]: Right now [their situation/pain].

[After]: Imagine [desired state with specific metrics].

[Bridge]: That's what we did for [reference customer].
15 minutes to show you how?
```

### 3. Follow-Up Sequence

**Timing (7-touch, 21 days):**

| Touch | Day | Type | Purpose |
|-------|-----|------|---------|
| 1 | 0 | Email | Initial value prop |
| 2 | 2 | Email | Different angle or case study |
| 3 | 5 | LinkedIn | Connect + comment on their content |
| 4 | 7 | Email | Social proof / testimonial |
| 5 | 11 | Email | New insight or resource |
| 6 | 15 | Email | Direct ask with urgency |
| 7 | 21 | Email | Breakup — polite close |

**Follow-up rules:**
- Each touch adds NEW value — never "just bumping this up"
- Vary the angle: problem, social proof, insight, resource, direct ask
- Keep emails under 100 words (mobile-first)
- One CTA per email, always a question

### 3b. LinkedIn outreach — ToS risk policy (read before automating)

**LinkedIn's User Agreement explicitly prohibits third-party software that scrapes, copies, or automates activity** (connections, messages, profile views, data export). Enforcement is active and escalating: detection → temporary restriction → permanent account ban, and a banned account loses your network permanently. There is **no "safe" automation tier** — only a risk gradient. Choose deliberately.

| Tier | What it is | Risk | Use when |
|---|---|---|---|
| **Manual** | You personally connect/message via the LinkedIn UI or Sales Navigator | None (compliant) | Default. High-value, low-volume, relationship-led outreach. |
| **Native Sales Navigator** | Saved searches, lead lists, alerts, InMail credits — all first-party | None (paid LinkedIn feature) | Scaling *research and targeting* without breaking ToS. |
| **Semi-automated task queue** | Tool builds a daily *to-do list* of profiles; a human clicks each action | Lower, but still ToS-adjacent if it injects actions | You want throughput but keep a human in the loop per action. |
| **Full automation / scraping** | Auto-sends connections/messages, scrapes profiles (HeyReach, Expandi, Aimfox, PhantomBuster, Dripify) | **High — ToS violation, account restriction/ban** | Generally avoid. If used at all, never on a primary account you can't lose, and respect human-like daily limits. |

**Practical limits even when manual:** keep connection requests to roughly **15-25/day** on an established account (lower for new accounts), personalize the note, and warm with a comment/like before connecting. Lead with the relationship — pitch *after* a connection is accepted and there's a reason to talk, not in the connection request. For volume programs, **email is the lower-legal-risk channel**; use LinkedIn for research, social proof, and a human touch within the multi-channel sequence (touch 3 in §3), not as the automation backbone.

### 4. Targeting & list quality (do this before personalization)

The biggest reply-rate lever is **who** you contact and **where the list came from** — not the copy. Garbage list + perfect copy still loses.

**ICP qualification checklist** (a lead should clear most of these before it enters a sequence):
- **Firmographic fit:** industry, company size/headcount, revenue, geography, funding stage.
- **Role fit:** the contact can *buy or champion* — title maps to budget/authority over the problem, not just a keyword match.
- **Trigger/timing signal:** a reason to reach out *now* (new funding, new hire in the role, job postings for the pain you solve, tech-stack change, expansion, leadership change).
- **Reachability:** a verified email (and ideally a LinkedIn profile) — see verification in §7.
- **Exclusions:** existing customer, open opportunity, competitor, or on the suppression list (§9) → drop.

**Source-quality scoring** — not all "leads" are equal; score the *source* and set expectations accordingly:

| Source | Quality | Notes |
|---|---|---|
| Referral / warm intro | A | Highest reply rate; not really "cold." |
| First-party signal (visited site, engaged content, event) | A− | High intent; near-warm. |
| Curated from Sales Nav + verified email | B+ | The reliable cold baseline. |
| Apollo/ZoomInfo export, verified + filtered to ICP | B | Fine if verified and tightly filtered. |
| Broad provider export, unfiltered | C | High bounce; re-verify and segment hard. |
| Purchased / scraped list | D / avoid | High bounce + complaint risk **and** usually unlawful under GDPR/CAN-SPAM (§8). Don't. |

**Offer–message fit:** match the *offer* to where the segment sits. Cold prospects rarely book a "demo" — lead with a low-friction, high-value ask (a relevant insight, a teardown, a benchmark, a 15-min problem conversation) sized to the relationship temperature. The CTA in §2 should escalate as the prospect warms, not open with the biggest ask.

**Personalization**

**Tiers by effort** (reply-rate ranges are directional — they depend on ICP fit and list temperature from above, not just minutes spent):

| Tier | Time/email | Method | Reply rate |
|------|-----------|--------|-----------|
| Generic | 0 min | Template only | 1-3% |
| Light | 2 min | Company name + role-specific pain | 5-8% |
| Medium | 5 min | Reference their content/news + custom opener | 10-15% |
| Deep | 15 min | Unique insight about their business + custom value prop | 20-30% |

**Personalization signals (research checklist):**
- Recent LinkedIn posts or articles they wrote
- Company news (funding, hiring, product launch)
- Tech stack (BuiltWith, Wappalyzer)
- Job postings (reveal priorities and pain points)
- Mutual connections
- Conference appearances or podcast episodes

### 5. Benchmarks

**These bands are directional, not universal.** Reply/positive-reply rates swing 5-10x with ICP, list source (opted-in vs scraped vs referral), offer strength, market, seniority, and channel. Treat the table as "is my campaign roughly in range," not as a target — and always compare a campaign to *your own* baseline, not to a blog number.

| Metric | Poor | Average | Good | Excellent |
|--------|------|---------|------|-----------|
| Reply rate | < 2% | 3-5% | 5-10% | > 10% |
| Positive reply rate | < 0.5% | 1-2% | 2-4% | > 4% |
| Booked-meeting rate (per send) | < 0.3% | 0.5-1% | 1-2% | > 2% |
| Opportunity rate (per send) | < 0.1% | 0.2-0.5% | 0.5-1% | > 1% |
| Bounce rate | > 5% | 2-5% | 1-2% | < 1% |
| Spam-complaint rate | > 0.3% | 0.1-0.3% | 0.05-0.1% | < 0.05% |
| Unsubscribe rate | > 2% | 1-2% | 0.5-1% | < 0.5% |
| Open rate | *noisy — see below* | | | |

**Optimize for revenue, not opens.** The metric that pays is **opportunity rate** and **revenue per 1,000 sends** (= positive replies × meeting rate × win rate × ACV ÷ sends). Rank campaigns by that, not by opens.

**Bands shift with list temperature** — calibrate before judging:

| List temperature | Realistic reply rate | Notes |
|---|---|---|
| Cold, scraped/purchased | 1-3% | Often non-compliant (see §8). High bounce/complaint risk. |
| Cold, well-targeted ICP + verified | 4-8% | The "good cold" baseline this skill assumes. |
| Warm (engaged with content, attended webinar) | 8-20% | Treat as nurture, not cold. |
| Referral / mutual-intro | 20-40%+ | Different motion entirely; don't benchmark against cold. |

> **Open rate is now a vanity/noise metric, not a diagnostic.** Two effects break it: (1) **Apple Mail Privacy Protection** (iOS 15+) pre-fetches every tracking pixel through Apple proxies, so Apple Mail clients log an "open" regardless of whether anyone read it; (2) **Gmail/Google image proxying** caches images server-side, inflating and de-timing opens. Reported open rates above ~50% are dominated by this noise. Use open rate only as a coarse "is my domain getting *delivered* at all" smoke signal — make decisions on reply, meeting, and opportunity rates.

**Diagnostics:**
- **Replies near zero, but it's a fresh domain/inbox:** likely a *deliverability* (placement) problem, not copy — seed-test inbox placement (GlockApps/mail-tester) before blaming the message.
- **Opens look fine but replies are low:** copy/offer/targeting problem. Test framework, then offer, then ICP — in that order.
- **Bounce rate high:** list-quality problem. Re-verify (§7) and pause the domain — high bounces trigger filtering for the whole sending domain.
- **Complaint rate climbing toward 0.3%:** stop. Re-segment, tighten ICP, and check you're honoring opt-outs (§8).

### 5b. Google, Yahoo + Microsoft sender requirements (in force 2024-2025)

Effective Feb 1, 2024 (with **one-click unsubscribe enforced from June 1, 2024**), Gmail and Yahoo split their rules into two tiers. Know which tier you're in:

- **All senders** (any volume): valid SPF **or** DKIM, valid forward+reverse DNS (PTR) on sending IPs, a real `From`, and spam rates kept low. Don't send from a domain with no auth at all.
- **Bulk senders** (~**5,000+ messages/day** to Gmail/Yahoo, counted per From-domain): the full table below — SPF **and** DKIM, DMARC, DMARC-aligned From, one-click unsubscribe, and complaint rate held under 0.3%.
- **Microsoft Outlook (outlook.com/hotmail/live):** since May 5, 2025, domains sending 5,000+ emails/day to Outlook consumer addresses must also pass SPF, DKIM, and DMARC (min p=none, aligned); non-compliant mail is junked, then rejected outright. The table below covers it: same auth, same unsubscribe hygiene.

Cold outreach almost always *should* meet the bulk-sender bar even under 5,000/day — filters apply the same signals to everyone and tighten over time.

| Requirement | Tier | Implementation | Verify with |
|---|---|---|---|
| SPF + DKIM on every send | Bulk (one of them: all) | Publish SPF; sign with DKIM, **2048-bit** recommended (1024-bit is the floor) | `mail-tester.com`, Google Postmaster Tools |
| DMARC published, min `p=none` w/ reporting | Bulk | `_dmarc.example.com TXT "v=DMARC1; p=none; rua=mailto:dmarc@example.com"` (tighten to `p=quarantine` once aligned ~2 weeks) | dmarcian, dmarcadvisor |
| From-domain **aligned** with SPF or DKIM | Bulk | The authenticated domain must match the `From:` org-domain. **Relaxed alignment (the default) satisfies this** — do *not* force `adkim=s`/`aspf=s` (see §1 warning). | Gmail "Show original" → DMARC: PASS |
| One-click List-Unsubscribe (RFC 8058) | Bulk | Headers: `List-Unsubscribe: <mailto:u@example.com>, <https://example.com/unsub?t=…>` **plus** `List-Unsubscribe-Post: List-Unsubscribe=One-Click` | Send to Gmail, "Show original" |
| Honor unsubscribes within 2 days | Bulk | Wire the `POST` endpoint to actually suppress (don't 200-OK and ignore) | Self-test the URL |
| Spam complaint rate < 0.3% (keep < 0.1%) | All (measured for bulk) | Postmaster Tools "User reported spam rate" panel | Google Postmaster Tools |
| Valid PTR / reverse DNS on sending IP | All | ESP handles this on shared IPs; set it yourself on dedicated IPs | `dig -x <sending-ip>` |

Sequence-tool vendors (Instantly, Smartlead, Lemlist) usually inject the unsubscribe headers automatically when you publish a custom sending domain, but **always test once** with a real Gmail/Yahoo inbox before scaling. Requirements evolve; confirm current thresholds at the official pages (Google: `support.google.com/a/answer/81126`, Yahoo Sender Hub, Outlook postmaster/SNDS portal); as of Jun 2026 the above reflects the 2024-2025 rollout.

### 6. A/B Testing

**Test one variable at a time:**

| Variable | Test method |
|----------|------------|
| Subject line | Split list 50/50, send simultaneously |
| Opening line | Same subject, different first sentence |
| CTA type | Question vs statement vs calendar link |
| Sending time | Same copy, different send times |
| Sequence length | 5-touch vs 7-touch |
| Personalization tier | Light vs medium on same segment |

**Sample size: be realistic about power.** For reply/positive-reply rates in the 1-5% range, **100 emails per variant is directional only, not statistically significant** (you'd see ~1-5 replies per arm, so noise swamps the signal). Rough guide to *detect* a change at ~5% base reply rate:

| What you're measuring | To spot a big lift (e.g. 3%→6%) | To spot a small lift (e.g. 5%→6.5%) |
|---|---|---|
| Reply rate (~3-5% base) | ~500-800 per variant | ~3,000-5,000+ per variant |
| Positive-reply / meeting rate (~1% base) | ~2,000+ per variant | rarely powered in normal volume — decide on direction + judgment |

Rules of thumb: the lower the base rate and the smaller the lift, the more volume you need; if you can't reach the volume, treat results as a *lean*, not a verdict, and don't over-rotate on a winner from a few hundred sends. Use a 2-proportion z-test (or any A/B calculator) before declaring a winner. **Subject-line/open tests need *more* volume now** because open data is MPP-polluted (§5) — prefer testing on reply, not opens.

**Run time:** 7-14 days to account for follow-up replies (replies trickle in across the sequence; calling it on day 2 biases toward fast responders).

### 7. Tools Stack

| Function | Tools |
|----------|-------|
| Email finding | Apollo, Hunter.io, Snov.io |
| Enrichment & orchestration | **Clay** (waterfall enrichment + AI lookups), Apollo, Hunter Discovery |
| Verification | NeverBounce, ZeroBounce, MillionVerifier, Bouncer |
| Sequencing | Instantly, Smartlead, Lemlist, Apollo, Salesloft, Outreach |
| Warmup | Instantly (built-in), Warmbox, Mailwarm |
| LinkedIn | **See §3b for the ToS risk policy before using any automation tool.** Safe layer: LinkedIn Sales Navigator (native search/lists/alerts). Tools that auto-send connections/messages or scrape (HeyReach, Aimfox, Expandi, PhantomBuster, Dripify) violate LinkedIn's User Agreement and risk restriction/ban — do not treat as routine. |
| Deliverability monitoring | Google Postmaster Tools, Yahoo Sender Hub, Outlook SNDS/postmaster, GlockApps |
| CRM | HubSpot, Pipedrive, Close |

## 8. Legal & compliance (this is not optional)

> **Not legal advice.** Cold outreach is regulated and the rules differ sharply by recipient jurisdiction and B2B-vs-B2C. The cost of getting it wrong is fines, blocklisting, and brand damage. Confirm specifics with counsel for your markets, and **suppress jurisdictions you can't comply with** rather than guessing.

**The non-negotiables for any commercial email (all jurisdictions):** truthful `From`/sender identity, non-deceptive subject line, accurate routing headers, a working opt-out, prompt honoring of opt-outs, and **no scraped/harvested/purchased lists**. Build the suppression list *before* the first send (§9).

### US — CAN-SPAM (federal, applies to commercial email to US recipients)
B2B and B2C are treated the same; there is **no opt-in requirement**, but every message must:
- Use **truthful header info** and a **non-deceptive subject line**.
- Identify the message as an ad (context usually suffices for 1:1 sales; be safe if borderline).
- Include a **valid physical postal address** (street address, PO box, or registered-agent address).
- Provide a **clear opt-out mechanism** and **honor it within 10 business days**; keep honoring it (no re-adding, no selling the address).
- Penalties accrue **per email**, and you're liable for what a vendor sends on your behalf.

### US states — privacy laws (CCPA/CPRA and the 2023-2025 wave: VA, CO, CT, UT, TX, OR, etc.)
Email *prospecting* is governed by CAN-SPAM, but the **data** you process (enriched B2B contact records) can fall under state privacy laws. Practically: honor deletion/opt-out-of-sale requests, don't buy/sell personal data sketchily, and keep a record of your data sources. Treat this as data-handling hygiene layered on top of CAN-SPAM.

### EU/UK — GDPR + ePrivacy (and UK PECR)
This is the strict regime. Email + names + company info = **personal data** under GDPR.
- **Lawful basis:** for B2B cold email the usual basis is **legitimate interest** — and you must actually run and document a **Legitimate Interest Assessment (LIA)**: a clear B2B purpose, relevance of the offer to the person's *professional* role, and a balancing test showing your interest doesn't override their rights. **B2C cold email generally requires prior consent (opt-in).**
- **ePrivacy/PECR overlay:** electronic marketing rules sit *on top of* GDPR. Some EU states and the UK treat individual/sole-trader/partnership contacts more like consumers (consent-leaning) even in B2B; corporate role addresses (`name@company.com`) are the safer LI ground. UK PECR + GDPR: corporate B2B email can rely on LI; sole traders/individuals lean to consent.
- **Required at/after first contact:** identify who you are, **how you got their data**, the purpose, and an easy way to **object/opt out** — plus a privacy-notice link. Honor objection and erasure requests promptly.
- **Data minimization & retention:** collect only what you need, document the source per record, and set a retention/deletion policy (don't sit on stale prospect data indefinitely).

### Canada — CASL (one of the strictest; opt-in by default)
- Commercial electronic messages generally require **express or implied consent** before sending — cold-emailing a Canadian recipient with no prior relationship is high-risk.
- Every message must include **clear sender identification, valid contact info, and a working unsubscribe honored within 10 business days**.
- Penalties are severe (up to **CAD $10M** per violation for organizations). When in doubt, **suppress .ca / Canadian recipients** unless you have a defensible consent basis.

### Practical decision rules
- **B2B, US, role-based corporate address, relevant offer:** CAN-SPAM compliant footer + opt-out → generally OK.
- **B2B, EU/UK, role-based corporate address:** document an LIA, disclose data source, easy opt-out/object → defensible; individuals/sole traders → lean consent.
- **Canada / any B2C / any consumer address:** assume **consent required** or suppress.
- **List was scraped/purchased:** do not send. It's both a deliverability disaster and unlawful in most regimes.
- **Can't determine recipient jurisdiction:** enrich it, or suppress by country, before sending.

## 9. Operational artifacts

### Compliant email footer (every cold message)
```
—
[Your Name] · [Company]
[Company Legal Name], [Street Address or PO Box], [City, Region, Postal, Country]   ← required by CAN-SPAM
We got your work email because [how you sourced it, e.g. "your role at <Company>"].   ← required under GDPR
Don't want these? Unsubscribe: https://example.com/unsub?t=<token>   (we'll stop within 2 days)
```
Keep it short and human for 1:1 sales, but the **postal address**, **source disclosure**, and **working opt-out** must be present.

### One-click unsubscribe headers (bulk; see §5b)
```
List-Unsubscribe: <mailto:unsub@example.com?subject=unsubscribe>, <https://example.com/unsub?t=OPAQUE_TOKEN>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```
The HTTPS endpoint must accept a **POST** with body `List-Unsubscribe=One-Click` and suppress without requiring a login or extra click. Use an **opaque per-recipient token**, not the raw email in the URL.

### Suppression list — the single most important table you own
Check **every** address against this *before* every send, across all campaigns and sending domains. One global suppression list, not per-campaign.

```sql
CREATE TABLE suppression (
  email_hash    TEXT PRIMARY KEY,   -- sha256(lower(trim(email))); store hash, not raw, where possible
  email         TEXT,               -- raw kept only if you have a lawful basis
  domain        TEXT,               -- suppress whole domain on a single complaint if needed
  reason        TEXT NOT NULL,      -- unsubscribe | complaint | hard_bounce | manual | gdpr_erasure | do_not_contact
  source        TEXT,               -- where the suppression came from
  campaign_id   TEXT,               -- which campaign triggered it (nullable)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  permanent     BOOLEAN NOT NULL DEFAULT true   -- complaints/unsubs/erasure = permanent; never re-add
);
-- Suppression is permanent and global. Never "clean" it to re-mail people. Never sell or share it.
```

### Bounce & reply taxonomy (drives suppression and triage)
| Class | Examples | Action |
|---|---|---|
| **Hard bounce** | 5.1.1 no such user, domain not found | Suppress permanently. Re-verify list source. |
| **Soft bounce** | mailbox full, temporary defer (4xx) | Retry per ESP; suppress after ~3-5 consecutive. |
| **Block / policy** | 5.7.1 rejected, "message looks like spam", IP/domain blocked | **Stop the campaign** — reputation/auth problem, not a list problem. Run §9 triage. |
| **Spam complaint (FBL)** | recipient hit "report spam" | Suppress permanently **and** treat as a leading indicator — if rate nears 0.3%, pause and re-segment. |
| **Out-of-office** | auto-reply | Don't count as reply; re-queue after the return date. |
| **Unsubscribe / "remove me"** | explicit opt-out (any wording) | Suppress permanently within 2 days. Catch free-text "take me off your list" too, not just header clicks. |
| **Positive / neutral reply** | interested, "who are you", referral | Pull from sequence → human → CRM. |

### Deliverability incident triage (replies/placement suddenly drop)
1. **Confirm it's placement, not copy:** seed-test inbox placement (GlockApps / mail-tester); send yourself a message and check Gmail "Show original" → SPF/DKIM/DMARC all PASS?
2. **Check authentication didn't break:** re-run the §1 `dig` checks (someone edited DNS? SPF over 10 lookups? DKIM selector rotated by the ESP?).
3. **Check reputation:** Google Postmaster Tools domain/IP reputation + spam-complaint panel. Climbing complaints or "Bad/Low" reputation → pause volume immediately.
4. **Check volume/ramp:** did you spike sends or add a cold inbox without warmup? Drop back to the §1 warmup curve.
5. **Check list quality:** bounce rate up? You burned a bad list — pause, re-verify, tighten ICP (§4).
6. **Check content:** spammy phrasing, too many links/images, link-shortener/blacklisted tracking domain, big image-to-text ratio.
7. **If reputation is damaged:** stop sending on that domain, let it cool, re-warm slowly; don't just spin up a new domain and repeat the same behavior.

### When to stop a campaign (hard thresholds)
- **Bounce rate > 3%** mid-campaign → pause, re-verify the remaining list.
- **Spam-complaint rate ≥ 0.1%** and rising → pause, re-segment, audit opt-out handling (target stays < 0.3%, see §5b).
- **Unsubscribe rate > 2%** → message/offer/targeting mismatch — fix before resuming.
- **Reply rate far below your own baseline** after adequate volume (§6) → kill or rebuild; don't keep burning domain reputation on a dead campaign.

## Daily Operations Checklist

- [ ] Check reply inbox — respond within 2 hours during business hours
- [ ] Process opt-outs / "remove me" replies into the **suppression list within 2 days** (§9), including free-text ones
- [ ] Review bounce notifications — suppress hard bounces; investigate any `block/policy` bounces as a reputation issue (§9 taxonomy)
- [ ] Monitor sending reputation + spam-complaint rate (Google Postmaster Tools); pause if complaints near 0.1% and rising
- [ ] Review sequence analytics on **reply/meeting rate, not opens** — pause underperforming or stop campaigns past the §9 thresholds
- [ ] Move positive replies to CRM — tag source campaign, and pull them out of the sequence

---
name: cold-outreach
description: "Cold email and LinkedIn outreach. Personalization frameworks, follow-up sequences, deliverability, and reply rate optimization."
---

# Cold Outreach

## Workflow

### 1. Deliverability Setup

Do this BEFORE sending a single email. Skipping this = spam folder.

**DNS records (required):**
```
# SPF — authorize your sending IPs
v=spf1 include:_spf.google.com include:sendgrid.net ~all

# DKIM — sign emails cryptographically
selector._domainkey.example.com → provided by your ESP

# DMARC — tell receivers what to do with failures
_dmarc.example.com → v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com
```

**Domain warmup schedule (new domain):**

| Week | Emails/day | Target |
|------|-----------|--------|
| 1 | 5-10 | Known contacts, internal, friends |
| 2 | 15-25 | Warm leads, existing network |
| 3 | 30-50 | Mix of warm and cold |
| 4 | 50-80 | Full cold outreach |
| 5+ | 80-100 | Steady state |

**Never send from your primary domain.** Use a dedicated subdomain (e.g., `outreach.example.com`) to protect your main domain reputation.

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

### 4. Personalization

**Tiers by effort:**

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

| Metric | Poor | Average | Good | Excellent |
|--------|------|---------|------|-----------|
| Open rate | < 30% | 40-50% | 50-65% | > 65% |
| Reply rate | < 2% | 3-5% | 5-10% | > 10% |
| Positive reply rate | < 1% | 1-3% | 3-5% | > 5% |
| Bounce rate | > 5% | 2-5% | 1-2% | < 1% |
| Unsubscribe rate | > 2% | 1-2% | 0.5-1% | < 0.5% |

> **Apple MPP caveat:** Apple Mail Privacy Protection (iOS 15, Sept 2021) pre-fetches every remote image through Apple proxies, so Apple Mail clients register as an "open" whether the recipient read the message or not. Reported open rates above ~50% are dominated by MPP noise — pivot decision-making to reply rate and downstream conversions, not opens.

**If open rate is low:** Subject line problem. A/B test subjects.
**If open rate is high but reply is low:** Copy problem. Test different frameworks.
**If bounce rate is high:** List quality problem. Verify emails before sending.

### 5b. Google + Yahoo bulk-sender compliance (Feb 1, 2024)

Mandatory for any domain sending **>5,000 messages/day** to Gmail or Yahoo. Below 5,000/day, treat the same rules as "strongly recommended" — Gmail in particular tightens enforcement on smaller senders over time.

| Requirement | Implementation | Verify with |
|---|---|---|
| SPF + DKIM authentication on every send | Publish SPF TXT record; sign with DKIM (1024-bit minimum, 2048-bit recommended) | `mail-tester.com`, Google Postmaster Tools |
| DMARC published, minimum `p=none` with reporting | `_dmarc.example.com TXT "v=DMARC1; p=none; rua=mailto:dmarc@example.com"` (move to `p=quarantine` once aligned) | dmarcian, dmarcadvisor |
| One-click List-Unsubscribe (RFC 8058) | Headers: `List-Unsubscribe: <mailto:u@example.com>, <https://example.com/unsub?t=…>` **plus** `List-Unsubscribe-Post: List-Unsubscribe=One-Click` | Send to a Gmail account, view "Show original" |
| Honor unsubscribes within 2 days | Wire the `POST` endpoint to actually suppress (don't 200-OK and ignore) | Self-test the URL |
| Spam complaint rate < 0.3% (target < 0.1%) | Postmaster Tools "User reported spam rate" panel | Google Postmaster Tools |
| One-to-one DKIM alignment on From: domain | DKIM-signing domain must align with the From: header domain | DMARC `aspf=s; adkim=s` |

Sequence-tool vendors (Instantly, Smartlead, Lemlist) usually inject the unsubscribe headers automatically when you publish a custom sending domain — but **always test once** with a real Gmail/Yahoo inbox before scaling.

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

**Minimum sample:** 100 emails per variant for meaningful results.
**Run time:** 7-14 days to account for follow-up replies.

### 7. Tools Stack

| Function | Tools |
|----------|-------|
| Email finding | Apollo, Hunter.io, Snov.io |
| Enrichment & orchestration | **Clay** (waterfall enrichment + AI lookups), Apollo, Hunter Discovery |
| Verification | NeverBounce, ZeroBounce, MillionVerifier, Bouncer |
| Sequencing | Instantly, Smartlead, Lemlist, Apollo, Salesloft, Outreach |
| Warmup | Instantly (built-in), Warmbox, Mailwarm |
| LinkedIn | HeyReach, Aimfox, Expandi (note: LinkedIn cracked down on PhantomBuster/Dripify-style automation 2024-25 — use cautiously) |
| Deliverability monitoring | Google Postmaster Tools, Yahoo Sender Hub, GlockApps |
| CRM | HubSpot, Pipedrive, Close |

## Daily Operations Checklist

- [ ] Check reply inbox — respond within 2 hours during business hours
- [ ] Review bounce notifications — remove invalid addresses
- [ ] Monitor sending reputation (Google Postmaster Tools)
- [ ] Review sequence analytics — pause underperforming campaigns
- [ ] Move positive replies to CRM — tag source campaign

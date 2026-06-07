---
name: business-development
description: "BD strategy for B2B SaaS: partner scoring, compliance-safe outreach, deal pipeline + CRM fields, partner economics, and negotiation playbooks. Use when sourcing/qualifying partners, running cold outbound, structuring referral/reseller/integration/white-label deals, negotiating partnership terms, or building a BD dashboard."
---

# Business Development

## Workflow

### 1. Partner Identification

**Scoring matrix — rate each potential partner 1-5:**

| Criterion | Weight | Score (1-5) |
|-----------|--------|-------------|
| Audience overlap | 25% | Does their audience need your product? |
| Technical fit | 20% | Can you integrate/co-build? |
| Brand alignment | 15% | Compatible positioning and values? |
| Reach | 15% | Audience size and engagement |
| Strategic value | 15% | Opens new market/segment? |
| Effort to close | 10% | Decision-maker accessibility |

**Weighted score > 3.5 = pursue. 2.5-3.5 = nurture. < 2.5 = skip.**

### 2. Outreach Sequences

> **Compliance-first outbound — read before sending anything.** B2B cold email is *not* exempt from the law. Get these right or you risk fines, domain blacklisting, and platform bans. None of this is legal advice — confirm with counsel for your jurisdictions and verify current rules at the official sources below.

**Lawful basis & consent (by region):**

| Region | Cold email to a business contact | Source of truth |
|--------|----------------------------------|-----------------|
| US (CAN-SPAM) | Allowed without prior consent, but requires accurate `From`/`Subject`, a physical postal address, and a working opt-out honored within 10 business days. | ftc.gov — CAN-SPAM compliance guide |
| EU/EEA (GDPR + ePrivacy) | Email to a *named individual* needs a lawful basis. **Legitimate interest** can work for B2B prospecting if the offer is relevant to their role and you pass a balancing test + provide easy opt-out; some member states (e.g. DE, IT) effectively require opt-in. Generic role aliases (`info@`, `sales@`) are lower-risk. | gdpr.eu / your national DPA; verify per-country as of Jun 2026 |
| UK (UK GDPR + PECR) | Similar to EU; the "soft opt-in" and corporate-subscriber rules under PECR apply. | ico.org.uk |
| California (CCPA/CPRA) | Not a spam law per se, but honor opt-out/"Do Not Sell or Share" and disclose data use; CPRA expanded this. | oag.ca.gov/privacy/ccpa |
| Canada (CASL) | One of the strictest — generally requires express or implied consent before commercial email. | fightspam.gc.ca |

**Hard rules for every cold message:**
- **Document a lawful basis before adding a contact** (legitimate interest assessment for EU/UK; note the source the data came from). Never email scraped consumer/personal addresses.
- **One-click unsubscribe in every email**, plus a working `List-Unsubscribe` and `List-Unsubscribe-Post` header (RFC 8058). Honor opt-outs immediately and add to a permanent **suppression list** that every future sequence checks.
- **Include a real physical mailing address** (CAN-SPAM) and identify who you are / why you're reaching out (transparency duty under GDPR Art. 14).
- **Suppress** existing customers, open opportunities, competitors, and anyone who previously unsubscribed before any send.
- **Personalize at least one line** with a specific, verifiable observation — generic merge-tag blasts both convert worse and read as spam to filters.

**Deliverability (so touches actually land — 2026 practice):**
- **Authenticate the sending domain**: SPF, DKIM, and a **DMARC** policy with alignment. Google/Yahoo (since 2024) and Microsoft Outlook (rolled out 2025) require this plus one-click unsubscribe for **bulk senders** — those crossing ~5,000 messages/day to that provider — but apply the same hygiene below that threshold. Verify yours at a DMARC checker before any campaign.
- **Use a dedicated/subdomain sender** (e.g. `outreach.yourco.com`), not your primary domain, so a reputation hit doesn't burn your main email.
- **Warm new mailboxes** for 2–4 weeks and cap volume: a fresh inbox should send ~20–40/day ramping up; keep cold volume modest per mailbox/day and split across mailboxes rather than blasting from one.
- **Keep spam complaint rate < 0.1%** (a Gmail/Yahoo enforcement threshold; verify current value at the postmaster docs). Pause and diagnose if bounces or complaints spike.
- Send plain-text-leaning emails, minimal links, no tracking-pixel-heavy templates, no misleading subject lines.

**LinkedIn limits (as of Jun 2026 — verify against current LinkedIn terms, automation tooling is against ToS):**
- Connection requests are rate-limited (LinkedIn has enforced a weekly cap, commonly cited around ~100–200/week and lower for new/free accounts). Treat any hard number as approximate and ramp slowly — over-limit behavior triggers temporary restrictions or bans.
- Don't use unauthorized automation/scraping tools; they risk permanent account loss. Manual, personalized connects + comments only.

**When to STOP outreach (do not keep "nurturing"):**
- They asked to stop, replied "not interested", or unsubscribed → suppress permanently.
- Email hard-bounced → remove the address.
- Out-of-office / "I've left the company" → update CRM, re-route, don't keep emailing that person.
- After the 5-touch sequence with no engagement → move to `Closed-Recycle` and revisit in a quarter at most, not weekly.

**Cold partner outreach (5-touch, 14 days):**

> Every email below assumes the footer carries your physical address + one-click unsubscribe, and the contact has cleared the lawful-basis check above. Keep tone peer-to-peer (partnership, not a sales blast).

```
Touch 1 (Day 0) — Value-first intro
Subject: [Their product] + [Your product] = [specific outcome]

Hi [Name],

[One sentence showing you understand their business].
I think there's a natural fit between [their product] and [yours]
— specifically, [concrete integration/co-marketing idea].

[One sentence on what's in it for them — traffic, revenue, feature gap filled].

Worth a 15-min call to explore?

[Your name]
```

```
Touch 2 (Day 3) — Case study/proof
Subject: Re: [original subject]

Quick follow-up — [similar partnership] drove [specific result]
for [company]. Thought the model could work for us too.

Happy to share the details.
```

```
Touch 3 (Day 7) — LinkedIn engagement
Connect + comment on their recent post with genuine insight.
Then DM: "Sent you an email about [topic] — would love your take."
```

```
Touch 4 (Day 10) — New angle
Subject: Different thought on [their challenge]

Noticed [specific observation about their product/content].
We solved that for [X customers] with [approach].
Could be a co-marketing story worth telling.
```

```
Touch 5 (Day 14) — Breakup
Subject: Closing the loop

Totally understand if timing isn't right.
I'll keep an eye on [their product] — if you ever want
to explore [partnership type], I'm here.
```

### 3. Deal Pipeline

| Stage | Definition | Exit criteria | Default probability | Forecast category |
|-------|-----------|---------------|---------------------|-------------------|
| Identified | Matches partner scoring criteria | Research complete, contact found, lawful basis logged | 5% | Pipeline |
| Outreach | First touch sent | Reply received (positive or neutral) | 10% | Pipeline |
| Discovery | Initial call scheduled/completed | Mutual interest confirmed, use case + champion defined | 25% | Pipeline |
| Proposal | Partnership terms drafted | Both sides reviewed, Legal looped in | 50% | Best Case |
| Negotiation | Terms being finalized | Agreement on commercial + key redlines | 75% | Commit |
| Signed | Contract executed | Integration/campaign kickoff scheduled | 100% | Closed-Won |
| Live | Partnership active | Revenue/metrics being tracked | — | Closed-Won |

Closed-Lost and **Closed-Recycle** (no response / bad timing — revisit next quarter) are terminal stages; `Omitted` forecast category for those. **Calibrate probabilities to your own historical stage→won conversion** rather than trusting these defaults — re-derive quarterly.

**CRM fields to implement (HubSpot deal / Salesforce opportunity / Notion DB).** Map these to a custom "Partnership" pipeline/record type:

| Field | Type | Purpose |
|-------|------|---------|
| `partner_model` | enum: referral / reseller / integration / co-marketing / white-label | Drives expected economics |
| `partner_score` | number (weighted, §1) | Gating: only `> 3.5` should advance past Identified |
| `expected_acv` / `expected_rev_share` | currency | Forecasting; feeds the economics worksheet |
| `stage` + `stage_probability` | enum + % | Weighted-pipeline forecasting |
| `forecast_category` | enum: Pipeline / Best Case / Commit / Closed-Won / Omitted | Roll-up forecasting |
| `next_step` + `next_step_date` | text + date | Stall detection (flag if date is past) |
| `champion` / `economic_buyer` | contact | Multi-threading; never single-threaded into one stage |
| `lawful_basis` / `consent_source` | enum + text | Compliance audit trail (§2) |
| `close_date` (expected) | date | Forecast timing |
| `lost_reason` | enum | Win/loss analysis |
| `mutual_action_plan_url` | url | Link to the MAP (§5b) |

**Stall / exit automation an agent can build:** flag any deal where `next_step_date` is past, or stage age exceeds the typical-duration band; auto-move no-response Outreach deals to Closed-Recycle after the 5-touch sequence (§2).

### 4. Partnership Models

The split ranges below are **typical starting points, not benchmarks** — actual numbers swing widely with deal size, who owns onboarding/support, churn risk, services burden, and region. Use the worksheet that follows to set a defensible number for *your* deal.

| Model | Structure | Best for | Typical split (illustrative) | What moves the number |
|-------|-----------|----------|------------------------------|-----------------------|
| Referral | Send leads, you close & own the customer | Low-touch, high volume | ~10–20% of first-year ACV; sometimes flat bounty | Higher if partner qualifies/warms the lead; lower if it's a raw intro. Decide one-time vs. recurring. |
| Reseller | They sell, bill, and (often) support | Market expansion, new geos | ~20–40% margin to partner | Higher when they own support/localization/billing; lower for pure transactional resale. |
| Integration / tech | Joint product integration | Sticky, long-term retention | Rev-share on jointly-sourced customers, or co-sell with no split | Often no direct split — value is retention + co-sell. Define attribution rules upfront. |
| Co-marketing | Joint content/events | Brand awareness, pipeline | Cost share + lead share, no rev split | Split leads by source; agree who gets the opt-in list. |
| White label | They rebrand and resell as their own | Enterprise, agencies | ~40–60% gross margin retained by you | You keep more when you own infra/R&D; partner keeps more when they own all sales+support+brand. |

**Partner economics worksheet — compute before you commit to a split.** Don't anchor on a range; model the unit economics:

```
Inputs (fill per deal):
  ACV                         = annual contract value of a closed customer ($)
  Gross margin %              = your product gross margin (e.g. 0.80 for 80%)
  Partner share %             = the split you're considering (e.g. 0.20)
  Recurring?                  = does partner share apply year 1 only, or every renewal year?
  Activation rate             = % of partner-sourced leads that become paying customers
  Annual logo churn           = % of those customers lost per year
  Incremental support cost    = $/customer/yr you bear from this channel (support, onboarding)
  Your CAC via this channel   = your cost to enable + co-market per closed deal ($)

Derived:
  Gross profit / customer / yr      = ACV × Gross margin %
  Partner cost / customer (yr 1)    = ACV × Partner share %
  Net margin to you (yr 1)          = Gross profit − Partner cost − Incremental support cost − (CAC amortized)
  Customer lifetime (yrs)           = 1 / Annual logo churn         (e.g. churn 0.20 ⇒ 5 yrs)
  LTV to you                        = Σ over lifetime of (Gross profit − recurring partner cost − support cost)
  Channel LTV:CAC                   = LTV to you / Your CAC via this channel   (aim ≳ 3:1)

Decision rules:
  • If recurring partner share makes multi-year LTV:CAC < 3:1 → cap the share to year 1, or lower %.
  • If partner owns support/onboarding → they justifiably take a larger share (you saved that cost).
  • If activation rate is low/unproven → start with a referral (pay on closed-won) before a margin-heavy reseller deal.
  • Tier the split: higher % above an annual volume threshold to reward producers; floor it for stragglers.
  • Cross-check any number against gross margin — never give away a share that pushes a segment below your target contribution margin.
```

### 5. Partnership Agreement Essentials

> Not legal advice — these are the clauses to *raise with counsel*. Templates from a US perspective; localize for your governing law.

**Commercial terms:**
- Revenue share % / margin and **payment terms** (net 30/60), invoicing cadence, and clawback for refunds/chargebacks.
- **Exclusivity scope** — explicit non-exclusivity by default; if exclusive, bound it by territory, segment, and time, tied to performance minimums.
- **Term, renewal, and termination** — initial term, auto-renew vs. opt-in renewal, termination for cause vs. convenience (30–60 day notice), and a **transition/termination-assistance** clause (data export, customer handoff, wind-down of co-branded assets).
- **Performance minimums / SLAs** (if applicable) and what happens on a miss.

**Data protection & privacy (B2B SaaS, mid-2026):** "GDPR" alone is not enough.
- **Data Processing Agreement (DPA)** defining controller/processor (or joint-controller) roles, processing purposes, and instructions.
- **Subprocessor terms** — disclosure, approval/objection rights, and flow-down obligations.
- **Cross-border transfer mechanism** — EU **Standard Contractual Clauses (SCCs)** + UK **International Data Transfer Addendum (IDTA)**; document transfer impact assessments where required.
- **Multi-regime coverage**: GDPR, **UK GDPR/PECR**, **CCPA/CPRA** (service-provider language, no "sale/share" of personal info), plus any sectoral rules (HIPAA BAA, etc.) the partner's customers trigger.
- **AI / data-use restrictions** — explicitly state whether either party may use shared or customer data to train or fine-tune AI models; default to *no training on the other party's data without separate written consent*. Address model outputs, IP in prompts, and confidentiality of data fed to third-party LLMs.
- **Breach notification** timelines and cooperation duties.

**Risk, liability & security:**
- **Mutual confidentiality / NDA** terms and survival.
- **Security exhibit** — minimum controls (encryption in transit/at rest, access control, SOC 2 / ISO 27001 attestation), **audit rights** or right to request reports, and a vendor security review before go-live.
- **Indemnification** (IP infringement, data breach, gross negligence) — ideally mutual.
- **Limitation of liability** with a stated **cap** (e.g. fees paid in trailing 12 months) and carve-outs (confidentiality, data breach, IP indemnity, willful misconduct) that sit *outside* the cap.
- **Insurance** requirements (cyber, E&O) for larger deals.

**IP, co-selling & attribution:**
- **IP ownership** of background IP vs. **co-created/jointly-developed assets**; license grants for use of each other's marks (trademark usage guidelines).
- **Co-selling rules** — deal registration, lead/opportunity **attribution**, no-poach of each other's customers/employees (where lawful), and conflict resolution for contested deals.
- **Support ownership** — who is L1/L2/L3 for shared customers, response SLAs, and escalation path.
- **Marketing approval** — mutual sign-off on press/case studies and use of logos.

### 5b. Negotiation Playbook

Run every meaningful partnership through this before you're at the table. Goal: a durable deal, not a "won" one.

**1. Prep — know your numbers and your walk-away:**
- **Objectives, ranked**: separate *must-haves* (e.g. non-exclusive, liability cap, no AI-training on our data) from *nice-to-haves* (e.g. logo on their homepage). Write a target / acceptable / walk-away value for each.
- **BATNA** (Best Alternative To a Negotiated Agreement): what you do if this deal dies — another partner, build it yourself, do nothing. A weak BATNA means concede less aggressively and create more value; a strong BATNA means you can hold firm. **Estimate theirs too.**
- **ZOPA**: the overlap between your walk-away and theirs. If there's no overlap on a must-have, the deal isn't there — stop early.
- **Anchor** first on terms where you have data (your worksheet output), and let *them* anchor where you lack information.

**2. Give/Get matrix — trade, never just concede.** For every ask you grant, name what you get back:

| If they push for… | You can give it if… | What you get in return |
|-------------------|---------------------|------------------------|
| Higher revenue share | They commit to a volume minimum or own onboarding/support | Performance floor; tiered step-down at scale |
| Exclusivity | Bounded territory/segment + minimums + shorter term | Guaranteed pipeline; right to terminate on miss |
| Lower price / discount | They sign multi-year or prepay annually | Cash upfront, lower churn, longer term |
| Faster payment to them | They take on first-line support | Reduced your support cost |
| Custom integration work | They co-fund or commit roadmap-driving volume | Reference customer + case study rights |
| Looser AI/data terms | Never on customer data without separate consent | (Hold — this is usually a must-have, not a tradeable) |

**3. Redline priorities (where to actually fight):** liability cap + carve-outs, indemnity scope, data-use/AI-training restrictions, exclusivity, IP ownership of co-created work, termination + transition assistance, auto-renewal. Concede readily on cosmetic items (logo placement, announcement timing). Keep a **concession log** so you never give the same thing twice and can show net give/get at the end.

**4. Approval thresholds (deal desk) — define who can sign off on what *before* negotiating:**

| Term | BD rep can approve | Needs Head of BD | Needs Finance/Legal/Exec |
|------|--------------------|--------------------|--------------------------|
| Revenue share / margin | within standard band | up to +X pts | beyond band |
| Discount | ≤ 10% | ≤ 25% | > 25% |
| Liability cap | standard (12-mo fees) | up to 2× | uncapped / unlimited carve-outs |
| Exclusivity | none | bounded, ≤ 12 mo | broad or > 12 mo |
| Non-standard data/AI terms | none | — | always Legal |
| Custom dev commitments | none | small | material roadmap impact |

**5. Mutual Action Plan (MAP):** co-author a dated plan with the partner — milestones, owners, and dates from term sheet → signature → integration/launch → first joint customer. It surfaces stalls early and signals mutual commitment.

**6. Deal-desk pre-signature checklist:**
- [ ] Partner cleared scoring + economics worksheet (LTV:CAC ≳ 3:1)
- [ ] All must-have terms met; concession log reconciled (net give/get acceptable)
- [ ] Liability cap + carve-outs and indemnity reviewed by Legal
- [ ] DPA/SCCs/security exhibit attached; AI/data-use clause confirmed
- [ ] Attribution + support ownership unambiguous
- [ ] Internal approvals captured per the threshold table
- [ ] Termination + transition-assistance clause present
- [ ] MAP agreed with named owners and dates

### 6. Co-Marketing Playbook

**Joint activities by effort level.** The "reach" column is **purely illustrative** — actual results depend entirely on each party's list size, audience quality, channel, offer, and promotion effort. Do **not** present these as expected results; instead, set targets from *your* partner's real audience (e.g. "registrants ≈ combined relevant list size × historical webinar opt-in rate") and agree how leads are split before launch.

| Effort | Activity | What actually drives the number |
|--------|----------|--------------------------------|
| Low | Guest blog post swap | Each party's organic traffic + how prominently it's featured/linked |
| Low | Social media cross-promotion | Combined relevant follower count × typical engagement rate |
| Medium | Joint webinar | Combined relevant list size × historical opt-in rate; how many emails + reminders each sends |
| Medium | Co-branded ebook/report | Gated-asset conversion on both lists + paid amplification |
| High | Integration launch campaign | Both install bases + PR/launch-day coordination |
| High | Joint conference booth | Event footfall, booth location, and pre-booked meetings — not impressions |

**Lead-sharing rules to agree up front:** who owns the opt-in list, how shared leads are attributed in each CRM, what the follow-up SLA is, and that any contacts exchanged still require their own lawful basis + opt-out (see §2 compliance). For amplifying co-marketing on social, see the `social-media-growth` sibling skill.

### 7. Tracking & Reporting

**Monthly BD dashboard:**
- Pipeline value by stage
- Conversion rate stage-to-stage
- Average deal cycle length
- Revenue from partnerships (direct + influenced)
- Partner satisfaction score (quarterly NPS)

**Per-partner tracking:**
- Leads referred (both directions)
- Revenue generated
- Integration usage (if applicable)
- Support tickets from partner customers
- Co-marketing campaign performance

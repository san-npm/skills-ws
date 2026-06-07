---
name: email-sequence
description: "Lifecycle email sequences — welcome/onboarding/nurture/re-engagement/cart/winback flows, plus deliverability and 2026 bulk-sender compliance (Google/Yahoo/Microsoft: SPF+DKIM+DMARC, RFC 8058 one-click unsubscribe). Use when the user mentions drip campaign, nurture, lifecycle email, email automation, or email deliverability/authentication."
---

# Email Sequences — Expert Playbook

## When to Use This Skill

- Building welcome/onboarding email sequences
- Creating nurture drips for leads
- Designing re-engagement or win-back campaigns
- Cart abandonment recovery flows
- Improving open rates, click rates, or deliverability
- Email automation architecture

---

## Welcome Sequence — 7-Email Template

The welcome sequence is the highest-performing automation you'll build. Average open rates: 50-80% (vs 20-25% for regular emails).

### Email 1: Instant Welcome (Delay: 0 — send immediately)

```
Subject: Welcome to [Product] — here's what happens next
Preview: Your account is ready. Here's your first step.

BODY:
- Thank them for signing up
- Set expectations: what they'll receive and how often
- ONE clear first action (not three, not five — one)
- Link to getting started guide or key feature

CTA: [Take Your First Step]
```

### Email 2: Quick Win (Delay: 1 day)

```
Subject: Do this one thing to get 10x more from [Product]
Preview: Takes 2 minutes. Changes everything.

BODY:
- Identify the single action that correlates with retention
- Step-by-step instructions (3-5 steps max)
- Screenshot or GIF showing the action
- What they'll experience after completing it

CTA: [Complete Setup Now]
```

### Email 3: Social Proof (Delay: 3 days)

```
Subject: How [Customer] achieved [specific result] with [Product]
Preview: They started exactly where you are now.

BODY:
- Brief customer story (problem → solution → result)
- Specific numbers/outcomes
- Connect to a feature they haven't used yet
- "You can do this too" bridge

CTA: [See How They Did It] or [Try This Feature]
```

### Email 4: Overcome Objection (Delay: 5 days)

```
Subject: "I wasn't sure if [Product] was right for me"
Preview: Here's what convinced [X] skeptical users.

BODY:
- Address the #1 objection/hesitation for your product
- Use a testimonial that specifically addresses this doubt
- FAQ-style answers to 2-3 common concerns
- Risk reversal (guarantee, free trial extension, etc.)

CTA: [See Full FAQ] or [Talk to Our Team]
```

### Email 5: Feature Highlight (Delay: 7 days)

```
Subject: You're missing [Product]'s best feature
Preview: Most users don't discover this until month 2.

BODY:
- Highlight an underused but high-value feature
- Show the before/after of using it
- Quick tutorial or video walkthrough
- Connect to a pain point they likely have

CTA: [Try [Feature] Now]
```

### Email 6: Engagement Check (Delay: 10 days)

```
Subject: Quick question about your experience so far
Preview: Hit reply — I read every response.

BODY:
- Personal tone (from founder or head of product)
- Ask one specific question about their experience
- Offer help if they're stuck
- Include a survey link (optional, 1-2 questions max)
- Mention they can reply directly

CTA: [Reply to This Email] or [Take 30-Second Survey]
```

### Email 7: Upgrade/Next Step (Delay: 14 days)

```
Subject: Ready for the next level? Here's what [Plan] unlocks.
Preview: You've outgrown the basics. Time to level up.

BODY:
- Recap value they've gotten so far (use actual data if possible)
- Show what the next tier/plan/commitment unlocks
- Comparison of free vs paid (3-4 key differences)
- Time-limited offer or incentive (optional)
- Clear upgrade path

CTA: [Upgrade Now] or [See Plans]
```

---

## Onboarding Drip Sequence

### Behavioral Triggers

Don't just send on a timer — trigger based on actions:

```
SIGNUP
├── Completed setup?
│   ├── YES → Send "Power user tips" sequence
│   └── NO → Send "Complete your setup" nudge (Day 1, 3, 5)
├── Used key feature?
│   ├── YES → Send "Advanced [feature]" guide
│   └── NO → Send "[Feature] walkthrough" with video
├── Invited team?
│   ├── YES → Send "Team collaboration tips"
│   └── NO → Send "Better with your team" nudge
└── Still active at Day 7?
    ├── YES → Send "What's new" + expansion content
    └── NO → Enter re-engagement sequence
```

### Onboarding Email Workflow (Text Diagram)

```
[Signup] ──→ [Welcome Email] ──→ Wait 1 day
                                      │
                              ┌───────┴───────┐
                              │               │
                        [Setup Done?]    [Setup Not Done]
                              │               │
                      [Power Tips]    [Setup Nudge #1]
                              │               │
                        Wait 2 days     Wait 2 days
                              │               │
                      [Feature Deep     [Setup Nudge #2]
                        Dive]                 │
                              │         Wait 2 days
                        Wait 3 days           │
                              │       ┌───────┴───────┐
                      [Case Study]    │               │
                              │  [Setup Done?]   [Final Nudge +
                        Wait 4 days    │          Offer Help]
                              │  [Power Tips]         │
                      [Upgrade              Wait 5 days
                        Prompt]                  │
                                          [Re-engagement
                                            Sequence]
```

---

## Event-Driven Lifecycle Automation (Implementation)

Timer-based drips are the floor. Production lifecycle messaging fires on **product events** streamed from your app/backend into a lifecycle platform (Customer.io, Braze, Iterable, Loops, Klaviyo). Below is what separates a robust implementation from one that double-sends, spams, or violates consent.

### Event naming & payload

Use a stable, namespaced `object.action` convention in past tense, with a stable identifier and the attributes the message and its filters need:

```jsonc
// POST to your ESP's track API, e.g. customer.io / segment
{
  "userId": "usr_8f3c...",            // stable internal ID, NOT email (emails change)
  "event": "checkout.abandoned",       // namespace.action, past tense, snake or dot case
  "messageId": "evt_2026-06-07_ab12",  // idempotency key — see below
  "timestamp": "2026-06-07T14:22:05Z",
  "properties": {
    "cart_id": "cart_771",
    "cart_value": 128.50,
    "currency": "USD",
    "items": [{ "sku": "SKU-1", "name": "Widget", "qty": 1 }],
    "locale": "en-GB",
    "marketing_consent": true          // carry consent so a journey can hard-gate on it
  }
}
```

Canonical lifecycle events worth instrumenting: `user.signed_up`, `email.verified`, `onboarding.step_completed`, `activation.key_action` (the one action correlated with retention), `trial.started` / `trial.ending` / `trial.expired`, `checkout.started` / `checkout.abandoned` / `order.placed`, `subscription.renewed` / `payment.failed` / `subscription.canceled`, `feature.adopted`, `session.inactive_30d`.

### Idempotent sends (don't double-fire)

Webhooks and queues retry; clients fire events twice. Without protection a flaky retry sends the same "abandoned cart" email three times.

- **Idempotency key per send:** derive a deterministic key (e.g. `userId + journey + cart_id`) and have the platform/your worker dedupe on it. Most ESP transactional APIs accept an `Idempotency-Key` header — use it.
- **Cancel/exit conditions:** the abandoned-cart journey MUST listen for `order.placed` and exit immediately, or you'll email "you forgot something!" to someone who just bought it. Define an explicit exit event for every triggered journey.
- **Re-entry guard:** prevent re-entering the same journey for N days (e.g. one cart-recovery series per cart, or per 7 days per user).

### Suppression & frequency caps

- **Global suppression list:** hard bounces, unsubscribes, spam complainers, and role/blocklisted addresses are suppressed across *all* sends — including from other tools. Sync it everywhere.
- **Frequency cap:** e.g. "max 1 marketing email / 24h and 4 / 7 days per user." Transactional mail (receipts, password resets, security) bypasses caps; promotional mail respects them.
- **Quiet hours / time-zone send:** suppress promotional sends 9pm–8am local; let transactional through.
- **Consent gate:** marketing journeys check `marketing_consent == true` at send time, not just at enrollment (consent can be withdrawn mid-journey — honor it live).
- **Cross-journey priority:** if a user qualifies for two journeys at once (e.g. cart recovery + weekly digest), define which wins so they don't get both in the same hour.

### Preference center (vs. single unsubscribe)

Offer granular opt-down, not just all-or-nothing — it cuts hard unsubscribes and spam complaints:

```
[ ] Product updates & new features      (weekly)
[ ] Tips & best practices               (biweekly)
[ ] Promotions & offers                 (occasional)
[ ] Account & billing  (transactional — cannot be turned off)
[ Unsubscribe from all marketing ]   ← must still exist and be honored
```

Persist preferences against the stable user ID; the RFC 8058 one-click header still unsubscribes globally from marketing regardless of the granular center.

### QA test cases before enabling any journey

- [ ] Trigger fires on the real event in staging (open *Show original* in Gmail; confirm SPF/DKIM/DMARC pass)
- [ ] Exit/cancel event removes the user mid-journey (e.g. purchase cancels cart series)
- [ ] Duplicate event within the dedupe window sends **once**, not twice
- [ ] User with `marketing_consent=false` (and suppressed users) receive **nothing**
- [ ] Frequency cap blocks the Nth send when another journey already sent today
- [ ] All merge tags render with real data AND degrade gracefully when a field is missing (no "Hi {{first_name}}")
- [ ] Time-zone/quiet-hours logic delays correctly for a non-UTC test user
- [ ] One-click unsubscribe POST actually suppresses and returns 200 without a login
- [ ] Links use the custom tracking domain and resolve; no broken/`localhost` URLs

---

## Re-Engagement Campaign

### 3-Email Win-Back Sequence

**Trigger:** No login/activity for 30 days

**Email 1: "We miss you" (Day 30)**
```
Subject: It's been a while, [Name]
Preview: Here's what you're missing.

- Acknowledge absence without guilt
- Show 2-3 new features/updates since they left
- Single clear CTA to come back

Subject alternatives:
- "[Name], your [Product] account is waiting"
- "A lot has changed since you left"
```

**Email 2: "Here's what's new" (Day 37)**
```
Subject: [Product] just got a major upgrade
Preview: New features you haven't seen yet.

- Lead with the most compelling new feature
- Include a short demo video or GIF
- Social proof — "Join X users who are already using this"
- Offer: extended trial, discount, or free consultation
```

**Email 3: "Last chance" (Day 45)**
```
Subject: Should we close your [Product] account?
Preview: We'll keep it open if you want — just let us know.

- Direct question: "Do you still want access?"
- Remind them what they'll lose
- One-click "keep my account" button
- Option to downgrade instead of churning
- If no response → mark as churned, suppress from sequences
```

> **Truthfulness note:** Only use "Should we close your account?" if there is a real consequence (e.g., you actually deactivate or stop emailing dormant accounts). An empty threat you never act on is misleading and erodes trust on repeat sends. If you don't enforce it, soften to "Want to keep getting [Product] updates?" — which doubles as a clean re-consent / sunset prompt.

---

## Cart Abandonment Sequence

### 3-Email Recovery Flow

**Email 1: Reminder (1 hour after abandonment)**
```
Subject: You left something behind
Preview: Your cart is saved — complete your order.

- Show cart contents with images
- Simple "Complete Purchase" CTA
- No discount yet — many convert with just a reminder
- Include customer support link
```

**Email 2: Social Proof (24 hours)**
```
Subject: [Product] is a customer favorite ⭐
Preview: See why X people chose [Product] this month.

- Cart contents again
- 2-3 customer reviews of the specific product
- Answer common purchase objections
- Urgency: "Items in your cart aren't reserved"
```

**Email 3: Incentive (48-72 hours)**
```
Subject: Here's 10% off to complete your order
Preview: Use code COMEBACK10 at checkout.

- Cart contents with discount applied
- Discount code prominently displayed
- Expiration on the offer (48 hours)
- "Need help deciding? Reply to this email"
```

**Recovery benchmarks:** Email 1 recovers 3-5% of carts, Email 2 adds 2-3%, Email 3 adds 1-2%. Total: 6-10% recovery rate.

---

## Subject Line Formulas (25+)

### Curiosity

1. `The [adjective] reason your [thing] isn't [desired outcome]`
2. `I was wrong about [topic]`
3. `The [thing] nobody talks about`
4. `What [impressive person/company] knows that you don't`
5. `Stop doing [common practice] (here's why)`

### Benefit-Driven

6. `How to [achieve outcome] in [timeframe]`
7. `[Number] ways to [benefit] without [pain]`
8. `The fastest way to [desired outcome]`
9. `Get [specific result] — no [common objection] required`
10. `Your [time period] plan for [outcome]`

### Social Proof

11. `How [customer] went from [before] to [after]`
12. `[Number] [people/companies] can't be wrong`
13. `"[Short testimonial quote]" — [Customer Name]`
14. `Why [respected company] switched to [Product]`

### Urgency/Scarcity

15. `[Offer] expires at midnight`
16. `Last chance: [specific benefit]`
17. `Only [X] spots left for [thing]`
18. `[Hours/Days] left to claim [offer]`

### Personal/Conversational

19. `Quick question about [their goal]`
20. `[Name], can I be honest with you?`
21. `This made me think of you`
22. `Re: your [product/goal]` (deception risk — only legitimate if it references a real prior thread; faking a reply to a conversation that never happened can violate CAN-SPAM's "not misleading" rule and torches trust. Prefer the honest variants.)
23. `I noticed you [action they took]` (only if you actually have that behavioral data — never fabricate an action the recipient didn't take)

> **Guardrail:** Subject lines must be truthful and not misleading (CAN-SPAM §5(a)(2), and a recurring trigger for spam complaints under Google/Yahoo's <0.3% threshold). Fake "Re:"/"Fwd:" prefixes, false urgency, and invented personalization ("I saw you did X") are the fastest way to tank sender reputation. Curiosity is fine; deception is not.

### Number/List

24. `[Number] [things] I wish I knew about [topic]`
25. `The [number]-minute fix for [problem]`
26. `[Number] mistakes killing your [metric]`
27. `[Number] tools for [outcome] (I use #[X])`

### Subject Line Best Practices

- **Length:** 30-50 characters (6-10 words) for best open rates
- **Mobile preview:** First 30 chars must hook — most people read on phones
- **Personalization:** [Name] in subject line lifts opens 10-20% (don't overuse)
- **Emojis:** One emoji can boost opens 5-10%. Two or more looks spammy
- **Avoid spam triggers:** FREE (all caps), !!!, $$$, "Act now", "Limited time"
- **A/B test:** Always test 2 subject lines. Send winner to remaining 80%

---

## Preview Text Optimization

Preview text is the most underutilized email real estate. It appears after the subject line on mobile and desktop.

### Rules

- **Length:** 40-130 characters (varies by client, front-load the good stuff)
- **Don't repeat** the subject line
- **Complement** the subject — expand, add context, or create a 1-2 punch
- **Avoid** the dreaded "View this email in your browser" default

### Formula: Subject + Preview = Complete Thought

```
Subject: Your cart is waiting
Preview: Plus, free shipping if you order today →

Subject: 5 mistakes killing your conversion rate
Preview: #3 cost us $47K last quarter.

Subject: Welcome to [Product]
Preview: Here's your first step (takes 2 min).

Subject: Quick question, [Name]
Preview: Hit reply — I read every one.
```

### Implementation

```html
<!-- Hidden preview text -->
<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;
max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
  Your preview text here.
  <!-- Pad with whitespace to prevent body text from showing -->
  &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  <!-- Repeat ~100 times -->
</div>
```

---

## Send Time Optimization

### General Benchmarks

| Day | Open Rate | Best For |
|-----|-----------|----------|
| Tuesday | Highest | B2B newsletters, product updates |
| Wednesday | High | B2B, educational content |
| Thursday | High | B2B, promotional |
| Monday | Medium | Weekly digests, fresh-start content |
| Friday | Lower | Casual content, weekend prep |
| Weekend | Lowest (B2B) / OK (B2C) | B2C promotions, lifestyle |

| Time (Recipient's TZ) | Best For |
|------------------------|----------|
| 6:00-7:00 AM | Early readers, commuters |
| 9:00-10:00 AM | B2B desktop readers, start-of-day |
| 12:00-1:00 PM | Lunch break readers (B2C especially) |
| 5:00-6:00 PM | End-of-day, commute home |
| 8:00-9:00 PM | B2C evening browsing |

### Real Optimization Strategy

1. **Start with benchmarks** above
2. **A/B test send times** — test 2-hour windows against each other
3. **Use send-time optimization** if your ESP offers it (Mailchimp, Klaviyo, etc.)
4. **Segment by timezone** — don't send at 10 AM EST to someone in PST (that's 7 AM)
5. **Check your own data** — your audience may defy benchmarks

---

## Deliverability Checklist

### Email Authentication Setup

#### SPF (Sender Policy Framework)

Pick the ONE include that matches your actual sending provider. Do not paste all of these.

```dns
; Add to your domain's DNS as a TXT record. Use exactly ONE SPF record.
; --- Pick the include(s) for the ESP(s) you actually send through: ---
; Google Workspace:   v=spf1 include:_spf.google.com ~all
; SendGrid:           v=spf1 include:sendgrid.net ~all
; Mailchimp/Mandrill: v=spf1 include:servers.mcsv.net ~all
; Amazon SES:         v=spf1 include:amazonses.com ~all
; Postmark:           v=spf1 include:spf.mtasv.net ~all
; Resend:             v=spf1 include:_spf.resend.com ~all

; CRITICAL RULES:
; - Exactly ONE SPF (v=spf1) TXT record per domain. Two SPF records = PermError = auth fails.
; - Hard cap of 10 DNS lookups across the WHOLE record (each include:/a/mx/redirect counts).
;   Stacking 4+ ESP includes (Google + SendGrid + Mailchimp + ...) commonly blows the limit
;   and silently breaks SPF. Audit with kitterman.com/spf/validate.html or dmarcian's tool.
; - Don't have one apex SPF for every product. Send each ESP from its OWN subdomain
;   (e.g. mail.yourdomain.com for marketing, txn.yourdomain.com for transactional), each with
;   its own single-include SPF + DKIM. This isolates reputation and dodges the 10-lookup ceiling.
; - SPF "flattening" (inlining IPs to save lookups) is a last resort — IPs drift, so only
;   automate it with a tool that re-flattens, never hand-maintain.
; - Use ~all (softfail) while validating; switch to -all (hardfail) once mail is confirmed aligned.
```

> Note: SPF alone does NOT survive forwarding and is NOT sufficient for DMARC alignment if your From domain differs from the envelope/Return-Path. DKIM is the more durable signal — configure both.

#### DKIM (DomainKeys Identified Mail)

```dns
; Your ESP provides the DKIM record. Add as CNAME or TXT:
selector1._domainkey.yourdomain.com → CNAME → provided-by-esp.dkim.example.com

; OR as TXT record:
selector1._domainkey.yourdomain.com  TXT  "v=DKIM1; k=rsa; p=MIGfMA0GCS..."

; Key points:
; - 2048-bit keys minimum
; - Rotate keys annually
; - Each ESP needs its own DKIM selector
```

#### DMARC (Domain-based Message Authentication)

```dns
; Start with monitoring mode:
_dmarc.yourdomain.com  TXT  "v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com; pct=100"

; After reviewing reports (2-4 weeks), move to quarantine:
_dmarc.yourdomain.com  TXT  "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com; pct=100"

; When confident, enforce:
_dmarc.yourdomain.com  TXT  "v=DMARC1; p=reject; rua=mailto:dmarc@yourdomain.com; pct=100"

; Migration path: none → quarantine → reject (over 4-8 weeks)
; Do NOT jump straight to p=quarantine/reject: until your rua aggregate reports show
; SPF/DKIM aligned for ~100% of legitimate mail, enforcement will silently junk your own email
; (forms, invoices, ESP, support tooling). Stage it after the reports are clean.
```

---

### 2026 Bulk-Sender Compliance (Google / Yahoo / Microsoft / Apple)

Google and Yahoo's bulk-sender rules took effect Feb 2024 and enforcement has only tightened since (Microsoft/Outlook.com began phasing in equivalent requirements for high-volume senders in 2025). **"Bulk sender" = roughly 5,000+ messages/day to a given provider's domains**, but treat these as table-stakes hygiene for ANY commercial sending — failing them lands you in spam regardless of volume.

**Mandatory for bulk senders (all of these, not pick-one):**

| Requirement | What it means in practice |
|---|---|
| **Authenticate with SPF *and* DKIM** | Both must pass. DKIM is the one that survives forwarding — never ship DKIM-less bulk mail. |
| **DMARC record published** | Minimum is a valid `p=none` policy on your From domain. You do NOT need quarantine/reject to be compliant — `p=none` with aggregate reporting satisfies the rule. Move to enforcement later, after alignment is clean. |
| **From-domain alignment** | The From: domain must align (relaxed is fine) with the SPF or DKIM domain. No more sending "From: you@yourbrand.com" via an unaligned ESP envelope. |
| **One-click unsubscribe (RFC 8058)** | Commercial/bulk mail MUST include both `List-Unsubscribe` AND `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers, and honor the resulting POST without making the user log in or click through extra pages. This is a hard requirement, not optional. (See header example below.) |
| **Visible unsubscribe in the body** | A clearly visible, working unsubscribe link in the message body, in addition to the header. |
| **Process unsubscribes within 2 days** | Google/Yahoo require honoring opt-outs **within 48 hours** — far stricter than CAN-SPAM's 10 days. Build for near-real-time suppression. |
| **Spam complaint rate under threshold** | Keep complaints **below 0.3%** (measured in Google Postmaster Tools); **aim to stay under 0.1%**. Spikes above 0.3% get you throttled or blocked. |
| **No spoofing / valid PTR** | Sending IPs need valid forward and reverse DNS (PTR), and you must not impersonate Gmail/Yahoo From addresses. |
| **TLS for transport** | Use TLS for outbound connections (every reputable ESP does this by default). |

**RFC 8058 one-click unsubscribe headers** — your ESP usually injects these, but verify they're present and that the POST endpoint actually suppresses:

```
List-Unsubscribe: <https://yourdomain.com/unsub?u=USER_ID&c=CAMPAIGN_ID>, <mailto:unsub@yourdomain.com?subject=unsubscribe>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

When a mailbox provider's "Unsubscribe" UI button is clicked, the provider sends an HTTP `POST` (body `List-Unsubscribe=One-Click`) to your HTTPS URL. Your endpoint MUST suppress the recipient immediately and return 200 — no login, no confirmation page, no "are you sure?". A `List-Unsubscribe` header pointing only to a landing page that requires extra clicks does **not** satisfy RFC 8058.

> Apple Mail respects `List-Unsubscribe` and surfaces a native unsubscribe affordance too; Apple MPP (below) separately distorts open metrics. The same headers cover Apple — no extra work.

**Quick self-audit:** send a test to a Gmail account, open *Show original*, and confirm `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`, and that both List-Unsubscribe headers are present. Then enroll the domain in **Google Postmaster Tools** and **Yahoo Sender Hub** to watch complaint rate, spam rate, and domain/IP reputation over time.

---

### Legal & Consent Requirements (by jurisdiction)

Authentication gets you to the inbox; **consent law governs whether you're allowed to send at all.** Marketing email ≠ transactional email — most of these regimes only restrict *marketing/commercial* messages.

| Law / Region | Consent model | Key obligations |
|---|---|---|
| **CAN-SPAM (US)** | Opt-out | Truthful headers & subject; valid physical postal address in every email; clear unsubscribe honored within 10 days (but honor in ≤2 days for bulk per provider rules above). No prior consent legally required, but it's best practice. |
| **GDPR + ePrivacy (EU/EEA)** | Opt-in | Freely-given, specific, informed consent before marketing email (narrow "soft opt-in" exists for existing customers re: similar products). Log proof of consent; honor withdrawal as easily as it was given; respect data-subject/erasure requests. |
| **PECR (UK)** | Opt-in | UK equivalent of ePrivacy; same soft opt-in carve-out for existing customers. Pairs with UK GDPR. |
| **CASL (Canada)** | Opt-in (express or implied) | Among the strictest: express or qualifying implied consent required; sender identification; functioning unsubscribe honored within 10 business days; keep consent records. Penalties are steep. |
| **Australia (Spam Act)** | Opt-in (express or inferred) | Consent + clear sender ID + working unsubscribe honored within 5 business days. |

**Transactional vs. marketing — the critical boundary:** Transactional/relationship messages (password resets, receipts, shipping, security alerts, account notices) are exempt from most consent rules and from CAN-SPAM's unsubscribe requirement. But the moment you add a promotional CTA, cross-sell, or "while you're here, upgrade" block, the email becomes *commercial* and the full marketing rules apply. **Keep transactional and marketing on separate sending subdomains/streams** (e.g., Postmark/SES for transactional, Klaviyo/Kit for marketing) so a marketing reputation problem never blocks password resets — and so you don't accidentally strip required marketing disclosures from genuine transactional mail.

> This is general guidance, not legal advice. Consent law varies by jurisdiction and changes; confirm your specific obligations with qualified counsel before launching to a new region.

### Full Deliverability Checklist

**Authentication (2026 bulk-sender minimum):**
- [ ] SPF record configured, single record, under 10 DNS lookups (check: mxtoolbox.com/spf.aspx)
- [ ] DKIM configured for all sending sources (2048-bit), passes on every stream
- [ ] DMARC record present at **minimum `p=none`** with `rua=` aggregate reporting; move to `quarantine`/`reject` only after reports show ~100% alignment — do not enforce blind
- [ ] From-domain aligns (relaxed OK) with the SPF or DKIM domain
- [ ] Return-Path/envelope sender aligned with From domain
- [ ] `List-Unsubscribe` **and** `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers present (RFC 8058), and the POST endpoint suppresses without login

**Infrastructure:**
- [ ] Dedicated sending IP (if volume >100K/month) or shared IP with good reputation
- [ ] IP warmed up properly (start with engaged users, increase volume 20-30%/day)
- [ ] Custom tracking domain (clicks/opens) — not the ESP default
- [ ] HTTPS on tracking domain

**List Hygiene:**
- [ ] Double opt-in enabled (or confirmed opt-in)
- [ ] Bounce management: remove hard bounces immediately
- [ ] Soft bounces: retry 3x, then remove
- [ ] Remove unengaged subscribers after 90 days of no opens/clicks
- [ ] Process unsubscribes within **48 hours** (Google/Yahoo bulk-sender rule; CAN-SPAM allows 10 days but providers require 2 — build for near-real-time suppression)
- [ ] Never purchase email lists — ever
- [ ] Run list through verification service before importing (NeverBounce, ZeroBounce)

**Content:**
- [ ] Text-to-image ratio: at least 60% text, 40% images
- [ ] Alt text on all images
- [ ] Unsubscribe link visible and functional
- [ ] Physical mailing address included (CAN-SPAM requirement)
- [ ] Avoid spam trigger words in subject lines
- [ ] No URL shorteners (bit.ly etc.) — flagged as suspicious
- [ ] Test with mail-tester.com before large sends (aim for 9+/10)

**Monitoring:**
- [ ] Enrolled in Google Postmaster Tools, Yahoo Sender Hub, and (for Outlook volume) Microsoft SNDS/JMRP
- [ ] Track inbox placement rate (not just delivery rate)
- [ ] Set up alerts for bounce rate >2% and **spam complaints — keep under 0.3% (Google/Yahoo hard ceiling), target <0.1%**
- [ ] Review DMARC aggregate (rua) reports monthly; confirm alignment before tightening policy

---

## Segmentation Strategies

### Essential Segments

| Segment | Definition | Use For |
|---------|-----------|---------|
| New subscribers | Joined in last 14 days | Welcome sequence |
| Active users | Opened/clicked in last 30 days | Product updates, feature launches |
| Power users | Use product daily, high engagement | Beta access, referral asks, upsell |
| At-risk | No activity in 30-60 days | Re-engagement sequence |
| Churned | No activity in 60+ days | Win-back offer, then suppress |
| Free users | On free plan | Upgrade sequences |
| Paid users | On paid plan | Expansion, retention, loyalty |
| Trial users | In active trial | Activation sequence |

### Advanced Segmentation

**By behavior:**
- Features used/not used → targeted feature education
- Purchase history → cross-sell/upsell recommendations
- Content consumed → more of what they like
- Support tickets filed → proactive help content

**By source:**
- Organic search → education-heavy sequences
- Paid ads → faster path to conversion
- Referral → social proof, community content
- Product Hunt / launch → product-focused onboarding

**By engagement level:**
```
HOT (opened last 3 emails, clicked last 1)
→ Full email frequency, promotional content OK

WARM (opened 1 of last 5 emails)
→ Reduce frequency, high-value content only

COLD (no opens in last 10 emails)
→ Re-engagement sequence, then suppress

ICE COLD (no opens in 90+ days)
→ One final "should we remove you?" email, then suppress
```

### Segmentation Automation Workflow

```
[New Subscriber]
├── Tag: source={utm_source}
├── Tag: plan={free|trial|paid}
├── Enter: Welcome Sequence
│
├── [Day 7] Evaluate engagement
│   ├── Opened 3+ emails → Tag: engaged
│   ├── Opened 1-2 → Tag: warm
│   └── Opened 0 → Tag: cold → Re-engagement
│
├── [Day 14] Evaluate product usage
│   ├── Used key feature → Tag: activated
│   ├── Logged in only → Tag: exploring
│   └── Never logged in → Tag: inactive → Nudge sequence
│
└── [Day 30] Evaluate conversion
    ├── Upgraded → Tag: customer → Customer sequence
    ├── Active free user → Tag: potential → Upgrade sequence
    └── Inactive → Tag: at-risk → Win-back sequence
```

---

## Metrics Benchmarks by Industry

> **Read this before trusting open rates.** Since Apple Mail Privacy Protection (MPP) — now the behavior for a large share of opens — Apple pre-fetches images and fires a "machine open" whether or not the human ever sees the email. **Open rate is no longer a reliable signal of engagement or deliverability.** Treat the open-rate numbers below as rough, directional, and inflated; optimize on **click rate, click-to-open on non-Apple cohorts, conversions, revenue per email, and inbox-placement rate** instead. The ranges below are directional rules of thumb as of mid-2026, not a live benchmark feed — pull your own ESP's current industry report for decisions.

### Open Rates (directional only — MPP-inflated)

| Industry | Average | Good | Great |
|----------|---------|------|-------|
| SaaS/Technology | 20-25% | 30% | 40%+ |
| Ecommerce | 15-20% | 25% | 35%+ |
| B2B Services | 20-25% | 30% | 40%+ |
| Education | 25-30% | 35% | 45%+ |
| Healthcare | 20-25% | 30% | 40%+ |
| Finance | 20-25% | 28% | 35%+ |
| Media/Publishing | 20-25% | 30% | 40%+ |
| Nonprofit | 25-30% | 35% | 45%+ |

**Note:** As above, Apple MPP inflates these open numbers (commonly cited at ~10-30%+ depending on audience mix). Use click rate, conversions, and revenue as your real KPIs.

### Click Rates

| Industry | Average | Good | Great |
|----------|---------|------|-------|
| SaaS/Technology | 2-3% | 4% | 6%+ |
| Ecommerce | 2-3% | 4% | 5%+ |
| B2B Services | 2-3% | 4% | 6%+ |
| Education | 3-4% | 5% | 7%+ |
| Media/Publishing | 3-5% | 6% | 8%+ |

### Other Key Metrics

| Metric | Healthy Range | Action If Below |
|--------|--------------|-----------------|
| Bounce rate | <2% | Clean list, verify new signups |
| Unsubscribe rate | <0.5% per send | Check frequency, relevance, segmentation |
| Spam complaint rate | <0.1% | Improve opt-in, add easy unsubscribe, check content |
| List growth rate | >2%/month | Improve lead gen, add more signup touchpoints |
| Revenue per email | Track over time | Optimize CTAs, segmentation, offers |

### Automation-Specific Benchmarks

| Sequence Type | Expected Open Rate | Expected Click Rate | Expected Conv Rate |
|--------------|-------------------|--------------------|--------------------|
| Welcome | 50-80% | 10-15% | 5-10% |
| Cart abandonment | 40-50% | 8-12% | 3-5% |
| Re-engagement | 15-25% | 2-4% | 1-2% |
| Onboarding | 40-60% | 8-12% | Varies |
| Post-purchase | 40-50% | 5-8% | 2-3% (repeat) |

---

## Email Copy Best Practices

### Structure

```
FROM: Real person name + company (not "noreply@")
SUBJECT: [Hook — 6-10 words]
PREVIEW: [Expand/complement subject — 40-90 chars]

BODY:
Opening line — hook them in 1 sentence. No "Hope this finds you well."

2-3 short paragraphs OR bullet list. One idea per paragraph.
Max 200 words for transactional/automated emails.
Max 500 words for newsletters.

Single, clear CTA. Not three different links going to three different places.

Sign-off — personal name, not "The [Company] Team"
```

### What NOT to Do

- Don't open with "Hey there!" or "Dear Valued Customer"
- Don't use multiple CTAs competing with each other
- Don't send from noreply@ (kills replies and trust)
- Don't use tiny font or light gray text
- Don't hide unsubscribe link
- Don't send the same email to your entire list
- Don't use "Click here" as CTA text — be specific
- Don't over-design — plain text often outperforms HTML for B2B

---

## ESP / Lifecycle Platform Selection Guide

Pricing changes constantly and is usually metered by contacts, sends, monthly active profiles, or message volume — **verify current pricing on each vendor's page before committing** (links below). Choose by capability and data model, not list price.

| Platform | Category | Best for | Pricing model (verify current) |
|---|---|---|---|
| **Kit** (formerly ConvertKit) | Marketing | Creators, newsletters, course sellers | Contact-based; free starter tier — [kit.com/pricing](https://kit.com/pricing) |
| **Mailchimp** | Marketing | Small business getting started | Contact-based tiers — [mailchimp.com/pricing](https://mailchimp.com/pricing) |
| **Klaviyo** | Marketing + light CDP | Ecommerce (deep Shopify, revenue attribution) | Contact + SMS volume — [klaviyo.com/pricing](https://www.klaviyo.com/pricing) |
| **Customer.io** | Lifecycle (event-based) | SaaS behavioral automation, product-data triggers | Profiles/messages — [customer.io/pricing](https://customer.io/pricing) |
| **Loops** | Lifecycle | Modern SaaS, simple event flows | Contact-based — [loops.so/pricing](https://loops.so/pricing) |
| **Braze** | Enterprise lifecycle/CDP | Cross-channel (email+push+in-app) at scale | Custom/MAU — [braze.com](https://www.braze.com) |
| **Iterable** | Enterprise lifecycle/CDP | Cross-channel orchestration, large teams | Custom — [iterable.com](https://iterable.com) |
| **ActiveCampaign** | Marketing + CRM | SMB with sales-CRM needs | Contact tiers — [activecampaign.com/pricing](https://www.activecampaign.com/pricing) |
| **HubSpot** | Full marketing suite + CRM | Teams wanting marketing+sales+CRM in one | Contact + seat — [hubspot.com/pricing](https://www.hubspot.com/pricing) |
| **Postmark** | Transactional (delivery API) | Fast, reliable transactional email | Per-message volume — [postmarkapp.com/pricing](https://postmarkapp.com/pricing) |
| **Resend** | Transactional (dev-first) | Modern dev teams, React Email | Per-message volume — [resend.com/pricing](https://resend.com/pricing) |
| **Amazon SES** | Transactional/bulk (infra) | High-volume, lowest cost-per-email, you build the layer | Per-message — [aws.amazon.com/ses/pricing](https://aws.amazon.com/ses/pricing) |
| **Beehiiv** | Newsletter/media | Newsletter monetization & growth | Subscriber tiers — [beehiiv.com/pricing](https://www.beehiiv.com/pricing) |

> Marketing platforms (Kit, Klaviyo, Mailchimp, HubSpot…) optimize for campaigns, segments, and broadcast. **Lifecycle/CDP platforms** (Customer.io, Braze, Iterable, Loops) optimize for *event-triggered* journeys keyed on product behavior — see the event-driven automation section above. **Transactional senders** (Postmark, Resend, SES) optimize purely for inbox speed/reliability of system mail. Most mature stacks run a transactional sender *and* a marketing/lifecycle platform on separate subdomains.

### Decision Framework

- **Ecommerce:** Klaviyo (deep Shopify integration, revenue attribution)
- **SaaS, event-driven:** Customer.io or Loops (behavioral triggers on product data); Braze/Iterable when you need email+push+in-app at scale
- **Creator/Newsletter:** Kit or Beehiiv
- **Enterprise cross-channel:** Braze, Iterable, or HubSpot
- **Transactional only:** Postmark or Resend for best deliverability; Amazon SES when cost-per-email at high volume dominates
- **Budget-conscious starting out:** Mailchimp or Kit free tier

---

## Quick-Start Implementation

### Step 1: Foundation (Week 1)
1. Choose ESP and set up account
2. Configure SPF, DKIM, DMARC
3. Set up custom sending domain
4. Import existing contacts (verified/cleaned)
5. Create unsubscribe and preference center pages

### Step 2: Welcome Sequence (Week 2)
1. Write 7 welcome emails using templates above
2. Set up automation trigger: new subscriber
3. Add behavioral branches if your ESP supports it
4. Test entire flow with a personal email
5. Enable and monitor for 2 weeks

### Step 3: Core Automations (Week 3-4)
1. Cart abandonment (if ecommerce)
2. Onboarding sequence (if SaaS)
3. Re-engagement sequence (30-day inactive trigger)
4. Post-purchase/post-conversion thank you

### Step 4: Optimize (Ongoing)
1. A/B test subject lines on every send
2. Review metrics weekly
3. Clean list monthly (remove bounces, suppress cold)
4. Refresh copy quarterly
5. Test send times monthly

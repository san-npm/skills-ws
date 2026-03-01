---
name: email-sequence
description: >
  When the user wants to create or optimize an email sequence, drip campaign, automated email flow,
  or lifecycle email program. Also use when the user mentions 'email sequence,' 'drip campaign,'
  'nurture sequence,' 'onboarding emails,' 'welcome sequence,' 're-engagement emails,' 'email
  automation,' or 'lifecycle emails.' For in-app onboarding, see onboarding-cro.
version: 2.0.0
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
22. `Re: your [product/goal]` (use sparingly — can feel spammy)
23. `I noticed you [action they took]`

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

```dns
; Add to your domain's DNS as a TXT record
v=spf1 include:_spf.google.com include:sendgrid.net include:mailchimp.com ~all

; Rules:
; - Only ONE SPF record per domain
; - Max 10 DNS lookups (include: counts as a lookup)
; - Use ~all (softfail) during testing, -all (hardfail) in production
; - Add all services that send email on your behalf
```

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
```

### Full Deliverability Checklist

**Authentication:**
- [ ] SPF record configured and valid (check: mxtoolbox.com/spf.aspx)
- [ ] DKIM configured for all sending sources
- [ ] DMARC set to at least `p=quarantine`
- [ ] Return-Path/envelope sender aligned with From domain

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
- [ ] Process unsubscribes within 24 hours (CAN-SPAM requires 10 days max)
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
- [ ] Monitor sender reputation (Google Postmaster Tools, sender score)
- [ ] Track inbox placement rate (not just delivery rate)
- [ ] Set up alerts for bounce rate >2%, spam complaints >0.1%
- [ ] Review DMARC reports monthly

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

### Open Rates

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

**Note:** Apple MPP (Mail Privacy Protection) inflates open rates by 15-30%. Track click rates as the more reliable metric.

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

## ESP Selection Guide

| ESP | Best For | Price Range |
|-----|----------|-------------|
| ConvertKit | Creators, newsletters | Free to $29+/mo |
| Mailchimp | Small business, starting out | Free to $350+/mo |
| Klaviyo | Ecommerce (Shopify especially) | Free to $150+/mo |
| Customer.io | SaaS, behavioral automation | $100+/mo |
| ActiveCampaign | SMB with CRM needs | $29+/mo |
| Postmark | Transactional email (deliverability) | $15+/mo |
| SendGrid | Developer-first, high volume | Free to $90+/mo |
| HubSpot | Full marketing suite ($$) | Free to $800+/mo |
| Loops | Modern SaaS email | $49+/mo |
| Resend | Developer-first, modern | Free to $20+/mo |

### Decision Framework

- **Ecommerce:** Klaviyo (deep Shopify integration, revenue attribution)
- **SaaS:** Customer.io or Loops (event-based triggers, product data)
- **Creator/Newsletter:** ConvertKit or Beehiiv
- **Enterprise:** HubSpot, Marketo, or Iterable
- **Transactional only:** Postmark or Resend (best deliverability)
- **Budget-conscious:** Mailchimp free tier or SendGrid

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

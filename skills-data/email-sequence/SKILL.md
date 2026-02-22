---
name: email-sequence
description: "Email drip campaigns, lifecycle emails, subject line optimization, deliverability best practices, segmentation, automation triggers. Welcome, onboarding, re-engagement, abandoned cart, win-back, nurture sequences. Use when creating email sequences, writing marketing emails, optimizing subject lines, improving email deliverability, building automation workflows, or designing lifecycle email programs."
---

# Email Sequence v2

## Sequence Design

### 1. Define the Sequence

Every sequence needs:
- **Trigger**: What action starts the sequence (signup, purchase, inactivity)
- **Goal**: One clear objective (activate, convert, retain, re-engage)
- **Length**: 3-7 emails typically
- **Cadence**: Days between emails (vary by urgency)
- **Exit condition**: What stops the sequence (conversion, unsubscribe, another trigger)

### 2. Email Structure

Every email follows:
```
Subject Line (30-50 chars, mobile-friendly)
Preview Text (40-90 chars, complements subject)
---
Opening Line (personal, specific, no "I hope this finds you well")
Body (one idea per email, scannable, short paragraphs)
CTA (one primary action, button or link)
P.S. (optional — high readability, good for secondary CTA)
```

### 3. Subject Line Optimization

Formulas:
- Question: "Struggling with {pain point}?"
- Number: "{Number} ways to {outcome}"
- Curiosity gap: "The {topic} mistake you're probably making"
- Personal: "{First name}, quick question"
- Urgency: "Last chance: {offer} expires tonight"
- Social proof: "{Number} people already {action}"
- How-to: "How to {outcome} in {timeframe}"

Rules:
- 30-50 characters (mobile truncation at ~40)
- No ALL CAPS (spam filter trigger)
- Avoid: "free", "act now", "limited time" in first emails
- Test emoji vs no emoji (audience-dependent)
- Preview text is part of the subject — make them work together

### 4. Sequence Templates

Templates for 6 sequence types: [references/sequence-templates.md](references/sequence-templates.md)

### 5. Deliverability

Critical for reaching inboxes: [references/deliverability.md](references/deliverability.md)

### 6. Segmentation

Segment by:
- **Behavior**: pages visited, emails opened/clicked, features used
- **Demographics**: role, company size, industry
- **Lifecycle stage**: trial, active, at-risk, churned
- **Engagement**: highly engaged, passive, dormant

Rule: The more personalized the segment, the higher the conversion rate. Aim for segments of 500+ for statistical significance.

## Metrics

| Metric | Good | Great | Action if Low |
|--------|------|-------|---------------|
| Open Rate | 20-25% | 30%+ | Fix subject lines, sender name, send time |
| Click Rate | 2-5% | 5%+ | Fix CTA, email body, offer relevance |
| Reply Rate | 1-3% | 5%+ | More personal tone, better questions |
| Unsubscribe | <0.5% | <0.2% | Better targeting, reduce frequency |
| Bounce Rate | <2% | <0.5% | Clean list, verify emails |

## References

- [references/sequence-templates.md](references/sequence-templates.md) — 6 complete sequence templates with timing
- [references/deliverability.md](references/deliverability.md) — SPF, DKIM, DMARC, warm-up, reputation

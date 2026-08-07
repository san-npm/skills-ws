## Contents

- Design Patterns
- Effective Popup Design Principles
- Layout Patterns
- Color Psychology for CTAs

## Design Patterns

### Effective Popup Design Principles

1. **One goal per popup** — Don't ask for email AND follow on Twitter
2. **Contrast with page** — Popup should visually pop (overlay darkens background)
3. **Minimal fields** — Email only converts 2-3x better than email + name
4. **Large CTA button** — Full-width on mobile, prominent color
5. **Clear close option** — Respect the user. Easy-to-find X or "No thanks"
6. **Visual hierarchy** — Headline → Supporting text → Form → CTA → Close
7. **Directional cues** — Arrow or image pointing toward form/CTA
8. **Whitespace** — Don't cram. Let the popup breathe.

### Layout Patterns

```
PATTERN A: Left image, right form (desktop)
┌─────────────────────────────────┐
│ [Image/     │ Headline          │
│  Mockup]    │ Short body text   │
│             │ [Email input    ] │
│             │ [  CTA Button   ] │
│             │ "No thanks" link  │
└─────────────────────────────────┘

PATTERN B: Stacked (mobile-first)
┌─────────────────┐
│    Headline      │
│  Short body text │
│ [Email input   ] │
│ [ CTA Button   ] │
│  "No thanks"     │
└─────────────────┘

PATTERN C: Full-screen takeover
┌─────────────────────────────────┐
│                                 │
│         Headline                │
│      Body text (short)          │
│                                 │
│     [Email          ]           │
│     [   CTA Button  ]          │
│                                 │
│       "No thanks"               │
│                                 │
└─────────────────────────────────┘

PATTERN D: Bottom slide-in (least intrusive)
                    ┌──────────────┐
                    │ Headline     │
                    │ [Email] [Go] │
Page content        │  ✕ close     │
                    └──────────────┘
```

### Color Psychology for CTAs

| Color | Feeling | Best For |
|-------|---------|----------|
| Green | Go, positive, safe | Signups, free actions |
| Orange | Urgency, energy | Limited offers, ecommerce |
| Blue | Trust, professional | B2B, SaaS |
| Red | Urgency, stop | Flash sales, deadlines |
| Purple | Premium, creative | Luxury, design tools |
| Black | Bold, premium | High-end products |

**Key rule:** CTA color must contrast sharply with popup background. Don't use blue CTA on blue popup.

---

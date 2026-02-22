---
name: popup-cro
description: "Popup, modal, slide-in, and banner optimization for conversions. Exit intent, scroll triggers, time delays, lead capture, announcement banners, frequency capping, A/B testing popups. Use when creating popups, designing exit-intent modals, building lead capture overlays, optimizing popup timing, or implementing announcement banners."
---

# Popup CRO v2

## Popup Types

| Type | Trigger | Best For |
|------|---------|----------|
| Exit intent | Mouse moves to close/back | Last-chance offers, lead capture |
| Scroll-triggered | 50-75% scroll depth | Engaged readers, content upgrades |
| Time delay | 15-30 seconds on page | Returning visitors, announcements |
| Click-triggered | Button/link click | Gated content, detailed info |
| Slide-in | Corner, scroll-triggered | Less intrusive lead capture |
| Top bar | Always visible | Announcements, promotions |

## Design Rules

- **One popup per page visit** (never stack)
- **Easy close**: visible X button, click outside to dismiss, Escape key
- **Mobile-friendly**: full-width on mobile, thumb-reachable close button
- **Frequency cap**: Don't show again for 7-30 days after dismiss
- **Respect "no"**: If they close it, don't show same offer again soon

## Trigger Timing

- **New visitors**: Time delay (30s) or scroll (50%)
- **Returning visitors**: Exit intent (they already know you)
- **Blog readers**: Scroll-triggered at 60% (they're engaged)
- **Pricing page**: Exit intent with discount or chat offer
- **Cart page**: Exit intent with urgency/discount

## Copy Framework

```
[Headline: Benefit or offer]
[1-2 line supporting text]
[Form: email field + CTA button]
[Trust text: "No spam. Unsubscribe anytime."]
[Close link: "No thanks, I don't want {benefit}"]
```

The "no thanks" text should make saying no feel slightly silly (but never manipulative).

## Templates and trigger rules: [references/popup-templates.md](references/popup-templates.md)

## References

- [references/trigger-rules.md](references/trigger-rules.md) — When to show which popup type
- [references/popup-templates.md](references/popup-templates.md) — Copy and design templates

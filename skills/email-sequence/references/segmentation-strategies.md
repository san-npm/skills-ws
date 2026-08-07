## Contents

- Segmentation Strategies
- Essential Segments
- Advanced Segmentation
- Segmentation Automation Workflow

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

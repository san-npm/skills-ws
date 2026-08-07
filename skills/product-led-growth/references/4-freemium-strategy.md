## Contents

- 4. Freemium Strategy
- What to Gate vs What to Give Free
- Usage-Based vs Feature-Based Limits
- Free-to-Paid Conversion Benchmarks
- Reverse Trial Pattern

## 4. Freemium Strategy

### What to Gate vs What to Give Free

**The freemium golden rule:** Give away enough that users experience core value and NEED more.

Exact plan limits below are *illustrative shapes*, not current quotes — vendors retune them constantly. Confirm any number against the vendor's live pricing page before you cite it.

| Gate Type | Give Free | Gate (Paid) | Example pattern |
|-----------|----------|------------|----------|
| Usage limits | A few projects/items | Unlimited | Notion, Trello (item/board caps on free) |
| Feature gates | Core features | Advanced features (analytics, automations) | Slack (advanced features paid) |
| Seat limits | Small team cap | Larger / unlimited seats | Figma, Linear (per-seat paid tiers) |
| Storage limits | A few GB | Tens–hundreds of GB | Dropbox, Google Drive |
| Support tier | Community/docs | Priority/dedicated | Most SaaS |
| History/retention | Recent history only | Full history | Slack (free tier limits how far back you can search/see messages — verify the current window at slack.com/pricing) |

**Rules for gating:**
- Free must include the aha moment (never gate the first value experience)
- Gate the "more" not the "first" — free users should be happy, paid users need scale
- Natural expansion triggers: team growth, usage growth, sophistication growth
- Don't cripple the free product (frustrated free users don't convert, they churn)

### Usage-Based vs Feature-Based Limits

| Approach | Pros | Cons | Best for |
|----------|------|------|----------|
| Usage-based | Natural upgrade path, aligns with value | Revenue unpredictable, hard to forecast | API products, infra, storage |
| Feature-based | Predictable tiers, easy to understand | May feel arbitrary, feature bloat | Collaboration tools, analytics |
| Seat-based | Scales with team adoption | Discourages sharing, invites workarounds | Team productivity tools |
| Hybrid | Best of both worlds | Complex pricing page | Most mature PLG companies |

### Free-to-Paid Conversion Benchmarks

Bands are industry rules of thumb; the per-company percentages are rough, widely-circulated estimates (not audited disclosures) — treat them as illustrative of the tier, not as quotable facts.

| Conversion Rate | Rating | Typical of |
|----------------|--------|----------|
| 1-2% | Below average | Broad consumer products |
| 2-5% | Average / healthy | Most B2B SaaS (broad-funnel freemium) |
| 5-10% | Strong | High-intent products (clear paid use case) |
| 10%+ | Exceptional | Niche/high-value products (premium positioning) |

**To improve conversion:**
- Reduce time-to-value (faster activation = higher conversion)
- Contextual upgrade prompts (at point of need, not random)
- Show what they're missing ("Upgrade to unlock X" vs invisible features)
- Reverse trial (see below)

### Reverse Trial Pattern

Instead of freemium → upgrade, give FULL access → downgrade after trial.

```
Day 0: Sign up → Full product access (all features, no limits)
Day 14: Trial expires → Downgrade to free tier
Result: Users experience premium value, feel the loss, convert at higher rates
```

**Reverse trial benchmarks (directional, not guaranteed — depends heavily on product and ICP):**
- Traditional freemium: ~2-5% conversion
- Reverse trial: often 2-3x that (commonly cited in the ~7-15% range)
- The pattern is widely used by collaboration and productivity SaaS (e.g., Slack and many Notion-style tools default new workspaces into a time-boxed full-feature experience before downgrading). Confirm any specific company's current flow yourself — onboarding designs change frequently.

**Implementation tips:**
- Clear countdown ("7 days left of Pro features")
- Highlight premium features being used ("You've used Advanced Analytics 12 times")
- Graceful downgrade (don't delete their data, just restrict access)
- Easy upgrade path at the moment of downgrade

## 🧮 Prioritizing fixes (PIE / ICE)

Score every audit finding and test idea so you work on impact, not whatever you noticed first.

**PIE** — best for ranking *pages/areas to test*:
| Factor | Question | Score 1–10 |
|---|---|---|
| **P**otential | How much improvement headroom? (low CVR, high bounce, weak page) | |
| **I**mportance | How valuable is this traffic? (volume × intent × $) | |
| **E**ase | How hard to implement the test? (dev, design, approvals) | |

Rank by the **average** of the three. **ICE** (Impact, Confidence, Ease) is the same idea for ranking *individual ideas* — Confidence captures how strong your evidence is.

```javascript
const ideas = [
  { name: 'Rewrite hero offer',    impact: 9, confidence: 6, ease: 5 },
  { name: 'Add SOC 2 trust row',   impact: 5, confidence: 7, ease: 9 },
  { name: 'Cut form 5→2 fields',   impact: 8, confidence: 8, ease: 7 },
];
const ranked = ideas
  .map(i => ({ ...i, ice: +((i.impact + i.confidence + i.ease) / 3).toFixed(1) }))
  .sort((a, b) => b.ice - a.ice);
// → "Cut form 5→2 fields" (7.7) tops "Add SOC 2 row" (7.0) > "Rewrite hero" (6.7)
```
Bias toward **high-confidence, high-ease wins first** (build momentum + traffic for the riskier big swings). Keep a backlog; re-score as evidence changes.

---
name: ab-testing
description: "A/B test design, statistical analysis, sample size calculation, experiment prioritization, and results interpretation."
---

# A/B Testing

## Workflow

### 1. Hypothesis Generation

**Format:** If we [change], then [metric] will [improve/decrease] by [amount], because [rationale].

**Example:** If we shorten the signup form from 5 fields to 3, then signup completion rate will increase by 15%, because friction reduction at high-intent moments increases conversion.

### 2. Prioritization

**ICE framework (quick):**

| Factor | Score 1-10 | Definition |
|--------|-----------|------------|
| Impact | How much will it move the metric? |
| Confidence | How sure are we it'll work? |
| Ease | How fast/cheap to implement? |
| **ICE Score** | (I + C + E) / 3 |

**RICE framework (more rigorous):**

| Factor | Definition |
|--------|-----------|
| Reach | How many users affected per quarter? |
| Impact | Expected effect size (0.25, 0.5, 1, 2, 3) |
| Confidence | % sure (100%, 80%, 50%) |
| Effort | Person-weeks to implement |
| **RICE Score** | (R × I × C) / E |

### 3. Sample Size Calculation

**Formula:**
```
n = (Z_α/2 × √(2p̄(1-p̄)) + Z_β × √(p₁(1-p₁) + p₂(1-p₂)))² / (p₂ - p₁)²

Where:
  p₁ = baseline conversion rate
  p₂ = expected conversion rate (baseline × (1 + MDE))
  p̄  = (p₁ + p₂) / 2
  Z_α/2 = 1.96 (for 95% confidence)
  Z_β   = 0.84 (for 80% power)
```

**Quick reference table:**

| Baseline rate | MDE (relative) | Sample per variant |
|--------------|----------------|-------------------|
| 2% | 10% | 78,000 |
| 2% | 20% | 20,000 |
| 5% | 10% | 30,000 |
| 5% | 20% | 7,700 |
| 10% | 10% | 14,300 |
| 10% | 20% | 3,700 |
| 20% | 10% | 6,300 |
| 20% | 20% | 1,600 |

**Test duration:**
```
Days needed = (Sample per variant × 2) / Daily traffic to test page
```

Minimum: 7 days (capture day-of-week effects). Maximum: 4 weeks (avoid novelty decay).

### 4. Test Design

**Rules:**
- One hypothesis per test
- Randomly assign users, not sessions (avoid flickering)
- Use the same metric definition for control and variant
- Define primary metric AND guardrail metrics before launch
- Don't peek at results before reaching sample size

**Guardrail metrics (always monitor):**
- Page load time (variant shouldn't be slower)
- Error rate
- Revenue per user (don't increase signups but tank revenue)
- Bounce rate

### 5. Statistical Analysis

**Frequentist approach (standard):**

```python
import numpy as np
from scipy import stats

# Results
control = {'visitors': 5000, 'conversions': 250}  # 5.0%
variant = {'visitors': 5000, 'conversions': 295}  # 5.9%

p1 = control['conversions'] / control['visitors']
p2 = variant['conversions'] / variant['visitors']
p_pool = (control['conversions'] + variant['conversions']) / (control['visitors'] + variant['visitors'])

se = np.sqrt(p_pool * (1 - p_pool) * (1/control['visitors'] + 1/variant['visitors']))
z = (p2 - p1) / se
p_value = 2 * (1 - stats.norm.cdf(abs(z)))

lift = (p2 - p1) / p1 * 100
ci_95 = 1.96 * np.sqrt(p1*(1-p1)/control['visitors'] + p2*(1-p2)/variant['visitors'])

print(f"Control: {p1:.3%}")
print(f"Variant: {p2:.3%}")
print(f"Lift: {lift:.1f}%")
print(f"95% CI: [{(p2-p1-ci_95)/p1*100:.1f}%, {(p2-p1+ci_95)/p1*100:.1f}%]")
print(f"p-value: {p_value:.4f}")
print(f"Significant: {'Yes' if p_value < 0.05 else 'No'}")
```

**Bayesian approach (when you want probability of being better):**

```python
from scipy.stats import beta

a_alpha = control['conversions'] + 1
a_beta = control['visitors'] - control['conversions'] + 1
b_alpha = variant['conversions'] + 1
b_beta = variant['visitors'] - variant['conversions'] + 1

# Monte Carlo simulation
samples_a = beta.rvs(a_alpha, a_beta, size=100000)
samples_b = beta.rvs(b_alpha, b_beta, size=100000)

prob_b_better = (samples_b > samples_a).mean()
print(f"P(variant > control): {prob_b_better:.1%}")
```

### 6. Ship / No-Ship Decision

| Scenario | Decision |
|----------|----------|
| p < 0.05 AND lift > MDE AND guardrails OK | Ship |
| p < 0.05 AND lift > 0 but < MDE | Ship if no cost, otherwise iterate |
| p > 0.05 AND lift direction positive | Inconclusive — extend or iterate |
| p < 0.05 AND lift negative | Kill variant |
| Guardrail metric degraded | Kill variant regardless of primary metric |

### 7. Documentation Template

```markdown
## Test: [Name]
**Hypothesis:** If we [change], then [metric] will [change] by [amount]
**Primary metric:** [metric name]
**Guardrails:** [metric 1, metric 2]
**Sample size:** [X per variant]
**Duration:** [start] to [end]

### Results
| Metric | Control | Variant | Lift | p-value | Sig? |
|--------|---------|---------|------|---------|------|
| Primary | X% | Y% | +Z% | 0.XX | Y/N |

### Decision: Ship / Kill / Iterate
**Reasoning:** [Why]
**Next test:** [What we learned and what to try next]
```

## Common Mistakes

- Stopping early because results "look significant" (peeking inflates false positives)
- Running too many variants (splits traffic, takes forever to reach significance)
- Testing tiny changes on low-traffic pages (will never reach significance)
- Not segmenting results (variant might win overall but lose on mobile)
- Ignoring practical significance (statistically significant 0.1% lift isn't worth shipping)

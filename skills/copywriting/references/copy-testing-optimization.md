## Contents

- Copy Testing & Optimization
- A/B Testing Framework for Copy
- Copy Performance Metrics

## Copy Testing & Optimization

### A/B Testing Framework for Copy

**Test in priority order, not by guessed "impact weights."** Headline/value-prop and CTA usually move conversions most, but the only defensible weight is your own historical test data; do NOT promise "headline = 30% of conversions." Rank tests by *expected lift × ease*, then validate with statistics. A "winner" that isn't statistically significant is noise: shipping it is how teams convince themselves copy works when it doesn't.

**Before you test — size it.** The single biggest A/B-test mistake is stopping early ("peeking") the moment a variant looks ahead. Decide the sample size up front, run to it, then evaluate once. Here is a self-contained, runnable Python implementation (standard library only — no external deps) for sample size and a two-proportion z-test:

```python
import math
from statistics import NormalDist

Z = NormalDist()  # standard normal

def required_sample_size(baseline_rate, mde_relative, power=0.80, alpha=0.05):
    """Per-variant sample size for a two-proportion test (two-sided).

    baseline_rate : current conversion rate, e.g. 0.04 for 4%
    mde_relative  : minimum detectable effect as a fraction of baseline,
                    e.g. 0.10 means "detect a 10% relative lift" (4% -> 4.4%)
    Returns the visitors needed in EACH variant.
    """
    p1 = baseline_rate
    p2 = baseline_rate * (1 + mde_relative)
    z_alpha = Z.inv_cdf(1 - alpha / 2)   # 1.96 at alpha=0.05
    z_beta = Z.inv_cdf(power)            # 0.84 at power=0.80
    pooled = (p1 + p2) / 2
    numerator = (z_alpha * math.sqrt(2 * pooled * (1 - pooled))
                 + z_beta * math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2
    n = numerator / (p2 - p1) ** 2
    return math.ceil(n)

def ab_test_result(visitors_a, conv_a, visitors_b, conv_b):
    """Two-proportion z-test. Returns lift, z, two-sided p-value, and verdict."""
    rate_a = conv_a / visitors_a
    rate_b = conv_b / visitors_b
    rel_lift = (rate_b - rate_a) / rate_a if rate_a else float("inf")

    pooled = (conv_a + conv_b) / (visitors_a + visitors_b)
    se = math.sqrt(pooled * (1 - pooled) * (1 / visitors_a + 1 / visitors_b))
    z = (rate_b - rate_a) / se if se else 0.0
    p_value = 2 * (1 - Z.cdf(abs(z)))   # two-sided

    if p_value < 0.05:
        verdict = "SHIP B" if rate_b > rate_a else "KEEP A (B is worse)"
    else:
        verdict = "INCONCLUSIVE — keep running or call it a draw"
    return {
        "rate_a": round(rate_a, 4),
        "rate_b": round(rate_b, 4),
        "relative_lift": round(rel_lift, 4),
        "z_score": round(z, 3),
        "p_value": round(p_value, 4),
        "verdict": verdict,
    }

# Example: 4% baseline, want to detect a 10% relative lift
print(required_sample_size(0.04, 0.10))          # -> 39475 visitors per variant
print(ab_test_result(12000, 480, 12000, 540))    # 4.0% vs 4.5%, p≈0.055 -> INCONCLUSIVE
```

**How to use the output:**
- `required_sample_size` tells you the visitors-per-variant to commit to. At ~2,500 visitors/day across both arms, the example (~39.5k each ≈ 79k total) needs ~32 days. If that exceeds 4–6 weeks, raise the MDE (accept detecting only bigger wins) — don't shorten the run.
- Stop only when **both** arms hit the planned sample. Then call `ab_test_result` once. `p_value < 0.05` = real; otherwise the result is a draw, regardless of how pretty the lift looks.
- The example deliberately shows a 4.0% → 4.5% "win" that lands at **p≈0.055 — just over the 0.05 line, so NOT significant** (and it ran on only 12k/arm, well short of the ~39.5k needed). This is exactly the trap that false-precision dashboards and early peeking encourage: a tempting lift that the math says is still noise.
- For low-traffic pages where you'll never reach significance, test bigger swings (new angle, new offer), not button colors, and lean on qualitative signal (session recordings, on-page surveys, sales-call objections).

### Copy Performance Metrics

**Key Performance Indicators:**
```yaml
Primary Metrics:
  - Conversion rate (primary goal completion)
  - Click-through rate (email/ad copy)
  - Time on page (engagement indicator)
  - Bounce rate (relevance measure)

Secondary Metrics:
  - Micro-conversions (email signups, downloads)
  - Social shares and engagement
  - Scroll depth and content consumption
  - Brand recall and message retention

Qualitative Metrics:
  - User feedback and surveys
  - Customer support ticket themes
  - Sales team objection reports
  - Brand voice consistency scores
```

---

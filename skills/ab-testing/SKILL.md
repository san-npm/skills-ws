---
name: ab-testing
description: "Experimentation guidance: A/B test design, sample-size/MDE calculation, pre-analysis plans, SRM and validity checks, frequentist + Bayesian + sequential analysis, variance reduction (CUPED), and ship/no-ship decisions. Use when designing or analyzing an A/B test, sizing an experiment, prioritizing tests, debugging suspicious results, or deciding whether to ship a variant."
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
| Impact | 1-10 | How much will it move the metric? |
| Confidence | 1-10 | How sure are we it'll work? |
| Ease | 1-10 | How fast/cheap to implement? |
| **ICE Score** | | (I + C + E) / 3 |

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

**Minimum:** run ≥ 1 full business cycle (usually 7 or 14 days) so every day-of-week and any weekly purchase/payday rhythm is represented; never stop mid-week even if the sample target is hit early.

**Run length is driven by power and cycles, not a fixed cap.** There is no universal "stop at 4 weeks" rule — B2B, marketplace, pricing, retention, and low-traffic tests routinely need 6–12+ weeks. The real risks in a long test are *exposure/sample drift* (the population changes — new acquisition channels, seasonality, holidays) and *novelty/primacy effects* (returning users react to the change for a few weeks, then revert). Mitigate by:
- Decide the **fixed horizon up front** from the sample-size calc (or use a sequential design, below). Do not let "it's been a month" become the stopping rule.
- Plot the **daily cumulative lift**; a stable, flattening curve signals novelty has worn off, a still-trending one means keep running.
- For novelty-prone changes (UI redesigns, new features), report **new-user vs returning-user** segments separately (pre-registered — see segmentation in §6) and consider a long-running **holdback** to measure the durable effect.
- If you must change the experiment design or population mid-flight, **stop and restart as a new test** rather than reinterpreting the old one.

### 4. Test Design

**Rules:**
- One hypothesis per test
- Randomly assign **users** (stable hash of a persistent user/device id → bucket), not sessions, so a user always sees the same variant (avoids flickering and contamination)
- Use the same metric definition, observation window, and instrumentation for control and variant
- Define primary metric AND guardrail metrics **before** launch
- Don't peek-and-stop on a fixed-horizon test; only the pre-registered sequential design (below) permits early stopping
- Ship the variant code behind a **feature flag / server-side assignment** so you can ramp exposure (1% → 5% → 50%) and kill instantly without a deploy; assign server-side where possible to dodge client ad-blockers and flicker

**Pre-analysis plan (write before launch, freeze it):** This is the single best defense against p-hacking. Record:

| Field | Example |
|-------|---------|
| Primary metric (one) | Signup completion rate |
| Guardrail metrics | p95 latency, error rate, revenue/user, refund rate |
| Unit of analysis & randomization | User id; same unit for assignment and metric (ratio metrics → delta method, below) |
| MDE / alpha / power | +5% relative, α = 0.05 (two-sided), power = 0.80 |
| Design & horizon | Fixed-horizon N = 30k/arm **or** sequential (mSPRT, α-spending) |
| Stopping rule | Stop at horizon; OR sequential boundary crossed; OR guardrail breach |
| Pre-registered segments | mobile vs desktop, new vs returning (everything else is exploratory) |
| Exclusions | internal IPs/employee ids, known bots, pre-exposure activity |

**Guardrail metrics (always monitor):**
- Latency (p50/p95 — variant shouldn't be slower)
- Error / crash rate
- Revenue per user and refund/chargeback rate (don't lift signups while tanking revenue)
- Bounce rate / core engagement

**Instrumentation & traffic-quality QA (before trusting any number):**
- **Validate event tracking on both arms** in staging *and* in a pre-launch A/A test — fire the exposure event exactly once at first eligible impression, and confirm conversion events join to the same unit id.
- **Filter bots and internal traffic** (employees, QA, monitoring, datacenter ASNs) *before* analysis, not after.
- **Run an A/A test** (or use the sequential framework on a no-change comparison) periodically to confirm your false-positive rate matches α and your assignment/logging is unbiased.

### 5. Statistical Analysis

**Step 0 — Sample-Ratio Mismatch (SRM) check. Do this FIRST; if it fails, STOP.**

If the observed split differs from the intended split (e.g. you targeted 50/50 but see 5,000 vs 5,400), randomization or logging is broken and **every downstream p-value is untrustworthy** — do not interpret the result, find the bug (redirect bias, flag eval, bot filtering applied to one arm, double-firing exposure events). Test with a chi-square goodness-of-fit; a p-value below ~0.01 is an SRM.

```python
from scipy.stats import chisquare

# Observed exposures per arm. Plug in your real assignment counts.
observed = [5000, 5000]            # control, variant  (a clean 50/50 here)
expected_ratio = [0.5, 0.5]        # intended split
total = sum(observed)
expected = [total * r for r in expected_ratio]

chi2, srm_p = chisquare(f_obs=observed, f_exp=expected)
print(f"SRM chi-square p = {srm_p:.4f}")
if srm_p < 0.01:
    raise SystemExit("SRM DETECTED — assignment/logging is broken. Do NOT trust metrics; debug first.")
# e.g. observed = [5000, 5400] -> srm_p ~ 0.0001 -> STOP and debug before reading any metric.
```

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

**Bayesian approach (when you want probability of being better + a risk-aware decision):**

`P(variant > control)` alone over-ships tiny, uncertain wins. Always pair it with **expected loss** (the average downside in conversion-rate points if you ship and you're wrong) and a **ROPE** (region of practical equivalence — a band of differences too small to matter). Ship only when P(better) clears a high bar AND expected loss is below a tolerance you set in advance.

```python
import numpy as np
from scipy.stats import beta

# Beta(1,1) uniform prior + observed data (use a weakly-informative prior near baseline if you have history)
a_alpha = control['conversions'] + 1
a_beta  = control['visitors'] - control['conversions'] + 1
b_alpha = variant['conversions'] + 1
b_beta  = variant['visitors'] - variant['conversions'] + 1

draws = 200_000
samples_a = beta.rvs(a_alpha, a_beta, size=draws)
samples_b = beta.rvs(b_alpha, b_beta, size=draws)
diff = samples_b - samples_a                       # in absolute rate points

prob_b_better = (diff > 0).mean()
# Expected loss if we SHIP variant: average shortfall when control is actually better
expected_loss_ship = np.maximum(samples_a - samples_b, 0).mean()
# 95% credible interval on the absolute difference
ci_lo, ci_hi = np.percentile(diff, [2.5, 97.5])

# ROPE: differences within +/- 0.2 absolute points are "practically equal"
rope = 0.002
p_in_rope = ((diff > -rope) & (diff < rope)).mean()

print(f"P(variant > control): {prob_b_better:.1%}")
print(f"Expected loss if ship: {expected_loss_ship*100:.3f} pts")
print(f"95% credible interval (abs): [{ci_lo*100:.3f}, {ci_hi*100:.3f}] pts")
print(f"P(difference within ROPE): {p_in_rope:.1%}")

# Decision thresholds (set BEFORE launch)
DECISION_PROB = 0.95            # ship confidence
LOSS_TOLERANCE = 0.0005         # max acceptable expected loss (0.05 pts)
ship = prob_b_better >= DECISION_PROB and expected_loss_ship <= LOSS_TOLERANCE
print("Decision:", "SHIP" if ship else "keep running / inconclusive")
```

**Variance reduction — CUPED (use when you have pre-experiment data).** CUPED removes pre-existing user differences using a pre-period covariate (e.g. each user's prior-28-day spend or visits), often cutting variance 30–50% — which means a smaller sample or a shorter test for the same power. It's standard on mature platforms. Adjust the metric, then run the *same* t-test/CI on the adjusted values.

```python
import numpy as np
from scipy import stats

# y = in-experiment metric per user; x = same user's pre-period covariate (mean-centered)
# group: 0 = control, 1 = variant. Arrays aligned by user.
def cuped_adjust(y, x):
    x = x - x.mean()
    theta = np.cov(y, x, ddof=1)[0, 1] / np.var(x, ddof=1)   # optimal coefficient
    return y - theta * x

y_adj = cuped_adjust(y, x)
t, p = stats.ttest_ind(y_adj[group == 1], y_adj[group == 0], equal_var=False)
print(f"CUPED-adjusted effect p = {p:.4f}  (variance reduced vs raw t-test)")
```
The covariate must be **pre-treatment** (measured before assignment) and correlated with the outcome; never use a post-treatment variable or you bias the estimate.

**Sequential testing / always-valid p-values (use when stakeholders WILL peek).** A fixed-horizon p-value is only valid if you look once at the planned N. If you want to monitor a dashboard daily and be able to stop early, use a design built for continuous monitoring instead of repeatedly applying the 0.05 test:
- **Group sequential / alpha-spending (O'Brien–Fleming, Pocock):** pre-plan K interim looks; spend α across them so the overall false-positive rate stays at 0.05. Good when looks are scheduled (e.g. weekly).
- **Always-valid inference (mSPRT / confidence sequences):** gives a p-value/CI valid at *every* moment, so you may stop the instant it crosses — at the cost of needing a somewhat larger sample if the effect is small. This is what "peeking-safe" dashboards (modern experimentation platforms) implement.
- Practical rule: pick fixed-horizon **or** sequential up front and write it in the pre-analysis plan. Do **not** run a fixed-horizon test and then stop early because it "hit significance" — that inflates false positives 2–5×.

**Ratio & revenue metrics (variance is bigger than it looks).** For metrics where the analysis unit ≠ randomization unit (clicks-per-session, revenue-per-user, CTR aggregated over sessions), the naive standard error is wrong because observations within a user are correlated. Use the **delta method** or **cluster/bootstrap by user** for the variance, and consider **winsorizing** heavy-tailed revenue (cap at ~p99) so one whale doesn't dominate. Run significance on the user-level mean (or delta-method SE), not on the pooled event counts.

### 6. Ship / No-Ship Decision

Evaluate the **primary metric on the pre-registered design only** (fixed-horizon p-value at planned N, or the sequential boundary). For Bayesian tests, swap "p < 0.05" for "P(better) ≥ threshold AND expected loss ≤ tolerance" from §5.

| Scenario | Decision |
|----------|----------|
| Significant AND lift > MDE AND guardrails OK | Ship |
| Significant AND lift > 0 but < MDE | Ship only if cost-free; the effect is below what you decided was worth shipping — usually iterate |
| Not significant at planned horizon | **Inconclusive — do NOT silently extend.** Extending after seeing a near-miss is p-hacking. Only continue if a longer horizon (or sequential boundary) was pre-specified; otherwise redesign and run a fresh, better-powered test. |
| Significant AND lift negative | Kill variant |
| Guardrail metric degraded | Kill variant regardless of primary metric |

**Segmentation discipline.** Reading the result inside subgroups (mobile, country, new vs returning) is valuable but is where false discoveries breed:
- Report **pre-registered segments** as confirmatory; treat every other slice as **exploratory hypothesis generation**, not proof.
- Correct for multiple comparisons across segments/metrics — **Benjamini–Hochberg (FDR)** for many exploratory reads, **Bonferroni** when a single false positive is costly. A "win" found only after slicing 12 ways needs its own confirmatory test before you ship it to that segment.
- Beware **Simpson's paradox**: a variant can win overall yet lose in every segment (or vice-versa) if segment mix differs between arms — another reason the SRM and assignment checks in §5 matter.

### 7. Documentation Template

```markdown
## Test: [Name]
**Hypothesis:** If we [change], then [metric] will [change] by [amount]
**Primary metric:** [one metric]   **Guardrails:** [latency, error rate, revenue/user, ...]
**Randomization unit:** [user id]   **MDE / alpha / power:** [+5% rel / 0.05 / 0.80]
**Design & stopping rule:** [fixed-horizon N=X/arm | sequential mSPRT] — frozen before launch
**Pre-registered segments:** [mobile vs desktop, new vs returning]   **Exclusions:** [internal, bots]
**Duration:** [start] to [end]  (>= 1 full business cycle)

### Validity checks
- SRM: observed [n_c / n_v], chi-square p = [..]  → PASS / FAIL
- A/A or instrumentation QA: PASS / FAIL    Bots & internal traffic filtered: Y/N

### Results
| Metric | Control | Variant | Lift | CI / p-value (or P(better) + exp. loss) | Sig? |
|--------|---------|---------|------|------------------------------------------|------|
| Primary | X% | Y% | +Z% | [..] | Y/N |

### Decision: Ship / Kill / Iterate
**Reasoning:** [primary on pre-registered design + guardrails; any segment reads flagged exploratory]
**Next test:** [What we learned and what to try next]
```

## Common Mistakes

- Stopping a fixed-horizon test early because results "look significant" — peeking inflates false positives 2–5×. Use a sequential design if you need to stop early.
- Trusting results without an **SRM check** — a broken 50/50 split silently corrupts every metric.
- Extending a "near-miss" test that wasn't pre-registered to extend (it's p-hacking dressed up as patience).
- **Post-hoc segment fishing** with no multiple-comparison correction — slice enough ways and something always "wins."
- Running too many variants (splits traffic, dilutes power, multiplies comparisons).
- Testing tiny changes on low-traffic pages (will never reach significance — see the sample-size table).
- Using the naive binary-proportion test on **revenue/ratio metrics** (correlated within-user observations → understated variance → false wins).
- Ignoring practical significance (a statistically significant 0.1% lift usually isn't worth shipping).
- Treating a long-running winner as durable without checking for novelty decay (split new vs returning users).

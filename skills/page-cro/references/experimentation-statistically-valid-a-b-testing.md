## Contents

- 🧪 Experimentation: Statistically Valid A/B Testing
- Pre-registration (decide before launch)
- Sample-size calculator (correct: z-scores derived from α and power)
- Duration: cover whole business cycles
- Sample Ratio Mismatch (SRM) — check this first, every time
- No peeking — or use a method built for it
- Frequentist vs. Bayesian
- Multiple comparisons
- Guardrail metrics (don't win the battle, lose the war)
- Reading results — ship/iterate/kill

## 🧪 Experimentation: Statistically Valid A/B Testing

A "win" is only real if the test was **powered up front**, **not peeked at**, and **passed its guardrails**. Most reported CRO wins fail because someone stopped the test the moment p dipped below 0.05.

### Pre-registration (decide before launch)
- **Primary metric** (one — usually CVR or RPV). Secondary/guardrail metrics are explicitly secondary.
- **Hypothesis** and expected direction.
- **MDE** (minimum detectable effect you care about, *relative*), **α** (false-positive rate, usually 0.05), **power** (1−β, usually 0.80), one- vs two-sided (default **two-sided**).
- **Fixed sample size & end date** computed from the above. You stop at that point, not before — unless using a proper sequential method (below).
- **Allocation** (e.g., 50/50) and **unit of randomization** (visitor, sticky across sessions — never page-view, or returning users contaminate arms).

### Sample-size calculator (correct: z-scores derived from α and power)
```javascript
// Inverse standard normal CDF (Acklam's rational approximation, ~1e-9 accuracy).
function normInv(p) {
  if (p <= 0 || p >= 1) throw new RangeError('p must be in (0,1)');
  const a=[-3.969683028665376e+01,2.209460984245205e+02,-2.759285104469687e+02,1.383577518672690e+02,-3.066479806614716e+01,2.506628277459239e+00];
  const b=[-5.447609879822406e+01,1.615858368580409e+02,-1.556989798598866e+02,6.680131188771972e+01,-1.328068155288572e+01];
  const c=[-7.784894002430293e-03,-3.223964580411365e-01,-2.400758277161838e+00,-2.549732539343734e+00,4.374664141464968e+00,2.938163982698783e+00];
  const d=[7.784695709041462e-03,3.224671290700398e-01,2.445134137142996e+00,3.754408661907416e+00];
  const pl=0.02425, ph=1-pl; let q,r;
  if (p<pl){q=Math.sqrt(-2*Math.log(p));return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
  if (p<=ph){q=p-0.5;r=q*q;return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);}
  q=Math.sqrt(-2*Math.log(1-p));return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
}

/**
 * Per-variant sample size for a two-proportion test (pooled-variance approximation).
 * @param baseline absolute baseline CVR, e.g. 0.03 for 3%
 * @param mde      RELATIVE lift to detect, e.g. 0.10 for +10% (→ 3.0% to 3.3%)
 * @param alpha    significance level (default 0.05)
 * @param power    1 - beta (default 0.80)
 * @param twoSided two-sided test? (default true)
 */
function sampleSizePerVariant(baseline, mde, alpha = 0.05, power = 0.80, twoSided = true) {
  const p1 = baseline;
  const p2 = baseline * (1 + mde);          // treatment rate under the MDE
  const zA = normInv(1 - alpha / (twoSided ? 2 : 1));   // derived from alpha, NOT hardcoded
  const zB = normInv(power);                            // derived from power, NOT hardcoded
  const pBar = (p1 + p2) / 2;
  const delta = Math.abs(p2 - p1);
  const n = (zA * Math.sqrt(2 * pBar * (1 - pBar)) + zB * Math.sqrt(p1*(1-p1) + p2*(1-p2)))**2 / delta**2;
  return Math.ceil(n);
}

// 3% baseline, detect a +10% relative lift, 95% / 80%:
const nPerArm = sampleSizePerVariant(0.03, 0.10, 0.05, 0.80);
console.log(`Need ~${nPerArm.toLocaleString()} per variant`); // ~53,000 — small lifts are expensive
```
For revenue/AOV (continuous, often skewed) the proportion formula does **not** apply — use a t-test/Mann–Whitney sizing on the metric's mean and variance, or a calculator that accepts σ. Reach for a vetted tool when unsure: Evan Miller's "Sample Size" calc, `statsmodels` (`NormalIndPower`, `tt_ind_solve_power`), R's `pwr`, or your platform's built-in (Optimizely/VWO/GrowthBook).

### Duration: cover whole business cycles
```javascript
function testDurationDays(nPerArm, dailyVisitorsPerArm) {
  // dailyVisitorsPerArm already reflects the traffic split across arms.
  const days = Math.ceil(nPerArm / dailyVisitorsPerArm);
  // Run in FULL weeks to absorb day-of-week effects, min 1 cycle (typically 14 days),
  // and stop on a week boundary so weekday/weekend mix is balanced across arms.
  const minDays = 14;
  return Math.max(Math.ceil(days / 7) * 7, minDays);
}
```
Run at least one full purchase/business cycle (often ≥ 2 weeks). Beware the **novelty effect** (returning users react to *any* change at first — let it wash out) and **seasonality** (don't straddle a holiday or a campaign spike).

### Sample Ratio Mismatch (SRM) — check this first, every time
If you allocated 50/50 but observed counts diverge, your randomization, redirect, or bot filtering is broken and **the whole test is invalid** — debug before reading results.
```javascript
// Chi-square SRM check; flag if p < 0.01 for a 50/50 split.
function srmCheck(countA, countB, expectedA = 0.5) {
  const n = countA + countB;
  const eA = n * expectedA, eB = n * (1 - expectedA);
  const chi2 = (countA-eA)**2/eA + (countB-eB)**2/eB;     // 1 dof
  // survival of chi-square(1): p = erfc( sqrt(chi2/2) )
  const erfc = (x) => { const t=1/(1+0.3275911*x);
    return (((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x); };
  const p = erfc(Math.sqrt(chi2 / 2));
  return { chi2: +chi2.toFixed(3), p: +p.toFixed(4), srm: p < 0.01 };
}
// srmCheck(10050, 9950) → {p: 0.48, srm: false}  ok, expected sampling noise
// srmCheck(10200,  9800) → {p: 0.005, srm: true}  INVALID — 51/49 at n=20k is too skewed to be chance
```

### No peeking — or use a method built for it
Repeatedly checking a fixed-horizon test and stopping at the first p<0.05 inflates the false-positive rate to **30%+**. Options:
- **Fixed-horizon (default):** decide N and end date up front; look once, at the end. Simple and correct.
- **Sequential / always-valid:** if you must monitor continuously, use a method designed for it — **mSPRT / always-valid p-values** (Optimizely Stats Engine), **group-sequential** with alpha-spending (O'Brien–Fleming / Pocock boundaries), or **Bayesian** continuous monitoring. Don't bolt continuous peeking onto a fixed-horizon t-test.

### Frequentist vs. Bayesian
| | Frequentist (t/z, p-value, CI) | Bayesian (posterior, P(B>A), expected loss) |
|---|---|---|
| Output | "p=0.03; reject null" | "92% probability B beats A; expected loss 0.1%" |
| Peeking | Invalid unless sequential | Valid to monitor (with care) |
| Stakeholder story | Harder | More intuitive |
| Tooling | statsmodels, R `pwr`, VWO | GrowthBook, Dynamic Yield, `PyMC` |
Either is fine if used correctly. Pick one per program and don't switch mid-test to whichever looks better (that's just peeking with extra steps).

### Multiple comparisons
Testing many variants or many metrics multiplies false positives. Control it: pre-designate **one** primary metric; for k variants vs. control use **Dunnett's** test; for arbitrary families use **Holm–Bonferroni** (less conservative than plain Bonferroni) or Benjamini–Hochberg FDR. Secondary metrics are hypothesis-generating, not ship-deciding.

### Guardrail metrics (don't win the battle, lose the war)
A CTA change can lift clicks while tanking revenue, refunds, or trust. Always watch, and require *no significant regression* on, guardrails such as: **revenue-per-visitor**, **AOV**, refund/chargeback rate, **bounce/exit**, downstream **activation/retention**, support tickets, page latency (a heavy variant can regress INP), and accessibility complaints. Ship only when the primary metric wins **and** no guardrail regresses.

### Reading results — ship/iterate/kill
- **Winner:** primary metric significant in the right direction, no SRM, no guardrail regression, ran ≥ full cycle → ship; monitor post-launch (effects often shrink vs. test).
- **Flat:** CI includes zero → likely underpowered or a weak idea. Don't ship; learn and form a bigger-swing hypothesis.
- **Loser:** ship the control, document *why* it lost (often more valuable than a win).
- Report the **effect size + confidence/credible interval**, never a bare p-value. "+8% CVR (95% CI +2% to +14%)" beats "p<0.05".

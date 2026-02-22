---
name: page-cro
description: "Landing page conversion rate optimization. A/B test design, statistical significance calculation, heatmap interpretation, above-the-fold optimization, trust signals, social proof patterns, page speed impact, form optimization. Use when optimizing landing pages, running A/B tests, analyzing heatmaps, improving conversion rates, adding social proof, or reducing bounce rates."
---

# Page CRO v2

## Audit Workflow

### 1. Above the Fold
First screen must contain:
- Clear value proposition (what + for whom + why different)
- Primary CTA (visible without scrolling)
- Trust signal (logo bar, testimonial snippet, or metric)
- Relevant hero image/video (not stock photos)

### 2. Page Structure
Optimal section order for landing pages:
1. Hero (value prop + CTA)
2. Social proof bar (logos or metrics)
3. Problem statement (pain they feel)
4. Solution (how you solve it)
5. Features/benefits (3-4 max, benefit-first)
6. Social proof (testimonials, case studies)
7. How it works (3 steps)
8. Pricing or offer
9. FAQ (address objections)
10. Final CTA (restate value prop)

### 3. Trust Signals
- Customer logos (known brands first)
- Metrics: "Used by X+ companies" / "Y% improvement"
- Testimonials with photo, name, title, company
- Review scores (G2, Trustpilot, etc.)
- Security badges (SOC2, GDPR, SSL)
- Money-back guarantee badge near CTA

### 4. CTA Optimization
- Button color: contrast with page (test red vs green vs blue)
- Button text: first person, specific ("Start my free trial")
- Reduce risk: "No credit card required", "Cancel anytime"
- One primary CTA per section, same action throughout

## A/B Testing

### Sample Size Calculator
```
Minimum sample = 16 × p × (1-p) / MDE²
p = baseline conversion rate (e.g., 0.05 for 5%)
MDE = minimum detectable effect (e.g., 0.2 for 20% relative improvement)
```

For 5% baseline, 20% relative improvement: ~6,400 visitors per variant.

### Statistical Significance
- z = (p1 - p2) / sqrt(p_pool × (1 - p_pool) × (1/n1 + 1/n2))
- Significant if z > 1.96 (95% confidence)
- Run for minimum 2 full weeks (capture weekly patterns)
- Don't stop early on promising results

Full testing guide: [references/ab-testing.md](references/ab-testing.md)

## Heatmap Interpretation

- **Red zones**: High attention — put important content here
- **Cold zones**: Low attention — move or remove content
- **False bottoms**: If users stop scrolling, add visual continuity cues
- **Rage clicks**: Frustration indicator — element looks clickable but isn't
- **F-pattern/Z-pattern**: Place key elements along natural scan path

## Page Speed Impact
- 1s → 3s load time: bounce rate increases 32%
- 1s → 5s load time: bounce rate increases 90%
- Each 100ms improvement: +1% conversion rate
- Mobile speed matters more (slower connections)

## References

- [references/ab-testing.md](references/ab-testing.md) — Complete A/B testing guide with calculators
- [references/cro-patterns.md](references/cro-patterns.md) — 30+ proven conversion patterns

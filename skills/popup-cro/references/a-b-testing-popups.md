## Contents

- A/B Testing Popups
- What to Test (Priority Order)
- Test Framework
- Statistical Significance
- Tools for A/B Testing Popups

## A/B Testing Popups

### What to Test (Priority Order)

1. **Offer** — What you're giving (highest impact on conversion)
2. **Trigger** — When/how the popup appears
3. **Headline** — The hook
4. **Design** — Layout, colors, imagery
5. **Copy** — Body text and CTA
6. **Form fields** — Number and type of fields
7. **Timing** — Seconds delay or scroll percentage

### Test Framework

```
TEST 1: Offer (run first — everything else depends on this)
├── A: 10% discount
├── B: Free shipping
└── C: Content upgrade (guide/checklist)
Winner → Use in all subsequent tests

TEST 2: Trigger timing
├── A: 5 seconds
├── B: 15 seconds
└── C: 50% scroll
Winner → Use going forward

TEST 3: Headline
├── A: Benefit-focused ("Get 10% off your first order")
├── B: Curiosity-focused ("Don't miss this")
└── C: Social proof ("Join 50K subscribers")
Winner → Use going forward

TEST 4: Design
├── A: Minimal (text + form)
├── B: Image-rich (product photo or mockup)
└── C: Full-screen takeover vs modal
```

### Statistical Significance

- **Sample size depends on baseline + effect size** — there is no universal "1,000 impressions" number. Lower baseline rates and smaller lifts need far more traffic. Use the table below.
- **Minimum conversions:** aim for ~100+ conversions per variant (50 is a bare floor for a rough read) before trusting a result.
- **Duration:** run at least 1–2 full weeks to capture weekday/weekend and full purchase cycles, even if significance hits sooner.
- **Confidence level:** 95% (α = 0.05) minimum; pick power = 80% when sizing.
- **Don't peek / no early stopping** on a fixed-horizon test — it inflates false positives. Set the duration and required N up front, or use a sequential/Bayesian method designed for continuous monitoring.

**Required sample size per variant** (2-sided, 95% confidence, 80% power), to detect a *relative* lift over a baseline conversion rate:

| Baseline conv. rate | Detect +10% rel. | +20% rel. | +50% rel. |
|---------------------|------------------|-----------|-----------|
| 1% | ~155,000 / variant | ~40,000 | ~7,000 |
| 2% | ~77,000 | ~20,000 | ~3,400 |
| 5% | ~30,000 | ~7,600 | ~1,300 |
| 10% | ~14,000 | ~3,600 | ~620 |

Reading it: a popup at a **2% baseline** that you hope to lift to **2.4% (+20% relative)** needs **~20,000 impressions per variant** — not 1,000. (Approximate; use a proper calculator — e.g. Evan Miller's "Sample Size" or your testing tool's built-in — for exact figures and for absolute-lift inputs.) If the math says you can't reach N in a reasonable window, test a **bigger swing** (offer, not button color), test on **higher-traffic pages**, or accept a **directional** read and re-test later.

### Tools for A/B Testing Popups

> Pricing and free-tier limits change constantly — **verify current pricing on the vendor's site before recommending** (as of Jun 2026). Choose on fit, not headline price.

| Tool | Best fit | Choose it when |
|------|----------|----------------|
| OptinMonster | WordPress / general web | You want deep trigger + display-rules control without building it; WP-first stack |
| BDOW! (formerly Sumo) | Simple / small sites | You need a fast, low-effort setup and a usable free tier |
| Privy / Justuno / OptiMonk | Ecommerce (Shopify) | You need cart-value triggers, spin-to-win, and email/SMS list sync to a store |
| ConvertFlow | SaaS / personalization | You need on-site personalization, multi-step funnels, and CRM-aware targeting |
| Unbounce / Instapage | Landing pages + popups | Popups live alongside built landing pages and you want one builder |
| Klaviyo / Mailchimp (built-in forms) | Already on that ESP | You want capture + flows in one tool and don't need advanced display rules |
| Custom (JS) | Full control | You need exact behavior, no third-party script weight, and own consent/CWV handling |

**Tool-fit criteria, in priority order:** (1) does it integrate with your ESP/CRM and consent platform; (2) display-rule granularity (trigger × segment × frequency cap); (3) built-in A/B testing + significance reporting; (4) script weight / performance (async, lazy-loaded — see Core Web Vitals note); (5) Consent Mode / GPC awareness; (6) price for your traffic volume.

---

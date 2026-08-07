## Contents

- Claims, Compliance & Ethical Guardrails
- Substantiation — the core rule
- Testimonials & endorsements (FTC)
- Email & messaging consent
- Dark patterns — do not use
- Regulated categories — extra caution
- AI-generated-copy disclosure & accuracy

## Claims, Compliance & Ethical Guardrails

Persuasive copy that can't be backed up is a legal and brand liability, not a clever move. Apply these as hard gates in the [QA checklist](#copywriting-workflow-agent-runbook). This is general guidance, not legal advice — for regulated categories (health, finance, supplements, legal) have counsel review before publishing, and confirm current rules, since enforcement guidance evolves.

> As of Jun 2026, verify the current text of these rules at their sources: FTC endorsement/advertising guidance (https://www.ftc.gov/business-guidance/advertising-marketing), CAN-SPAM (https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business), and GDPR/ePrivacy for EU/UK audiences (https://gdpr.eu). Rules differ by jurisdiction; the buyer's location governs.

### Substantiation — the core rule

Every objective or quantified claim must be **true and provable before it ships.** If you don't have the proof, you don't make the claim.

- **Numeric / performance claims** ("300% more leads", "2× revenue", "save 10 hours/week") require real, documented evidence (a study, your own measured data, or aggregated customer results). Never invent a statistic to make a headline land. If the agent lacks a source, write the benefit qualitatively ("dramatically more leads" → "more qualified leads, faster") or insert a `[SOURCE NEEDED: ___]` placeholder for the user to fill — do not fabricate.
- **Typical vs. exceptional results.** If a result is a best case, label it ("Results vary; this customer's outcome is not typical") and prefer presenting typical results. Cherry-picked outliers presented as the norm are deceptive.
- **Comparative claims** ("faster than X", "the only tool that…") need a defensible basis and must be current.
- **Superlatives** ("best", "#1", "world-leading") invite challenge — qualify them ("rated #1 for ease of use by [source, year]") or drop them.

### Testimonials & endorsements (FTC)

- Use only **real** testimonials from real customers who actually said it and consented to its use. Never write a fake testimonial or generate a synthetic "customer quote."
- Endorsers must disclose **material connections** (paid, free product, affiliate, employee). Influencer/affiliate copy needs a clear, conspicuous disclosure — not buried in a hashtag wall.
- Don't present a paid endorsement as an independent review.
- AI-generated faces, voices, or "customers" presented as real people are deceptive — don't.

### Email & messaging consent

- **US (CAN-SPAM):** accurate "From"/subject lines, identify the message as an ad where required, include a valid physical postal address, provide a clear and conspicuous opt-out mechanism, and honor opt-outs within 10 business days. (Separately, Gmail and Yahoo require one-click unsubscribe headers, RFC 8058, for bulk senders: build it in regardless.) No deceptive headers.
- **EU/UK (GDPR + ePrivacy) and CASL (Canada):** generally require **prior opt-in consent** to email marketing; keep proof of consent; offer easy withdrawal. Pre-checked consent boxes are not valid consent under GDPR.
- Write the unsubscribe and consent microcopy as part of the deliverable — it's copy, not an afterthought.

### Dark patterns — do not use

These boost short-term metrics and are increasingly regulated (FTC, EU Digital Services Act, state laws). Avoid:

- **Fake urgency/scarcity**: countdown timers that reset, "only 2 left" when stock is unlimited, fake "12 people viewing".
- **Confirmshaming**: opt-out copy that guilts ("No thanks, I don't want to save money").
- **Forced continuity / hidden auto-renew**: free trials that bill silently; bury-the-terms pricing. State renewal terms plainly.
- **Roach motel**: easy to subscribe, hard to cancel. Cancellation should be as easy as signup.
- **Drip pricing / hidden fees**: show the real total early.
- **Disguised ads** and **trick questions** in forms.

Real scarcity ("sale ends Friday" when it truly does, "3 seats left" when there genuinely are) is fine and effective — the rule is that the claim must be *true*.

### Regulated categories — extra caution

- **Health / wellness / supplements**: no claims to diagnose, treat, cure, or prevent disease unless substantiated and lawful; include required disclaimers; avoid fear-based pressure. (Verify FDA/FTC rules.)
- **Finance / crypto / investing**: no guaranteed returns or "risk-free" framing; include risk disclosures; follow securities/advertising rules in each jurisdiction. (See the trading-related disclaimers pattern — KYC/jurisdiction/risk.)
- **Legal, medical, tax advice copy**: add "consult a qualified professional" and avoid implying individualized advice.

### AI-generated-copy disclosure & accuracy

- Don't present AI-generated content as a human's first-person experience or as an independent expert when it isn't.
- Fact-check any statistic, citation, price, or claim the model produces before publishing — models hallucinate plausible-looking numbers. Unverified figures must be removed or flagged, never shipped.

> **Note on the example copy in this skill.** Headlines like "Get 300% More Leads in 90 Days" or "Double Your Revenue" appear here only to illustrate *structure*. In production, every such number must be backed by real, documented results or rewritten qualitatively. Treat each as `[METRIC — substantiate or replace]`.

---

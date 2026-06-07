---
name: brand-strategy
description: "Frameworks and templates for building and managing a cohesive brand system. Use when defining or auditing brand positioning, messaging hierarchy, voice/tone, visual identity, brand architecture, naming, or brand guidelines for a product or company."
---

# Brand Strategy

## Brand Positioning Framework

Complete this statement — if you can't, your positioning isn't clear enough:

```
For [TARGET AUDIENCE] who [NEED/SITUATION],
[BRAND] is the [CATEGORY]
that [KEY DIFFERENTIATOR]
because [REASON TO BELIEVE].
```

**Example:**
> For growth-stage SaaS teams who need to ship marketing pages fast,
> Webflow is the visual development platform
> that gives designers production-level control without engineering dependencies
> because it generates clean, production-ready code with built-in CMS and hosting.

### Positioning Inputs Checklist

- [ ] Target audience defined with specificity (not "everyone")
- [ ] Category clearly named (or intentionally created)
- [ ] 1-2 differentiators that are true, relevant, AND defensible
- [ ] Proof points for each differentiator (data, patents, methodology)
- [ ] Competitive alternatives identified (including "do nothing")

### Positioning Worksheet (run in order)

**Step 1 — ICP segmentation.** Don't position for "the market." Pick one beachhead segment and describe it precisely. Score candidate segments and start with the highest total.

| Segment | Urgency of pain (1-5) | Budget/willingness to pay (1-5) | Reachability (1-5) | Strategic value / expansion (1-5) | Total |
|---------|----|----|----|----|----|
| e.g. Seed-stage B2B SaaS founders | 5 | 3 | 4 | 4 | 16 |
| e.g. Enterprise marketing ops | 3 | 5 | 2 | 5 | 15 |

For the winning segment, write a one-paragraph ICP: firmographics (size, industry, stage), the buyer's role and the user's role (often different), the trigger event that starts the search, and the budget they already spend on the problem.

**Step 2 — Competitive alternatives.** Frame against what the customer would actually do instead, not just direct competitors. Four buckets:
- **Direct** — does the same job a similar way (e.g., another design tool).
- **Indirect** — does the job a different way (e.g., hiring a contractor).
- **Status quo / "do nothing"** — spreadsheet, manual process, or living with the pain. This is usually the #1 competitor — name it explicitly.
- **In-house build** — for technical buyers, "we'll build it ourselves."

**Step 3 — Category strategy.** Decide one of three plays and commit:
- **Join an existing category** — fastest; you compete on differentiation inside a known frame. Use when buyers already budget for the category.
- **Subdivide a category** — claim a niche ("the X for Y", e.g., "the CRM for solo realtors"). Use when the broad category is crowded but a segment is underserved.
- **Create a new category** — most expensive (you fund the education), highest ceiling. Only attempt with strong funding and a genuinely new mechanism; most "new categories" should have been a subdivision.

**Step 4 — Differentiator stress test.** List each claimed differentiator and test it. Cut any that fail the first three columns; the survivors are your positioning.

| Differentiator | True? (provable today) | Relevant? (buyer cares) | Defensible? (hard to copy in 12 mo) | Verdict |
|----------------|------------------------|-------------------------|--------------------------------------|---------|
| Generates clean production code | Yes | Yes (devs inherit it) | Partly (architectural moat) | Keep |
| "Easy to use" | Subjective | Yes | No (everyone claims it) | Cut — too generic |
| 50+ integrations | Yes | For some segments | No (table stakes soon) | Demote to proof point |

Defensibility sources to look for: proprietary data/network effects, switching costs, a patented or genuinely novel mechanism, brand/community, or unit-economics advantage. "We work harder" and "better UX" are not durable moats on their own.

**Step 5 — Reasons to believe (RTB) evidence table.** Every differentiator needs ranked proof. Lead with the strongest verifiable evidence.

| Differentiator | RTB (proof) | Type | Strength |
|----------------|-------------|------|----------|
| Ship 10x faster | Independent benchmark: median deploy 14 min → 90 sec across 40 teams | 3rd-party data | Strong |
| Designer control | Patent US-XXXXXXX on the visual-binding compiler | IP | Strong |
| Reliability | 99.99% uptime SLA, public status page | Operational | Medium |
| Trust | "Used by Fortune-500 brand X (logo, with permission)" | Social proof | Medium |

**Step 6 — Final positioning variants.** Write 2-3 versions of the positioning statement (one safe/category-joining, one bolder/subdividing), then pressure-test each with 5-10 real prospects: read it aloud, ask "what does this company do, and who is it for?" Keep the version they can play back accurately and that makes the target lean in. Revisit positioning when the segment, competitive set, or product fundamentally changes — not on a calendar.

## Messaging Hierarchy

```
Tagline (5-8 words)
├── Value Proposition 1
│   ├── Proof Point 1a
│   └── Proof Point 1b
├── Value Proposition 2
│   ├── Proof Point 2a
│   └── Proof Point 2b
└── Value Proposition 3
    ├── Proof Point 3a
    └── Proof Point 3b
```

| Level | Purpose | Example |
|-----------------|-------------------------------|--------------------------------------|
| Tagline | Memorable, emotional hook | "Think Different" |
| Value props | Rational benefits (3 max) | "Ship 10x faster" |
| Proof points | Evidence for each value prop | "Used by 200K+ teams at Fortune 500" |
| RTBs | Why you can deliver | Patent, methodology, team expertise |

**Rules:**
- Taglines usually lead with emotion; value props usually lead with rational benefit. The best taglines fuse both — "Just Do It" is emotional but implies a functional promise, "The Ultimate Driving Machine" is rational framed emotionally. Pick a primary register per element so the message stays sharp, but don't force a wall between them.
- 3 value propositions maximum — more dilutes the message
- Every proof point must be verifiable
- Test messaging with real prospects, not your team

### Messaging Matrix (audience × message mapping)

Build one row per priority segment. This is the bridge from positioning to actual copy — it forces a different proof point and CTA per audience instead of one generic pitch.

| Segment | Job-to-be-done | Top objection | Proof to counter it | Primary CTA | Channel | Sample headline |
|---------|----------------|---------------|---------------------|-------------|---------|-----------------|
| Seed-stage founder | "Launch a credible site without hiring a dev" | "I'll outgrow a no-code tool" | Exports clean code; 200K+ teams scaled on it | Start free | Search/PLG | "Ship your launch site this weekend — no engineer required" |
| Marketing lead (Series B) | "Update pages without filing a Jira ticket" | "Will IT/eng approve it?" | SOC 2; role-based publishing; clean code review | Book a demo | Paid + outbound | "Your team ships pages. Engineering keeps its sprint." |
| Agency / freelancer | "Deliver client sites faster, bill more" | "Client lock-in / handoff" | White-label, client billing, code export | See partner program | Community/referral | "Build, bill, and hand off in one platform" |
| Enterprise procurement | "De-risk the buy" | "Security, SLA, compliance" | 99.99% SLA, SSO/SAML, DPA, EU data residency | Contact sales | ABM/sales | "Enterprise-grade governance for the web team" |

How to use it:
- **Job-to-be-done** is the customer's words, not your feature name. Pull these verbatim from interviews and support tickets.
- **Objection → proof** is the most valuable column: it pre-empts the reason each segment says no. If you have no proof for a real objection, that's a product/roadmap gap, not a copy gap.
- One **primary CTA** per segment per touchpoint — competing CTAs reduce conversion.
- Map message **stage** too if you sell over time: awareness (lead with the problem/JTBD), consideration (lead with differentiator + objection-handling proof), decision (lead with risk reduction — SLA, guarantee, references).

## Brand Voice & Tone Guide

**Voice** = personality (constant). **Tone** = mood (varies by context).

### Voice Definition Template

Define your voice on 4 spectrums:

| Spectrum | Our Position | Example |
|----------------------|--------------------------|-------------------------------|
| Formal ↔ Casual | Casual but competent | "Here's the deal" not "Hereby" |
| Serious ↔ Playful | Mostly serious, wit OK | Humor in social, not in legal |
| Technical ↔ Simple | Simple with depth option | Lead simple, link to deep dives |
| Bold ↔ Humble | Confident, not arrogant | "We built X" not "We're the best" |

### Tone by Context

| Context | Tone Shift | Example |
|------------------|----------------------------|---------------------------------|
| Marketing site | Confident, aspirational | "Build something remarkable" |
| Error messages | Helpful, calm | "Something went wrong. Here's what to try." |
| Social media | Conversational, human | "Okay this feature is *chef's kiss*" |
| Legal/compliance | Clear, neutral | "Your data is stored in the EU" |
| Crisis comms | Direct, empathetic | "We messed up. Here's what happened." |

### Full Voice & Tone Framework

**1. Three voice pillars.** Distill the brand into 3 adjectives, each made operational with a "this, not that" pair. Adjectives alone are useless to a writer; the contrast is what makes them usable.

| Pillar | We are… | We are not… | In practice |
|--------|---------|-------------|-------------|
| Direct | Plain-spoken, gets to the point | Curt or cold | "This costs $20/mo." not "Pricing varies based on a number of factors." |
| Encouraging | Optimistic, on the reader's side | Hype-y or condescending | "You've got this — here's step one." not "It's super easy!!" |
| Expert | Precise, evidence-led | Jargon-heavy or arrogant | "Latency dropped 60% in our tests." not "Blazing-fast, period." |

**2. Lexicon — words we use / words we avoid.** A shared word list keeps a 20-person team sounding like one brand.

| Use | Avoid | Why |
|-----|-------|-----|
| "people", "teams", "you" | "users", "consumers" | Humanize; speak to the reader |
| "help", "free up" | "leverage", "utilize", "synergy" | Plain English, no corporate filler |
| "we got this wrong" | "mistakes were made" | Own it; passive voice dodges accountability |
| product names exactly as styled | ad-hoc capitalization | Consistency builds recognition |

**3. Mechanics & house style.** Lock the small decisions so they aren't relitigated: capitalization (sentence case vs. title case for headings), Oxford comma (yes/no), contractions (yes for warmth), em dash vs. parenthesis, numerals ("spell out one-nine" vs. "always digits"), emoji policy by channel, and how you write dates/times/currency. Adopt a base reference (e.g., a major brand or AP/Chicago) and document only your deviations.

**4. Readability targets.** Set a reading-grade ceiling per surface (marketing/help ~grade 7-9; legal as required). Prefer short sentences, active voice, second person. Test copy against the targets before publishing.

**5. Accessibility & inclusivity in language.** Use plain language; expand acronyms on first use; write descriptive link text ("read the pricing guide", never "click here"); default to gender-neutral and people-first phrasing; avoid idioms that don't translate for a global/ESL audience. This makes copy work for screen readers and non-native speakers alike.

**6. Worked before/after example.**
- ❌ "Our best-in-class, enterprise-grade solution leverages cutting-edge AI to synergistically optimize your workflows."
- ✅ "Our AI drafts your first reply in seconds, so your team spends time on the hard tickets — not the easy ones."

Ship the voice guide with 5-8 such real before/after rewrites; writers copy patterns far faster than they internalize adjectives.

## Visual Identity System

| Element | Specification | Deliverable |
|---------------|--------------------------------------|-------------------------------|
| Logo | Primary, secondary, icon, monochrome | SVG + PNG at standard sizes |
| Color palette | Primary, secondary, neutral, semantic | Hex, RGB, HSL, CMYK values |
| Typography | Headings, body, mono, display | Font files + usage rules |
| Imagery | Photography style, illustration style | Mood board + do/don't examples |
| Iconography | Style, stroke weight, grid | Icon library + creation rules |
| Spacing/grid | Base unit, layout grid | Design tokens or spec sheet |

**Color palette structure:**
- Primary: 1-2 brand colors (used for CTAs, key elements)
- Secondary: 2-3 supporting colors
- Neutrals: 4-5 grays from near-white to near-black
- Semantic: Success, warning, error, info

### Visual Identity Audit & Accessibility Checklist

Run this when building a new system or auditing an existing one. Accessibility is not optional polish in 2026 — WCAG 2.2 AA is the de facto baseline and is referenced by the EU Accessibility Act (in force June 28, 2025) and US ADA/Section 508 expectations.

**Color & contrast (WCAG 2.2 AA):**
- [ ] Body text contrast ≥ **4.5:1** against its background.
- [ ] Large text (≥ 24px, or ≥ 18.7px bold) and UI/graphical components/focus indicators contrast ≥ **3:1**.
- [ ] Information is never conveyed by color alone (error states also use icon/text; chart series use labels/patterns).
- [ ] Brand color usable for CTAs at AA against white **and** the dark surface — if not, define an accessible "action" tint distinct from the marketing brand color.
- [ ] Verify combinations with a contrast checker (e.g., WebAIM, or the contrast lint in your design tool); document pass/fail per pairing.

**Dark mode:**
- [ ] Dedicated dark palette (don't just invert — pure-black #000 + pure-white #fff causes halation; use near-black ~#0E0F12 and off-white text).
- [ ] Elevation shown via lighter surfaces, not just shadows (shadows are weak on dark).
- [ ] Brand and semantic colors re-tuned for dark backgrounds and re-checked for AA contrast.

**Motion & animation:**
- [ ] Honor `prefers-reduced-motion`; provide a non-animated path for essential content.
- [ ] No content flashes more than **3 times per second** (seizure safety, WCAG 2.3.1).
- [ ] Animation is purposeful (feedback/continuity), short, and never blocks interaction.

**Logo system:**
- [ ] Minimum sizes specified: digital ~24px height for the icon/favicon, ~120px width for the full logo; print ~10mm height (set real numbers per logo and test legibility).
- [ ] Clear space defined as a ratio of a logo element (e.g., "= height of the wordmark's cap height").
- [ ] Variants for light bg, dark bg, monochrome, and a single-color knockout.
- [ ] Misuse examples documented (don't stretch, recolor, add effects, place on busy imagery, or rotate).

**Typography & layout:**
- [ ] Type scale defined (e.g., modular scale 1.250) with min body size ~16px on web.
- [ ] Line length ~45-75 characters; line-height ~1.5 for body.
- [ ] Webfont loading strategy set (`font-display: swap`, subset, preload) to avoid layout shift.

**Design tokens (naming conventions):**
Use a 3-tier token architecture so brand changes propagate without touching components:
- **Primitive / global** — raw values: `color.blue.500 = #2563EB`, `space.4 = 16px`.
- **Semantic / alias** — intent: `color.text.primary`, `color.bg.surface`, `color.action.default`, `color.feedback.error`.
- **Component** — scoped: `button.primary.bg`, `card.border.color`.
Name by role, never by appearance (`color.action.default`, not `color.green`) so re-skinning doesn't create lies. Define both `light` and `dark` themes at the semantic tier. Export to platforms via a tool like Style Dictionary or the W3C Design Tokens format so design and code stay in sync.

**Asset deliverables:**
- [ ] Logo: SVG (primary) + PNG @1x/@2x/@3x, favicon set, social avatars and OG/share images at correct dimensions.
- [ ] Color: hex, RGB, HSL, and CMYK + Pantone for print.
- [ ] Type: licensed webfont + desktop files, and named fallback stacks.
- [ ] Tokens published as JSON; icon set as an SVG sprite/library.

## Brand Audit Methodology

**Run annually or before major repositioning.**

1. **Internal audit:** Survey employees on brand perception, review all touchpoints
2. **External audit:** Customer interviews (10-15), prospect surveys, social listening
3. **Competitive audit:** Map competitors on key perception dimensions
4. **Touchpoint inventory:** List every place the brand appears, score consistency
5. **Gap analysis:** Internal perception vs external perception vs desired perception

### Touchpoint Inventory + Consistency Scoring

List every place the brand appears and score each 1-5 on visual, verbal, and experience consistency against the guidelines. Sort by `priority × gap` to find the highest-leverage fixes.

| Touchpoint | Owner | Reach/priority (1-5) | Visual (1-5) | Verbal/voice (1-5) | Experience (1-5) | Avg | Notes / gap |
|------------|-------|---------------------|--------------|--------------------|--------------------|-----|-------------|
| Homepage | Marketing | 5 | 4 | 3 | 4 | 3.7 | Voice drifts formal vs. guide |
| Onboarding emails | Lifecycle | 4 | 2 | 3 | 3 | 2.7 | Old logo, off-palette |
| Sales deck | Sales | 4 | 2 | 2 | — | 2.0 | Rebuilt ad-hoc per rep |
| Support macros | Support | 3 | — | 2 | 4 | 3.0 | Tone too robotic |
| App empty states | Product | 3 | 4 | 2 | 3 | 3.0 | No voice applied |
| Social profiles | Marketing | 4 | 4 | 4 | — | 4.0 | On-brand |

**Brand health score** = average of all touchpoint averages, weighted by priority. Track it over time; a single number makes drift visible to leadership.

### Customer Interview Script (30 min, 8-12 people)

Mix current customers, churned customers, and prospects who chose a competitor. Record verbatims — exact words become messaging copy.
1. Walk me through the last time you needed [the job]. What did you do? *(uncovers real JTBD and the status-quo alternative)*
2. What were you using before us, and why did you switch — or why haven't you? *(switching triggers and friction)*
3. In your own words, what do we do? Who is it for? *(positioning clarity check)*
4. If we disappeared tomorrow, what would you use instead, and what would you miss? *(differentiation and stickiness)*
5. Describe our brand as a person — how would you introduce them at a party? *(personality / voice perception)*
6. When did we frustrate or surprise you? *(experience gaps)*
7. Who else should hear about us, and how would you describe us to them? *(referral language)*

### Competitive Perception Axes

Score yourself and 3-5 competitors on the attributes your audience actually buys on (pull these from interview frequency, not internal opinion), 1-5 each. Then pick the two highest-variance, highest-importance attributes as the axes for the positioning map below.

| Attribute | Us | Comp A | Comp B | Comp C | Importance to buyer (1-5) |
|-----------|----|--------|--------|--------|----------------------------|
| Easy to adopt | 4 | 2 | 3 | 5 | 5 |
| Powerful/extensible | 3 | 5 | 4 | 2 | 4 |
| Trustworthy/secure | 4 | 4 | 5 | 3 | 5 |
| Value for money | 5 | 3 | 2 | 4 | 4 |

Look for a high-importance attribute where you outscore everyone and rivals are clustered — that whitespace is your positioning wedge.

### Competitive Positioning Map

Plot brands on a 2×2 matrix using the two dimensions that matter most to your audience:

```
        High Price
            │
  Premium   │   Luxury
  Niche     │   Established
            │
Low ────────┼──────── High
Innovation  │         Trust
            │
  Disruptor │   Value
  Challenger│   Incumbent
            │
        Low Price
```

Pick axes that reveal whitespace. Common pairs: price/quality, innovation/trust, simple/powerful.

## Brand Architecture

| Model | Structure | Example | Best When |
|------------------|-----------------------------|-----------------|-------------------------------|
| Branded house | Master brand drives all | Google, Virgin | Strong parent, related offerings |
| House of brands | Independent brands | P&G, Unilever | Diverse categories, M&A strategy |
| Endorsed | Sub-brands + parent endorsement | Marriott Bonvoy, Courtyard by Marriott | Credibility transfer needed |
| Hybrid | Mix of above | Amazon (AWS, Alexa, Whole Foods) | Large portfolio, some overlap |

**Decision criteria:**
- How related are the offerings? → Related = branded house
- Does the parent brand help or hurt? → Helps = endorsement
- Different audiences entirely? → House of brands
- Need to acquire and keep separate? → House of brands

## Naming Strategy

**Name types:**

| Type | Example | Pros | Cons |
|--------------|-------------|---------------------|--------------------------|
| Descriptive | General Motors | Instant clarity | Hard to trademark, boring |
| Invented | Spotify | Highly ownable | Requires education spend |
| Metaphor | Amazon | Evocative, memorable | Can feel random |
| Acronym | IBM | Short, professional | Meaningless until established |
| Founder | Goldman Sachs | Heritage, trust | Succession risk |

**Naming checklist (2026 realities):**
- [ ] **Domain:** exact-match `.com` is ideal but increasingly scarce; a strong brandable `.com` with a modifier (`getX.com`, `Xhq.com`, `tryX.com`) or a well-established alt TLD (`.ai`, `.io`, `.co`, `.app`) is acceptable. Buy obvious **defensive domains** (common misspellings, the `.com` if you launch on an alt TLD, and your country TLD).
- [ ] **Trademark:** clearance search in every target jurisdiction (USPTO, EUIPO, UKIPO, WIPO Global Brand DB) within the **Nice classification classes** you'll actually operate in — a mark can be free in your class but taken in an adjacent one that matters. Distinctive/invented marks register far more easily than descriptive ones. Budget for a trademark attorney before you commit spend; a clear search is not legal clearance. *(This is not legal advice — verify with a qualified IP attorney.)*
- [ ] **Marketplace / app-store conflicts:** check the Apple App Store, Google Play, GitHub, npm/PyPI, and Chrome/extension stores — these have their own naming uniqueness rules and reject confusingly similar names regardless of trademark status.
- [ ] **AI / search disambiguation:** Google the exact name and ask a couple of LLMs "what is [name]?" — if it collides with a famous brand, a common word, or another startup, you'll fight for SERP and AI-answer real estate forever. Prefer names that return *you* on the first page within months.
- [ ] **Social handles:** exact handle available (or acquirable) on the platforms you'll use; reserve them immediately even before launch.
- [ ] No negative or unintended meanings/slang in your key markets' languages.
- [ ] Pronounceable and spellable by the target audience — passes the "phone test" (say it aloud; can they spell it back?).
- [ ] Not tied to a single feature or geography you may outgrow.

## Brand Story Framework

```
1. ORIGIN:    Why we started (the problem we couldn't ignore)
2. MISSION:   What we do and for whom (present tense)
3. VISION:    The world we're building toward (future tense)
4. VALUES:    How we operate (3-5, actionable not generic)
5. PROOF:     Evidence we're living this (metrics, stories, milestones)
```

**Values anti-patterns:** "Innovation," "Integrity," "Excellence" — if every company claims it, it's not a differentiator. Make values specific and behavioral: "Ship before it's comfortable" > "Innovation."

## Brand Guidelines Document Structure

```
1. Brand Overview (positioning, story, values)
2. Logo Usage (versions, spacing, minimum size, misuse examples)
3. Color System (palettes, accessibility ratios, usage rules)
4. Typography (typefaces, hierarchy, sizing scale)
5. Imagery & Illustration (style, dos and don'ts)
6. Voice & Tone (guide + examples by context)
7. Layout & Grid (spacing system, templates)
8. Digital Applications (web, email, social templates)
9. Print Applications (business cards, signage, swag)
10. Co-branding Rules (partner lockups, minimum requirements)
```

### Starter Brand Guidelines Template

Copy this skeleton and fill the bracketed values. Aim for *prescriptive* (a writer/designer can execute without asking) over *descriptive*. Ship it as a living doc (web page or Figma) with a version number and changelog, not a frozen PDF.

```markdown
# [Brand] Brand Guidelines — v[1.0] · last updated [YYYY-MM-DD]

## 1. Foundation
- Positioning statement: For [audience] who [need], [brand] is the [category] that [differentiator] because [RTB].
- Mission (present): [...]   Vision (future): [...]
- Values (behavioral): [e.g., "Ship before it's comfortable"; "Default to transparency"]
- One-liner / boilerplate (50 words) for press & footers: [...]

## 2. Logo
- Files: /logo (svg, png @1x/2x/3x, favicon, social avatar, OG image)
- Clear space: ≥ [cap-height] on all sides.   Min size: icon [24px], full [120px] / print [10mm].
- Variants: full-color-light-bg, full-color-dark-bg, monochrome-black, monochrome-white (knockout).
- Misuse: do not stretch, recolor, add shadows/outlines, rotate, or place on low-contrast imagery.

## 3. Color
| Token (semantic)        | Light    | Dark     | Use                       |
|-------------------------|----------|----------|---------------------------|
| color.brand.primary     | #______  | #______  | Logo, key brand moments   |
| color.action.default    | #______  | #______  | Buttons, links (AA-safe)  |
| color.text.primary      | #______  | #______  | Body copy                 |
| color.bg.surface        | #______  | #______  | Cards, panels             |
| color.feedback.error    | #______  | #______  | Errors (never color-only) |
- All text/background pairs documented as passing WCAG AA (≥4.5:1 body, ≥3:1 large/UI).

## 4. Typography
- Headings: [Typeface], scale [modular 1.250], weights [600/700].
- Body: [Typeface], 16px base, line-height 1.5, measure 45-75ch.
- Mono (code/data): [Typeface].   Fallback stacks + webfont loading: font-display: swap.

## 5. Imagery & Illustration
- Photography: [style — e.g., natural light, candid, no stock clichés]. Do / Don't examples linked.
- Illustration: [style, stroke, palette subset]. Iconography: [grid, stroke weight, corner radius].

## 6. Voice & Tone
- Pillars: [adjective / "this, not that"] ×3.
- Lexicon: use [...]; avoid [...].   Mechanics: [sentence case headings, Oxford comma yes, contractions yes].
- Tone-by-context table + 5-8 before/after rewrites.

## 7. Layout & Tokens
- Spacing base unit [4px] / scale; grid [12-col, gutters].
- Design tokens published as JSON (primitive → semantic → component); light + dark themes.

## 8-9. Applications
- Digital: web hero, email header/footer, social templates, OG/share images (correct dimensions).
- Print: business card, letterhead, signage, swag — with bleed/Pantone specs.

## 10. Co-branding
- Partner lockup: [our logo] [divider] [partner logo], equal optical weight, min clear space, approved bg only.
- Approval: [who signs off], [turnaround], [where to request assets].
```


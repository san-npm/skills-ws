---
name: brand-strategy
description: "Brand positioning, messaging hierarchy, visual identity, and brand architecture frameworks for building and managing a cohesive brand system."
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

See `references/positioning-worksheet.md` for the full exercise.

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
- Tagline: emotional. Value props: rational. Don't mix them.
- 3 value propositions maximum — more dilutes the message
- Every proof point must be verifiable
- Test messaging with real prospects, not your team

See `references/messaging-matrix.md` for the audience × message mapping template.

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

See `references/voice-tone-guide-template.md` for the full framework.

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

See `references/visual-identity-checklist.md` for the complete audit list.

## Brand Audit Methodology

**Run annually or before major repositioning.**

1. **Internal audit:** Survey employees on brand perception, review all touchpoints
2. **External audit:** Customer interviews (10-15), prospect surveys, social listening
3. **Competitive audit:** Map competitors on key perception dimensions
4. **Touchpoint inventory:** List every place the brand appears, score consistency
5. **Gap analysis:** Internal perception vs external perception vs desired perception

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

**Naming checklist:**
- [ ] Domain available (.com or acceptable alternative)
- [ ] Trademark search clear in target markets
- [ ] No negative meanings in key languages
- [ ] Pronounceable by target audience
- [ ] Social handles available (or acquirable)
- [ ] Passes the "phone test" (say it, can they spell it?)

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

See `references/brand-guidelines-template.md` for a starter document.


---
name: ui-ux-pro-max
description: "Senior UI/UX design intelligence for web/app UI — design tokens, semantic color + contrast, type scales, component anatomy/states, WCAG 2.2 AA audits, dark mode, and responsive/container-query layouts. Use when designing, auditing, or implementing UI, picking palettes/fonts, fixing accessibility, or reviewing AI-generated UI."
---

# UI/UX Pro Max

Acts as a senior product designer + accessibility engineer. Use it to make design decisions defensible (not "looks nice"), audit interfaces against WCAG 2.2 AA, and turn rough UI into shipped, accessible, polished screens. Everything below is inline — there are no external reference files to fetch.

**Scope split with siblings:** this skill is the *judgment + accessibility* layer. For token build-out, Storybook, and Figma-to-code pipelines see `design-system`. For conversion-focused marketing pages see `landing-page-builder` and `page-cro`. For load/Core-Web-Vitals work see `web-performance` and `nextjs-performance`. Cross-link, don't duplicate.

---

## 0. The senior mental model (use this order)

Most "AI-looking" UI fails because it's assembled component-by-component with no system. Decide top-down:

1. **Purpose & hierarchy** — what is the one job of this screen? What must the eye hit first, second, third? Everything else is secondary.
2. **Layout & rhythm** — grid, spacing scale, alignment. Consistency reads as quality more than any color choice.
3. **Type** — one type scale, max 2 families, deliberate weight contrast.
4. **Color last** — neutrals carry 90% of a good UI; brand color is an accent, not a flood. Color is also the easiest accessibility failure.
5. **States & motion** — every interactive thing needs hover/focus/active/disabled/loading/error. Motion clarifies cause→effect; it is not decoration.
6. **Accessibility is not a phase** — it is a constraint on every step above, baked in, not bolted on at the end.

Senior tells that read as "premium": generous and *consistent* whitespace, a real type scale (not random px), restrained color, one accent, crisp focus states, optical alignment, and motion under 200ms for UI feedback. Junior tells: 6 competing colors, drop shadows everywhere, centered body text, inconsistent radii/spacing, no focus ring, and emoji used as icons.

---

## 1. Design tokens (the source of truth)

Never hardcode raw values in components. Define **primitive** tokens (raw scale) → map to **semantic** tokens (role-based) → consume semantic tokens only. This is what makes theming and dark mode tractable.

```css
:root {
  /* --- Primitives: the raw scale (don't reference these in components) --- */
  --blue-500: #2563eb;  --blue-600: #1d4ed8;  --blue-700: #1e40af;
  --slate-50:  #f8fafc; --slate-100: #f1f5f9; --slate-200: #e2e8f0;
  --slate-500: #64748b; --slate-700: #334155; --slate-900: #0f172a;
  --red-600:   #dc2626; --amber-500: #f59e0b; --green-600: #16a34a;

  /* --- Semantic: role-based aliases (THIS is what components use) --- */
  --color-bg:            var(--slate-50);
  --color-surface:       #ffffff;          /* cards, popovers */
  --color-fg:            var(--slate-900); /* primary text */
  --color-fg-muted:      var(--slate-500); /* secondary text */
  --color-border:        var(--slate-200);
  --color-primary:       var(--blue-600);
  --color-primary-hover: var(--blue-700);
  --color-primary-fg:    #ffffff;          /* text ON primary */
  --color-focus-ring:    var(--blue-500);
  --color-danger:        var(--red-600);
  --color-warning:       var(--amber-500);
  --color-success:       var(--green-600);

  /* Spacing: 4px base, geometric-ish so steps stay distinguishable */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
  --space-6: 24px; --space-8: 32px; --space-12: 48px; --space-16: 64px;

  /* Radius / elevation */
  --radius-sm: 4px; --radius-md: 8px; --radius-lg: 12px; --radius-full: 9999px;
  --shadow-sm: 0 1px 2px rgb(0 0 0 / .06);
  --shadow-md: 0 4px 12px rgb(0 0 0 / .10);
  --shadow-lg: 0 12px 32px rgb(0 0 0 / .14);

  /* Motion */
  --ease-out: cubic-bezier(.2, 0, 0, 1);
  --dur-fast: 120ms; --dur-base: 180ms; --dur-slow: 280ms;
}
```

**Naming rule:** semantic tokens describe *role*, not appearance — `--color-danger`, not `--color-red`. When you rebrand or theme, only the primitive→semantic mapping changes; components never move.
**For full token build-out** (TS token files, Style Dictionary, Tailwind theme mapping, Storybook docs), see `design-system`.

---

## 2. Color — palettes, semantic roles, and contrast

### Semantic color roles (assign every color a job)
| Role | Use | Note |
|---|---|---|
| Background / Surface | page vs. raised card | surface is usually 1 step lighter (light mode) or lighter (dark mode) |
| Foreground / Muted-foreground | primary vs. secondary text | muted must still pass 4.5:1 if it carries info |
| Primary + Primary-foreground | main CTA + its text | define the on-color, don't guess it |
| Border / Divider | structure | often `--color-fg` at 10–15% alpha |
| Danger / Warning / Success / Info | feedback | never the *only* signal — pair with icon + text (see §6) |
| Focus ring | keyboard focus | distinct, ≥3:1 vs. adjacent colors (WCAG 2.2 SC 1.4.11) |

### 10 production-ready palettes (with WCAG-checked pairings)
Each lists a brand accent and a neutral ramp. **Contrast is symmetric** — the accent-on-white ratio equals the white-on-accent ratio (same number), so one ratio column covers both directions. The last column is the *actionable* call: can white label text sit on the solid fill, or do you need dark text / a darker shade? Ratios are computed against pure white (`#FFFFFF`).

| # | Theme | Primary | Ratio vs #FFF (both directions) | White text on the fill? | Neutral ramp (50→900) | Best for |
|---|---|---|---|---|---|---|
| 1 | **Indigo SaaS** | `#4f46e5` | 6.3:1 ✅ passes for normal text | ✅ white label OK | `#f8fafc #e2e8f0 #94a3b8 #475569 #0f172a` | dashboards, B2B |
| 2 | **Emerald Fintech** | `#059669` | 3.8:1 ⚠️ large-text/UI only | ⚠️ white OK only for ≥18.66px bold / ≥24px; for normal text use `#047857` (700) | `#f0fdf4 #dcfce7 #86efac #15803d #052e16` | money, growth, eco |
| 3 | **Royal Trust** | `#1d4ed8` | 6.7:1 ✅ passes for normal text | ✅ white label OK | `#eff6ff #bfdbfe #60a5fa #1e40af #172554` | enterprise, security |
| 4 | **Rose Consumer** | `#e11d48` | 4.7:1 ✅ passes for normal text | ✅ white label OK (just clears 4.5) | `#fff1f2 #fecdd3 #fb7185 #be123c #4c0519` | lifestyle, social, DTC |
| 5 | **Amber Creator** | `#d97706` | 3.2:1 ⚠️ large-text/UI only | ⚠️ for normal text use fill `#b45309` (700) with white, or dark text only for large/UI | `#fffbeb #fef3c7 #fcd34d #b45309 #451a03` | media, creator tools |
| 6 | **Violet AI** | `#7c3aed` | 5.7:1 ✅ passes for normal text | ✅ white label OK | `#faf5ff #e9d5ff #c084fc #6d28d9 #2e1065` | AI/ML, premium tech |
| 7 | **Slate Pro** (neutral-only) | `#0f172a` | 17.8:1 ✅ passes for normal text | ✅ white/light text OK | `#f8fafc #e2e8f0 #94a3b8 #475569 #0f172a` | editorial, docs, minimal |
| 8 | **Teal Health** | `#0d9488` | 3.7:1 ⚠️ large-text/UI only | ⚠️ white OK only for ≥18.66px bold / ≥24px; for normal text use `#0f766e` (700) | `#f0fdfa #ccfbf1 #5eead4 #0f766e #042f2e` | health, calm, wellness |
| 9 | **Orange Energy** | `#ea580c` | 3.6:1 ⚠️ large-text/UI only | ⚠️ for normal text use fill `#c2410c` (700) with white, or dark text only for large/UI | `#fff7ed #ffedd5 #fdba74 #c2410c #431407` | sports, bold consumer |
| 10 | **Cyan Developer** | `#0891b2` | 3.7:1 ⚠️ large-text/UI only | ⚠️ white OK only for ≥18.66px bold / ≥24px; for normal text use `#0e7490` (700) | `#ecfeff #cffafe #67e8f9 #0e7490 #083344` | devtools, data |

**Critical reading of this table:** a mid-tone brand color (emerald, amber, teal, orange, cyan) often **fails 4.5:1 for normal body text on white** — and because contrast is symmetric, white text on that same color as a button fill fails identically. A "⚠️" color is fine for large text (≥24px, or ≥18.66px bold), icons, focus rings, and borders (the 3:1 UI/large bar), but for normal-size button labels or links you must drop to a **darker shade (700–900)** — the on-color shown in the last column. Always verify the *actual* pair you ship; these ratios are against pure white only, and dark mode changes everything (see §8).

### Build a neutral ramp that doesn't look muddy
- Don't use pure gray (`#808080`). Tint neutrals slightly toward your brand hue (cool slate for blue/indigo, warm stone for amber/orange). Tinted neutrals look intentional; pure gray looks default.
- You need ~9 steps: 2 backgrounds, 2 borders, 3 text levels, 2 for inverse/overlays.

### Contrast thresholds (WCAG 2.2 SC 1.4.3 / 1.4.11)
| Element | Minimum (AA) | Enhanced (AAA) |
|---|---|---|
| Body text (<18.66px, or <24px non-bold) | **4.5:1** | 7:1 |
| Large text (≥24px, or ≥18.66px bold) | **3:1** | 4.5:1 |
| UI components & graphical objects (borders, icons, focus ring, chart series) | **3:1** | — |
| Disabled controls & pure decoration | exempt | — |

Tools: Chrome DevTools "Contrast" line in the color picker, the WebAIM Contrast Checker, or the APCA preview in DevTools (APCA is the perceptual model proposed for the future WCAG 3.0 — informative today, not yet normative).

---

## 3. Typography

### Rules
- **Max 2 families:** one display/heading, one body. A single excellent family with weight contrast (e.g. Inter 400/600/700) often beats two mediocre ones.
- **System stack** when performance/zero-FOUT matters:
  `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;`
- **Type scale** — pick a ratio and stick to it. Common: Major Third (×1.25) for dense UI, Perfect Fourth (×1.333) for marketing. Don't pick px at random.

  | Token | px | rem | Use |
  |---|---|---|---|
  | xs | 12 | .75 | captions, legal, metadata |
  | sm | 14 | .875 | secondary text, table cells, inputs |
  | base | 16 | 1 | body (**never set base body below 16px** — it forces zoom on iOS) |
  | lg | 18 | 1.125 | lead paragraph |
  | xl | 20 | 1.25 | small headings |
  | 2xl | 24 | 1.5 | H3 |
  | 3xl | 30 | 1.875 | H2 |
  | 4xl | 36 | 2.25 | H1 (app) |
  | 5xl | 48 | 3 | hero |
  | 6xl | 60 | 3.75 | marketing hero |

- **Line-height:** 1.5–1.6 body, 1.1–1.25 headings (tighter as size grows). Set as unitless.
- **Measure (line length):** 50–75 characters. Use `max-width: 65ch`. Long lines tank readability.
- **Letter-spacing:** slightly negative on large headings (`-0.02em`); positive on all-caps/overlines (`+0.05em`).
- **Weights:** ship only the weights you use (each adds ~15–40KB). Use `font-display: swap` and preload the body font.
- **Numbers in tables/dashboards:** enable tabular figures so digits align: `font-variant-numeric: tabular-nums;`.

### 8 proven font pairings (Google Fonts unless noted)
| # | Heading | Body | Vibe |
|---|---|---|---|
| 1 | **Inter** 600/700 | Inter 400 | Modern SaaS default; safe, clean, free |
| 2 | **Geist** (Vercel) | Geist | Crisp dev/AI product feel |
| 3 | **Space Grotesk** | Inter | Techy headline + neutral body |
| 4 | **Fraunces** (display) | Inter | Editorial warmth + clean body |
| 5 | **Playfair Display** | Source Sans 3 | Luxury / fashion / serif elegance |
| 6 | **Sora** | IBM Plex Sans | Geometric, confident, fintech |
| 7 | **Libre Franklin** | Lora | News/long-form (sans head + serif body) |
| 8 | **Clash Display** (Fontshare) | Satoshi (Fontshare) | High-design startup, distinctive |

Pairing logic: **contrast the categories** (serif + sans, display + neutral, or one family at two extreme weights). Avoid two sans-serifs of similar personality — they look like a mistake, not a pairing.

---

## 4. Spacing, layout & responsive

### Spacing scale (4px base)
`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`. The single biggest "looks junior" fix is using **one consistent scale** for padding, gaps, and margins instead of arbitrary values. Related elements close, unrelated elements far (proximity).

### Breakpoints (mobile-first)
| Token | min-width | Target |
|---|---|---|
| sm | 640px | large phone / small tablet portrait |
| md | 768px | tablet |
| lg | 1024px | laptop |
| xl | 1280px | desktop |
| 2xl | 1536px | large desktop |

```css
/* Mobile-first: base styles are mobile; min-width queries enhance up. */
.grid { display: grid; gap: var(--space-4); grid-template-columns: 1fr; }
@media (min-width: 768px) { .grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1024px){ .grid { grid-template-columns: repeat(3, 1fr); } }
```

### Container queries (use these in 2026, not just viewport queries)
Component-level responsiveness is now baseline across modern browsers. A card should adapt to *its container*, not the viewport — essential for reusable components placed in sidebars, grids, and slots.

```css
.card-wrap { container-type: inline-size; container-name: card; }
.card { display: grid; gap: var(--space-2); }
@container card (min-width: 380px) {
  .card { grid-template-columns: 96px 1fr; align-items: center; }
}
```

### Fluid sizing without breakpoints
`clamp()` removes whole tiers of media queries for type and spacing:
```css
h1 { font-size: clamp(1.75rem, 1.2rem + 2.5vw, 3rem); }
.section { padding-block: clamp(2rem, 5vw, 6rem); }
```

### Layout primitives
- Page shell with sticky header + scroll body: CSS grid `grid-template-rows: auto 1fr auto`.
- Center a column with breathing room: `width: min(100% - 2rem, 72rem); margin-inline: auto;`.
- Use **logical properties** (`padding-inline`, `margin-block`, `inset-inline-start`) so RTL languages work for free.

---

## 5. Interaction states & motion

### Every interactive element needs all of these
| State | Cue | Note |
|---|---|---|
| Default | resting | — |
| Hover | subtle bg/elevation shift | pointer devices only; never the *only* affordance |
| **Focus-visible** | clear ring, ≥3:1, ≥2px, offset | keyboard users depend on this — **never `outline:none` without a replacement** |
| Active/pressed | slight scale/darken (~98%) | confirms the press |
| Disabled | reduced opacity + `cursor:not-allowed` | must be programmatically disabled too (`disabled`/`aria-disabled`) |
| Loading | spinner/skeleton + disable | prevent double-submit; keep layout stable |
| Selected/current | persistent emphasis | e.g. active nav item, `aria-current="page"` |
| Error/invalid | color **+ icon + text** | not color alone |

```css
/* Modern focus: only show ring for keyboard, not mouse clicks */
.btn:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
```

### Motion guidelines
- **Durations:** 100–200ms for UI feedback (hover, toggle, dropdown); 200–300ms for larger transitions (modal, drawer, page). Over ~400ms feels sluggish.
- **Easing:** ease-out (`cubic-bezier(.2,0,0,1)`) for elements entering; ease-in for exits. Avoid pure linear except marquees/spinners.
- **Animate cheap properties:** `transform` and `opacity` (GPU-composited). Avoid animating `width`/`height`/`top`/`left`/`box-shadow` — they trigger layout/paint and jank.
- **Purpose:** motion should show relationships (where a panel came from), provide feedback (button press), or guide attention (toast) — never just decorate.
- **Respect reduced motion** (SC 2.3.3 Animation from Interactions, Level AAA: strongly recommended best practice, though AA laws such as the EAA and DOJ Title II stop at AA):
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 6. Component patterns (anatomy, states, keyboard, ARIA cautions)

**Golden rule of ARIA:** *No ARIA is better than bad ARIA.* Prefer native elements — `<button>`, `<a href>`, `<input>`, `<dialog>`, `<select>`, `<details>` — they bring focus, keyboard, and semantics for free. Reach for ARIA only when no native element exists. Follow the [ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/) patterns rather than inventing roles.

### Buttons
- **Use `<button>`** for actions, `<a href>` for navigation. A clickable `<div>` is an accessibility bug.
- Variants: primary (1 per view ideally), secondary, tertiary/ghost, destructive. Destructive actions get confirmation or undo.
- Min size: see Target Size in §7. Label must be meaningful; icon-only buttons need `aria-label`.
- States: all of §5. Disabled buttons should explain *why* nearby (tooltip/help text), since disabled controls aren't focusable.

### Forms & inputs
- **Every input has a persistent visible `<label>`** linked via `for`/`id`. Placeholder is **not** a label (it vanishes on input, fails contrast, breaks autofill).
- Group related fields with `<fieldset>` + `<legend>` (e.g. radio groups, address blocks).
- Mark required fields in text, not color/asterisk alone; add `aria-required`/`required`.
- **Errors:** show inline next to the field, link via `aria-describedby`, set `aria-invalid="true"`, summarize at top for long forms, and move focus to the first error on submit. Never rely on red border alone (§ color-alone).
- Use correct `type`/`inputmode`/`autocomplete` (`email`, `tel`, `inputmode="numeric"`, `autocomplete="one-time-code"`) — this powers WCAG 2.2 **Accessible Authentication** and mobile keyboards.
- Don't disable the submit button to enforce validation; let users submit and show errors (a disabled button gives no feedback about what's wrong).

### Dialog / Modal
- Prefer the native `<dialog>` element with `showModal()` — it provides the top layer, backdrop, and Esc-to-close.
- Requirements: **focus moves into the dialog on open**, **focus is trapped** inside while open, **Esc closes**, and **focus returns to the trigger** on close.
- `role="dialog"` + `aria-modal="true"` + `aria-labelledby` (title) / `aria-describedby` (body) if not using native `<dialog>`.
- Make the rest of the page inert (`inert` attribute or `aria-hidden` on the background) so SR/keyboard can't reach it.
- WCAG 2.2 SC 2.4.11 **Focus Not Obscured:** sticky headers/footers must not cover the focused element.

### Tables (data)
- Use real `<table>` with `<thead>`, `<th scope="col|row">`, `<caption>`. Don't fake tables with divs.
- Right-align numbers, left-align text; use tabular figures.
- Sortable headers: `<button>` inside `<th>`, expose state with `aria-sort="ascending|descending|none"`.
- Sticky header for long tables; horizontal scroll container on mobile with a visible affordance — don't silently truncate columns.
- Zebra striping is optional; clear row separation + adequate row height (≥40px) matters more.

### Navigation
- Wrap in `<nav aria-label="Primary">`; mark current with `aria-current="page"`.
- Provide a **skip link** to main content as the first focusable element (WCAG 2.4.1).
- Mobile menu (hamburger): button with `aria-expanded` + `aria-controls`; trap focus when open; Esc closes; restore focus to the toggle.
- Don't hide nav behind a hamburger on desktop where space allows — discoverability cost.

### Combobox / Autocomplete (hard to get right)
- This is the most error-prone widget — follow the **APG Combobox pattern** exactly. Hand-rolled ones are usually broken for SR users; prefer a vetted headless lib (Radix, React Aria, Headless UI).
- Essentials: `role="combobox"` on the input, `aria-expanded`, `aria-controls` → listbox, `aria-activedescendant` for the virtually-focused option; ↑/↓ move, Enter selects, Esc closes, type filters.
- Announce result count via a polite live region ("3 results").

### Toast / Notification
- Container is a **live region**: `role="status"` + `aria-live="polite"` for routine, `role="alert"` (assertive) only for genuinely urgent messages.
- **Don't auto-dismiss critical messages** — auto-dismiss timers fail WCAG 2.2.1 (Timing Adjustable) and miss users who read slowly. Provide a manual close; if auto-dismissing, ≥5s and pausable.
- Never put the only copy of an action (e.g. "Undo") in a toast that vanishes.
- Stack, don't overlap; cap visible count; don't trap focus (toasts shouldn't steal focus).

### Cards
- Anatomy: media → eyebrow/category → title → supporting text → metadata/actions.
- **Whole-card-clickable trap:** don't wrap the entire card in `<a>` if it contains other links/buttons (invalid nesting, SR confusion). Use the "stretched link" pattern — a single real `<a>` on the title with a pseudo-element overlay (`::after { position:absolute; inset:0 }`); keep secondary buttons above it with `position:relative; z-index:1`.
- Keep cards in a set visually consistent (equal heights via grid, consistent padding/radius).

### Disclosure / Accordion / Tabs
- Disclosure/accordion: a `<button aria-expanded>` toggling a region — or just native `<details>`/`<summary>`.
- Tabs: APG Tabs pattern — `role="tablist"` / `tab` / `tabpanel`, arrow keys move between tabs, only the active tab is in the tab order (`tabindex` roving).

---

## 7. Accessibility audit — WCAG 2.2 AA

**Baseline for 2026:** target **WCAG 2.2 Level AA**. WCAG 2.2 has been a W3C Recommendation since 5 Oct 2023 and supersedes 2.1 (2.2 is backward-compatible — meeting 2.2 means you meet 2.1). WCAG 3.0 is still an early Working Draft and is **not** a conformance target yet. See the [WCAG 2.2 spec](https://www.w3.org/TR/WCAG22/) and [What's New in 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/).

> **Legal context (verify for your jurisdiction):** the EU **European Accessibility Act (EAA)** has applied to new in-scope products/services since **28 June 2025**, with existing services to comply by **28 June 2030**; it broadly maps to WCAG/EN 301 549. The US **ADA** (DOJ April 2024 Title II rule adopts WCAG 2.1 AA for state/local govt) and **Section 508** also drive demand. Penalties and exact scope are set per member state / regulator — confirm specifics with counsel; don't rely on a single headline figure.

### Quick audit checklist (carried over + corrected)
- [ ] Text contrast ≥ 4.5:1 (body), ≥ 3:1 (large text & UI components/icons/focus ring) — SC 1.4.3, 1.4.11
- [ ] **Informative** images have meaningful `alt`; **decorative** images use empty `alt=""` (or `role="presentation"`) so SR skip them; complex images (charts) have a longer text alternative nearby — SC 1.1.1
- [ ] Fully keyboard operable (Tab/Shift-Tab, Enter/Space, Esc, Arrow keys); **no keyboard traps** — SC 2.1.1, 2.1.2
- [ ] **Focus visible** and clearly styled (`:focus-visible`, ≥3:1, not removed) — SC 2.4.7, 1.4.11
- [ ] Inputs have persistent visible labels linked to the field; errors are described and associated; required state in text — SC 1.3.1, 3.3.1, 3.3.2, 4.1.2
- [ ] **No information conveyed by color alone** — pair with icon/text/pattern (errors, chart series, status dots) — SC 1.4.1
- [ ] Skip-to-content link present as first focusable element — SC 2.4.1
- [ ] **Headings are meaningful and properly nested** (one `<h1>` per page/view; don't skip levels *when the structure implies them*). Note: WCAG requires programmatic structure and labels (SC 1.3.1, 2.4.6), not a rigid "never skip a level" rule for every visual edge case — but skipping levels usually signals a real hierarchy problem, so fix the structure, not just the tag.
- [ ] Page has a descriptive `<title>`, correct `lang` attribute, and landmarks (`<main>`, `<nav>`, `<header>`, `<footer>`)
- [ ] Content reflows at 320px width / 400% zoom with no horizontal scroll or loss — SC 1.4.10
- [ ] Respects `prefers-reduced-motion` (SC 2.3.3, AAA, best practice); no content flashes >3×/sec (SC 2.3.1, A)
- [ ] Supports `prefers-contrast` / Windows **forced-colors / High Contrast Mode** (see §9)

### WCAG 2.2 — the 9 new criteria (don't miss these; they're what audits flag in 2026)
| SC | Level | What it requires | Common fix |
|---|---|---|---|
| **2.4.11 Focus Not Obscured (Minimum)** | AA | The focused element isn't entirely hidden by sticky headers/footers/overlays | Add `scroll-margin`/`scroll-padding`; ensure sticky bars don't cover focus |
| 2.4.12 Focus Not Obscured (Enhanced) | AAA | Focused element not obscured *at all* | — |
| 2.4.13 Focus Appearance | AAA | Minimum focus-indicator size/contrast | thick, high-contrast ring |
| **2.5.7 Dragging Movements** | AA | Any drag action has a single-pointer (tap/click) alternative | add buttons/inputs alongside sliders, drag-reorder, drag-to-resize |
| **2.5.8 Target Size (Minimum)** | AA | Pointer targets ≥ **24×24 CSS px**, *with documented exceptions* (inline links in text, spacing-equivalent, essential, user-agent-controlled) | size small icon buttons up; add hit-area padding |
| **3.2.6 Consistent Help** | A | Help mechanisms (contact, chat, FAQ link) appear in a consistent relative order across pages | keep the help link in a fixed location |
| **3.3.7 Redundant Entry** | A | Don't force re-entering info already given in the same process | autofill / "same as billing" / carry values forward |
| **3.3.8 Accessible Authentication (Minimum)** | AA | No cognitive-function test (e.g. transcribing a code, solving a puzzle, remembering a password) without an alternative | allow password managers/paste, passkeys/WebAuthn, OTP autofill, email magic links |
| 3.3.9 Accessible Authentication (Enhanced) | AAA | Stricter; no object-recognition/personalization tests either | passkeys |

> **Correcting common myths:**
> - "Touch targets must be 44×44px" is **iOS/Apple HIG guidance**, not WCAG. WCAG **2.5.8 (AA)** requires **24×24 CSS px** *with exceptions*; AAA **2.5.5** asks for 44×44. Use 44px where you can (it's better UX), but the AA bar is 24px.
> - "All images need alt text" is wrong — *decorative* images need **empty** `alt=""` so screen readers skip them.

### How to actually test (don't trust automated scanners alone)
Automated tools (axe DevTools, Lighthouse, WAVE, Pa11y) catch ~30–50% of issues. The rest needs manual testing:
1. **Unplug the mouse** — operate the whole flow with the keyboard. Can you reach and use everything? Is focus visible and logically ordered? Any traps?
2. **Screen reader pass** — VoiceOver (macOS/iOS, free), NVDA (Windows, free), or TalkBack (Android). Tab through; do labels, roles, and states announce correctly?
3. **Zoom to 400%** and set viewport to 320px — does content reflow without horizontal scroll?
4. **Forced-colors / High Contrast Mode** (Windows) — does anything disappear or become unreadable?
5. **Reduced motion** on — do animations calm down?

---

## 8. Dark mode

Dark mode is not "invert the colors." Design it as a second theme over the same semantic tokens.

```css
:root { color-scheme: light; /* light tokens as in §1 */ }

@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;            /* themes native scrollbars/form controls */
    --color-bg:      #0b1120;      /* near-black, slightly blue — not #000 */
    --color-surface: #131c2e;      /* raised = LIGHTER than bg in dark mode */
    --color-fg:      #e2e8f0;      /* off-white, not #fff (reduces glare) */
    --color-fg-muted:#94a3b8;
    --color-border:  #1e293b;
    --color-primary: #6366f1;      /* lift saturated brand a step; pure brand often too dark on dark */
    --color-primary-fg:#0b1120;
  }
}
/* If you also offer a manual toggle, mirror the same vars under [data-theme="dark"]. */
```

Dark-mode rules:
- **Never pure black `#000` on pure white `#fff` text** — too much glare/halation. Use ~`#0b1120` bg and ~`#e2e8f0` text.
- **Elevation flips:** in light mode raised surfaces are lighter + cast shadows; in dark mode raised surfaces are **lighter than the background** (shadows barely read).
- **Re-check contrast** — pairs that pass in light mode can fail in dark; verify both themes.
- **Desaturate large color fills** slightly; vivid brand colors vibrate on dark backgrounds. Conversely, *small* accents often need to be a step brighter to stay legible.
- Set `color-scheme` so native UI (scrollbars, inputs, date pickers) matches.
- Don't forget images/illustrations with baked-in white backgrounds — give them a subtle surface or a dark variant.

---

## 9. Modern hard-mode details (what separates senior output)

- **Forced-colors mode (Windows High Contrast):** the OS overrides your colors with a user palette. Use the `forced-colors: active` media query and `system-color` keywords; ensure icons drawn with `background-image` get a `forced-color-adjust` fallback or a real `<svg>`/text so they don't vanish. Test it.
- **`prefers-contrast`:** offer a higher-contrast token set for `prefers-contrast: more`.
- **Skeletons over spinners** for content loading (preserve layout, reduce perceived wait); use spinners only for short, indeterminate actions. Keep layout stable to avoid CLS.
- **Empty / error / loading states are part of the design**, not afterthoughts. Every list/table/search needs: empty (with a helpful next action), loading (skeleton), error (retry), and the populated state.
- **Optical alignment beats mathematical** — icons next to text often need a 1–2px nudge; circular avatars/badges may need optical, not geometric, centering.
- **Hit areas > visual size** — a 16px icon button can have 24–44px of invisible padding to meet target size without looking bulky.
- **Don't ship emoji as UI icons** — inconsistent across platforms, not scalable, poor a11y. Use an icon set (Lucide, Heroicons, Phosphor) with `aria-hidden="true"` on decorative icons and `aria-label` on icon-only controls.
- **Internationalization:** text expands ~30% in German/Finnish; design flexible containers, avoid text in images, use logical properties for RTL, and don't hardcode currency/date/number formats.

---

## 10. Reviewing AI-generated UI (and your own)

AI-generated UI has a recognizable failure signature. When auditing it (or your first pass), check for:

| Smell | Fix |
|---|---|
| **Generic "AI gradient" hero** (purple→blue blob), centered everything, three feature cards with emoji | Establish real hierarchy; replace decorative gradients with purposeful color; left-align body text |
| **No focus states** / `outline:none` | Add `:focus-visible` rings (§5) |
| **Color-only status** (red text, no icon/label) | Add icon + text (§2, §7) |
| **Inconsistent spacing/radii** (arbitrary px) | Snap everything to the scale (§1, §4) |
| **Placeholder-as-label** inputs | Add persistent `<label>` (§6) |
| **Clickable `<div>`s**, fake buttons/tables | Use native `<button>`/`<a>`/`<table>` (§6) |
| **Lorem ipsum / fake metrics** left in | Real content; never ship invented numbers/logos |
| **Over-shadowed, over-rounded** everything | One elevation system; consistent radius scale |
| **No dark mode / breaks at 320px / no reduced-motion** | Cover all themes & states (§7, §8) |
| **Low information density** padding everywhere on a data tool | Match density to context — dashboards are denser than marketing |

### 12-point senior design-review checklist
1. Is there a clear primary action and visual hierarchy on every screen?
2. One consistent spacing scale and radius scale?
3. One type scale, ≤2 families, deliberate weight contrast?
4. Restrained color — neutrals dominate, one accent, semantic feedback colors?
5. Do all interactive elements have hover/**focus-visible**/active/disabled/loading?
6. Contrast checked (light **and** dark) — body 4.5:1, large/UI 3:1?
7. Fully keyboard operable, no traps, logical focus order, skip link?
8. Labels, error handling, and `aria-*` correct on forms and widgets?
9. No info by color alone?
10. Responsive at 320px → 4K; container queries for reusable components; reflow at 400% zoom?
11. Empty / loading / error / success states all designed?
12. Reduced-motion, forced-colors, and dark mode all handled?

A design that passes all 12 reads as senior. Most don't pass 5/12 on the first try — run the list, fix the gaps, ship.

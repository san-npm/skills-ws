---
name: ui-ux-pro-max
description: "UI/UX design intelligence. Style guides, color palettes, font pairings, component patterns, accessibility audit (WCAG 2.1 AA), responsive design patterns, animation guidelines. Use when designing user interfaces, choosing color palettes, selecting font pairings, auditing accessibility, reviewing UI code, creating component libraries, or implementing responsive layouts."
---

# UI/UX Pro Max v2

## Design System Quick Start

### 1. Color Palette
Choose a primary, secondary, and neutral:
- **Primary**: Brand color, used for CTAs and key actions
- **Secondary**: Complementary, used for highlights
- **Neutral**: Gray scale for text, borders, backgrounds
- **Semantic**: Success (green), Warning (amber), Error (red), Info (blue)

Ensure 4.5:1 contrast ratio for text on all backgrounds (WCAG AA).

Palette examples: [references/color-palettes.md](references/color-palettes.md)

### 2. Typography
- Max 2 fonts: one for headings, one for body
- System font stack for performance: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- Scale: 12, 14, 16, 18, 20, 24, 30, 36, 48, 60
- Line height: 1.5 for body, 1.2 for headings
- Max line width: 65-75 characters

Font pairing suggestions: [references/font-pairings.md](references/font-pairings.md)

### 3. Spacing
Use a 4px or 8px base grid:
- 4px (xs), 8px (sm), 12px (md), 16px (lg), 24px (xl), 32px (2xl), 48px (3xl), 64px (4xl)
- Consistent padding and margins throughout

### 4. Components
Standard component patterns: [references/component-patterns.md](references/component-patterns.md)

## Accessibility Audit (WCAG 2.1 AA)

Full checklist: [references/a11y-checklist.md](references/a11y-checklist.md)

Quick checks:
- [ ] Color contrast ≥ 4.5:1 (text), ≥ 3:1 (large text, UI components)
- [ ] All images have alt text
- [ ] Keyboard navigable (Tab, Enter, Escape, Arrow keys)
- [ ] Focus indicators visible
- [ ] Form labels associated with inputs
- [ ] Error messages descriptive and associated with fields
- [ ] No content conveys meaning through color alone
- [ ] Skip navigation link for screen readers
- [ ] Heading hierarchy (H1→H2→H3, no skipping)
- [ ] Touch targets ≥ 44px × 44px

## Responsive Breakpoints

```css
/* Mobile first */
/* sm: 640px */
/* md: 768px */
/* lg: 1024px */
/* xl: 1280px */
/* 2xl: 1536px */
```

Design mobile first, enhance for larger screens.

## References

- [references/a11y-checklist.md](references/a11y-checklist.md) — Complete WCAG 2.1 AA checklist
- [references/component-patterns.md](references/component-patterns.md) — UI component best practices
- [references/color-palettes.md](references/color-palettes.md) — 10 ready-to-use palettes
- [references/font-pairings.md](references/font-pairings.md) — 15 proven font combinations

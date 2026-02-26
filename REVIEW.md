# Repository Review & Code Audit — skills.ws

**Date:** 2026-02-26
**Repo:** san-npm/skills-ws
**Branch:** claude/repo-review-audit-DLdT5
**Stack:** Next.js 14.2 (static export), React 18, TypeScript, Tailwind CSS, Three.js

---

## Project Overview

A Next.js website for **skills.ws** — a catalog of 60 agent skills (SKILL.md files) for AI coding assistants (OpenClaw, Claude Code, Cursor, Codex, Gemini CLI). The site serves as a marketing homepage, documentation hub, and installation gateway via `npx skills-ws`.

### Architecture

```
app/
  layout.tsx         — Root layout: nav, GA4, 4× JSON-LD schemas
  page.tsx           — Homepage: ASCII banner, search/filter grid, stats
  sitemap.ts         — Dynamic XML sitemap
  not-found.tsx      — Custom 404
  skills/[name]/     — Dynamic skill detail pages (SSG)
  docs/              — Static docs page
  cli/               — CLI reference page
  faq/               — FAQ with accordion + FAQPage schema
components/
  AsciiBackground    — WebGL Three.js → ASCII art canvas (homepage only)
  SkillsGrid         — Client-side search/filter grid
  SkillContent       — Markdown renderer (react-markdown + remark-gfm)
  InstallBox         — Copy-to-clipboard install command
  FaqAccordion       — Expandable Q&A
  NpmDownloads       — Live npm download counter (client-side, cached)
lib/
  skills.ts          — Skill data access, types, category colors
skills.json          — 60 skills with full markdown content (~357KB)
skills-data/         — 60 directories, each with SKILL.md
public/
  skills.json        — Served copy (should match root)
  install.sh         — Bash installer script
  llms.txt           — LLM-readable skill index
  llms-full.txt      — Full LLM content dump
  robots.txt         — Crawl directives + sitemap
  og.png             — OpenGraph image (1200×630)
  favicon.ico        — Favicon (32×32)
  favicon.svg        — SVG favicon
```

---

## Findings Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 1 |
| HIGH | 6 |
| MEDIUM | 14 |
| LOW | 12 |
| **Total** | **33** |

---

## CRITICAL

### 1. Hardcoded "60" skill count in metadata will drift on every skill addition

**Files:** `app/layout.tsx:21,61,75,190` · `app/cli/page.tsx:7`
**Category:** SEO / Maintenance

The string `"60 agent skills"` is hardcoded in 5 places across meta description, OpenGraph, Twitter card, and SoftwareApplication JSON-LD. The homepage body correctly uses `{skills.length}` and the CLI page body uses `{skillCount}`, but all `<meta>` descriptions are static strings. Every skill addition requires a multi-file find-and-replace — a maintenance trap that guarantees stale SEO data.

**Fix:** Derive the count from `getSkills().length` in metadata generation, or remove specific numbers from static meta strings.

---

## HIGH

### 2. Dead `useNpmDownloads()` hook — 22 lines of unused client code

**File:** `components/SkillsGrid.tsx:8-29`
**Category:** Dead Code / Bundle Size

A complete custom hook `useNpmDownloads()` is defined (with `useState`, `useEffect`, `fetch`, `sessionStorage` caching) but never called anywhere. The identical logic already lives in `components/NpmDownloads.tsx` which is the component actually used. This is dead code that inflates the client bundle.

**Fix:** Delete lines 8-29 from `SkillsGrid.tsx`.

### 3. BreadcrumbList schema is static and incorrect on 60+ pages

**File:** `app/layout.tsx:205-240`
**Category:** SEO / Structured Data

The BreadcrumbList JSON-LD is injected in the root layout and always shows the same 4 items (Home → Skills → Docs → CLI). This renders on every page including `/faq`, all 60 `/skills/[name]` pages, and the 404. A BreadcrumbList should represent the navigational path to the *current* page. Google may show incorrect breadcrumbs in SERPs for skill pages.

**Fix:** Move breadcrumb generation to individual pages or generate dynamically based on route.

### 4. FaqAccordion has zero ARIA attributes — WCAG 4.1.2 failure

**File:** `components/FaqAccordion.tsx:17-34`
**Category:** Accessibility

The accordion buttons lack `aria-expanded`, `aria-controls`, and `id`. The panels lack `role="region"`, `aria-labelledby`, and `id`. Screen readers cannot determine which items are expanded or collapsed. This is a WCAG 2.1 Level A violation.

**Fix:** Add `aria-expanded={open === i}`, `aria-controls={`faq-panel-${i}`}` to buttons. Add `id`, `role="region"`, `aria-labelledby` to panels.

### 5. `<nav>` has no accessible label

**File:** `app/layout.tsx:111`
**Category:** Accessibility

The `<nav>` element has no `aria-label`. If a page has multiple nav landmarks, screen reader users cannot distinguish them.

**Fix:** Add `aria-label="Main navigation"`.

### 6. `softwareVersion` in JSON-LD conflicts with `skills.json` version

**File:** `app/layout.tsx:188`
**Category:** SEO / Structured Data

The SoftwareApplication schema says `softwareVersion: "0.1.0"` (matching `package.json`), but all 60 skills in `skills.json` say `"version": "1.0.0"`. These are different things (CLI version vs skill version), but the inconsistency could confuse search engines. No single source of truth.

**Fix:** Import version from `package.json` dynamically for the CLI version.

### 7. 18 skills have content drift between SKILL.md and skills.json

**Files:** 18 skill directories in `skills-data/`
**Category:** Data Integrity

18 of 60 skills have SKILL.md bodies that differ from their `content` field in `skills.json`. The pattern is consistent: SKILL.md files contain markdown hyperlinks (e.g., `[references/technical-seo.md](references/technical-seo.md)`) while `skills.json` has plain text references.

**Affected skills:** seo-geo, content-strategy, copywriting, page-cro, email-sequence, paid-ads, signup-flow-cro, popup-cro, programmatic-seo, growth-hacking, landing-page-builder, lead-scoring, local-seo, marketing-analytics, crm-builder, sales-funnel, smart-contract-auditor, social-media-kit.

**Fix:** Decide on a single source of truth (SKILL.md or skills.json) and create a build step to keep them in sync.

---

## MEDIUM

### 8. No `<main>` landmark wrapping page content

**File:** `app/layout.tsx:132`
**Category:** Accessibility

`{children}` is wrapped in `<div className="relative z-10">` instead of `<main>`. Screen readers use the `<main>` landmark to skip navigation (WCAG 2.4.1).

**Fix:** Change `<div>` to `<main>`.

### 9. Search input has no label

**File:** `components/SkillsGrid.tsx:68-76`
**Category:** Accessibility

The search `<input>` has a placeholder but no `<label>`, `aria-label`, or `aria-labelledby`. Placeholder is not a substitute for a label (WCAG 1.3.1, 3.3.2).

**Fix:** Add `aria-label="Search skills"`.

### 10. Category filter buttons lack `aria-pressed` state

**File:** `components/SkillsGrid.tsx:80-102`
**Category:** Accessibility

Filter buttons change visual style when selected but have no `aria-pressed` or `aria-current` to communicate active state to assistive technology.

**Fix:** Add `aria-pressed={filter === cat}` to each button.

### 11. Collapsed accordion content is in the accessibility tree

**File:** `components/FaqAccordion.tsx:26-28`
**Category:** Accessibility

Hidden content uses `maxHeight: "0px"` with `overflow: hidden`, but remains in the accessibility tree. Screen readers will read collapsed answers.

**Fix:** Add `aria-hidden={open !== i}` to collapsed panels.

### 12. Markdown `h1` creates duplicate `<h1>` on skill pages

**File:** `components/SkillContent.tsx:13`
**Category:** SEO

The markdown renderer maps `h1` to `<h1>`. Skill pages already have an `<h1>` for the skill name (`app/skills/[name]/page.tsx:122`). When skill content starts with `# Title`, the page has two `<h1>` elements — an SEO violation.

**Fix:** Map markdown `h1` → `<h2>`, `h2` → `<h3>`, etc. in the SkillContent component.

### 13. GA4 uses `dangerouslySetInnerHTML` instead of Next.js `<Script>`

**File:** `app/layout.tsx:103-108`
**Category:** Performance

The GA4 snippet is a render-blocking `<script>` in `<head>`. Next.js provides `<Script strategy="afterInteractive">` which defers loading for better performance and CSP compatibility.

**Fix:** Replace with `import Script from 'next/script'` and use `<Script strategy="afterInteractive">`.

### 14. `NpmDownloads` returns `null` during loading — CLS issue

**File:** `components/NpmDownloads.tsx:27`
**Category:** UX / Performance

When `downloads` is `null` (before fetch completes), the component returns `null`. The parent stat block still renders the "npm downloads" label with an empty number area, causing Cumulative Layout Shift.

**Fix:** Return a placeholder (e.g., `"—"` or a skeleton) instead of `null`.

### 15. `setTimeout` not cancelled on unmount in InstallBox

**File:** `components/InstallBox.tsx:11-12`
**Category:** React Anti-pattern

`setTimeout(() => setCopied(false), 1500)` is not cleaned up on unmount. Multiple rapid clicks also accumulate timers.

**Fix:** Store timeout in a `useRef`, clear on unmount and on subsequent clicks.

### 16. Fetch calls don't check `response.ok` before `.json()`

**Files:** `components/NpmDownloads.tsx:16` · `components/SkillsGrid.tsx:18`
**Category:** Error Handling

Both fetch calls chain `.then(r => r.json())` without checking `r.ok`. Errors are silently swallowed by `.catch(() => {})`. No logging, no retry, no user feedback.

**Fix:** Add `if (!r.ok) throw new Error(r.statusText)` before `.json()`. Add at least `console.warn` in catch.

### 17. Non-null assertions on canvas contexts

**File:** `components/AsciiBackground.tsx:36,42`
**Category:** Robustness

`getContext("2d")!` uses non-null assertions. While rare, `getContext` can return `null` in constrained environments (too many canvas contexts). Would cause unhandled TypeError.

**Fix:** Add null checks with early return, similar to the WebGL try/catch on line 24.

### 18. Accordion max-height of 500px clips long answers on mobile

**File:** `components/FaqAccordion.tsx:28`
**Category:** UX

`maxHeight: "500px"` hard-caps expanded panel height. On narrow mobile screens, long FAQ answers will be clipped with no scroll.

**Fix:** Use CSS `grid-template-rows: 0fr/1fr` transitions, or measure content height with a ref.

### 19. `react-markdown` v10 `li` component API may not pass `ordered`/`index` props

**File:** `components/SkillContent.tsx:27`
**Category:** Compatibility

The `li` component destructures `{ ordered, index }` props. In `react-markdown@^10.1.0`, these props may not be passed the same way as in v8/v9. If `ordered` is always `undefined`, ordered lists render with bullet style.

**Fix:** Verify against `react-markdown@10` docs and test ordered list rendering.

### 20. AsciiBackground decorative canvas not hidden from screen readers

**File:** `components/AsciiBackground.tsx:197-203`
**Category:** Accessibility

The ASCII canvas is purely decorative but lacks `aria-hidden="true"` or `role="presentation"`. Screen readers may announce it.

**Fix:** Add `aria-hidden="true"` and `role="presentation"` to the outer `<div>`.

### 21. Entire `skills.json` (357KB) bundled into homepage HTML

**File:** `lib/skills.ts` → `app/page.tsx`
**Category:** Performance

`lib/skills.ts` imports the full `skills.json` at module scope. Since Next.js static export serializes all data into the page HTML, the full markdown `content` fields for all 60 skills are embedded in `index.html` even though the homepage never renders skill content.

**Fix:** Split data — keep a lightweight index for the homepage, load full content only on skill detail pages.

---

## LOW

### 22. No `<h1>` on homepage

**File:** `app/page.tsx`
**Category:** SEO

The homepage has no `<h1>`. The ASCII `<pre>` is the visual title, but the first semantic heading is `<h2>` ("Security"). Every page should have exactly one `<h1>`.

**Fix:** Add a visually-hidden `<h1>` or make the subtitle an `<h1>`.

### 23. ASCII art `<pre>` is read character-by-character by screen readers

**File:** `app/page.tsx:27-29`
**Category:** Accessibility

The ASCII banner has no `aria-hidden="true"`. Screen readers announce hundreds of box-drawing characters.

**Fix:** Add `aria-hidden="true"` to the `<pre>`.

### 24. Sitemap `lastModified` is always current build time

**File:** `app/sitemap.ts:8`
**Category:** SEO

Every sitemap entry uses `new Date().toISOString()`. This defeats the purpose of `lastModified` — search engines may distrust timestamps or re-crawl unnecessarily.

**Fix:** Use git commit dates or static dates for pages that haven't changed.

### 25. Hardcoded hex colors in FAQ `<Code>` component bypass theme

**File:** `app/faq/page.tsx:12`
**Category:** Code Quality

The `Code` component uses `bg-[#0a0a0a]`, `border-[#222]`, `text-[#00ff88]` instead of theme tokens (`bg-bg`, `border-border`, `text-accent`).

**Fix:** Use Tailwind theme classes for consistency.

### 26. `"/"` keyboard shortcut doesn't guard all editable contexts

**File:** `components/SkillsGrid.tsx:42-53`
**Category:** UX

The global `"/"` shortcut only excludes `HTMLInputElement`. It doesn't check for `HTMLTextAreaElement`, `[contenteditable]`, or modifier keys.

**Fix:** Expand guard to include `HTMLTextAreaElement`, `HTMLSelectElement`, and `[contenteditable]`.

### 27. FAQ items keyed by array index

**File:** `components/FaqAccordion.tsx:16`
**Category:** React

`key={i}` uses index. Since the FAQ tracks open state by index (`open === i`), reordering the array would show the wrong FAQ as expanded.

**Fix:** Use `key={faq.q}` for a stable key.

### 28. `prefersReducedMotion` is checked once and not reactive

**File:** `components/AsciiBackground.tsx:17`
**Category:** UX

`matchMedia("(prefers-reduced-motion: reduce)").matches` is read once. If the user changes their system preference while the page is open, the animation won't respond.

**Fix:** Listen to `MediaQueryList.addEventListener("change", ...)`.

### 29. Decorative dots throughout UI lack `aria-hidden`

**Files:** `app/page.tsx:41,60-73` · `components/SkillsGrid.tsx:132` · `app/docs/page.tsx:55-110`
**Category:** Accessibility

Colored dot `<span>` elements are decorative but not excluded from the accessibility tree.

**Fix:** Add `aria-hidden="true"` to dot spans.

### 30. Category buttons lack per-category counts

**File:** `components/SkillsGrid.tsx:90-102`
**Category:** UX

The "All" button shows `All ({skills.length})` but individual category buttons show only the name with no count.

### 31. ESLint suppression without explanation

**File:** `components/AsciiBackground.tsx:194`
**Category:** Code Quality

`// eslint-disable-next-line react-hooks/exhaustive-deps` suppresses the rule. The empty dependency array is intentional but the suppression should explain why.

### 32. Checkbox `<input>` rendered as `<span>` in SkillContent

**File:** `components/SkillContent.tsx:89-93`
**Category:** Accessibility

Custom `input` renderer replaces actual checkboxes with a decorative `<span>`. No semantic role, no keyboard interactivity.

**Fix:** Use `role="checkbox"` and `aria-checked` on the span.

### 33. `llms-full.txt` sourced from `skills.json` — misses SKILL.md link updates

**File:** `public/llms-full.txt`
**Category:** Data Integrity

`llms-full.txt` matches `skills.json` content fields exactly, which means the 18 skills with updated markdown links in their SKILL.md files have those links absent from `llms-full.txt`. Low priority since the content is equivalent — just without hyperlinks.

---

## Data Integrity Summary

| Check | Status |
|-------|--------|
| skills-data directories | 60 |
| skills.json entries | 60 |
| llms.txt skills listed | 60 |
| llms-full.txt skills | 60 |
| public/skills.json entries | 60 |
| Directory ↔ skills.json match | 60/60 (all match) |
| SKILL.md ↔ skills.json content | 42/60 exact, 18 have link drift |
| robots.txt domain | skills.ws (correct) |
| Sitemap domain | skills.ws (correct) |
| install.sh domain | skills.ws (correct) |
| install.sh input validation | Present (regex `^[a-z0-9-]+$`) |

### Category Distribution

| Category | Count |
|----------|-------|
| marketing | 15 |
| dev | 12 |
| conversion | 8 |
| growth | 8 |
| analytics | 7 |
| operations | 6 |
| design | 3 |
| web3 | 1 |

---

## Previously Fixed (this branch)

These issues from the prior audit (2026-02-23) have been resolved:

| Issue | Status |
|-------|--------|
| Stale `public/skills.json` (37 vs 60 skills) | Fixed — synced |
| FAQ schema JSX fallback to question text | Fixed — added `schemaA` field |
| `robots.txt` pointing to vercel subdomain | Fixed — `skills.ws` |
| FAQ page listing only 4 of 8 categories | Fixed — all 8 listed |
| Empty verification meta tags | Fixed — removed |
| `install.sh` path traversal via `--skill` | Fixed — regex validation |
| `install.sh` stale URLs | Fixed — `skills.ws` |
| `softwareVersion` mismatch with package.json | Fixed — `0.1.0` |
| AsciiBackground `ready` in useEffect deps | Fixed — removed |
| Missing `og.png` | Fixed — asset added |

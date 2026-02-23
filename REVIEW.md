# Repository Review & Code Audit — skills.ws

**Date:** 2026-02-23
**Repo:** san-npm/skills-ws
**Stack:** Next.js 14.2 (static export), React 18, TypeScript, Tailwind CSS, Three.js

---

## Project Overview

A Next.js website for **skills.ws** — a catalog of 58 "agent skills" (SKILL.md files) for AI coding assistants (OpenClaw, Claude Code, Cursor, Codex). The site serves as a marketing homepage, documentation hub, and installation gateway via `npx skills-ws`.

### Architecture

```
app/
  page.tsx         — Homepage: ASCII banner, search/filter grid, stats
  layout.tsx       — Root layout: nav, GA4, JSON-LD schemas
  sitemap.ts       — Dynamic XML sitemap
  not-found.tsx    — Custom 404
  skills/[name]/   — Dynamic skill detail pages (SSG)
  docs/            — Static docs page
  cli/             — CLI reference page
  faq/             — FAQ with accordion + schema
components/
  AsciiBackground  — WebGL Three.js → ASCII art background
  SkillsGrid       — Client-side search/filter grid
  SkillContent     — Markdown renderer (react-markdown + remark-gfm)
  InstallBox       — Copy-to-clipboard install command
  FaqAccordion     — Expandable Q&A
lib/
  skills.ts        — Skill data access, types, category colors
skills.json        — 58 skills with full markdown content (332KB)
skills-data/       — 58 directories, each with SKILL.md
public/
  skills.json      — Stale copy (37 skills, old domain)
  install.sh       — Bash installer script
  llms.txt         — LLM-readable index
  llms-full.txt    — Full LLM content
  robots.txt       — Crawl directives
```

---

## Findings

### CRITICAL — Data Inconsistency

#### 1. Two divergent `skills.json` files

| File | Skills | Domain | Size |
|------|--------|--------|------|
| `/skills.json` (root) | 58 | skills.ws | 332 KB |
| `/public/skills.json` (served to API consumers) | 37 | skills-ws.vercel.app | 192 KB |

The root `skills.json` is the source of truth (imported by `lib/skills.ts`). The public copy is stale — missing 21 skills (the newest batch: ai-agent-design, api-design, blog-engine, brand-strategy, cicd-pipelines, community-building, customer-feedback, database-design, eu-legal-compliance, git-workflow, hiring-team-building, influencer-marketing, pr-media-outreach, project-management, prompt-engineering, security-hardening, testing-strategy, ui-ux-pro-max, virustotal, web-performance, webinar-events) and uses the old `skills-ws.vercel.app` domain.

**Impact:** The `install.sh` script fetches from `public/skills.json` via Vercel, so `curl | bash` users only see 37 of 58 skills. The API endpoint `/skills.json` also serves stale data.

**Fix:** Copy root `skills.json` → `public/skills.json` and update the `website` field to `https://skills.ws`.

---

### HIGH — SEO/Schema Bugs

#### 2. FAQ schema outputs question text as answer for JSX entries

In `app/faq/page.tsx:66-67`:
```ts
text: typeof f.a === "string" ? f.a : f.q,
```

When the FAQ answer is JSX (not a plain string), the schema falls back to the **question text** as the answer. This affects 4 FAQs:
- "Who built these skills?" → schema answer: "Who built these skills?"
- "How do I install skills?" → schema answer: "How do I install skills?"
- "Can I install individual skills?" → schema answer: "Can I install individual skills?"
- "Can I request a new skill?" → schema answer: "Can I request a new skill?"

**Impact:** Google's rich results will show meaningless Q&A pairs, potentially harming structured data trustworthiness.

**Fix:** Extract plain-text versions of JSX answers for the schema.

#### 3. Missing `og.png` image

`layout.tsx` and skill pages reference `${BASE_URL}/og.png` for OpenGraph/Twitter cards, but no `og.png` exists in `public/`. Social media shares will show no preview image.

#### 4. Hardcoded skill count "58" in metadata

`layout.tsx:21` and `layout.tsx:76` hardcode "58 agent skills" in the description and Twitter card. The actual count is dynamic from `skills.json`. If skills are added or removed, metadata becomes stale.

**Fix:** Either make it dynamic or remove the specific number.

#### 5. `robots.txt` domain mismatch

`public/robots.txt` uses `skills-ws.vercel.app`:
```
Sitemap: https://skills-ws.vercel.app/sitemap.xml
```

But `sitemap.ts` generates URLs with `https://skills.ws`. The sitemap URL in robots.txt points to the wrong domain.

#### 6. FAQ page lists only 4 of 8 categories

`app/faq/page.tsx:54` says: "Currently: marketing, conversion, design, and web3"

Actual categories: analytics, conversion, design, dev, growth, marketing, operations, web3. Four categories are missing from this answer.

#### 7. Empty verification meta tags

`layout.tsx:87-88`:
```ts
"google-site-verification": "",
"msvalidate.01": "",
```

These emit empty meta tags into the HTML. Either populate them or remove them.

---

### MEDIUM — Performance Issues

#### 8. Entire `skills.json` (332KB) bundled into homepage

`lib/skills.ts` imports `skills.json` at the top level. Since Next.js static export serializes all data into the page, the full 263KB of markdown `content` fields are embedded in `index.html` (430KB total) even though the homepage never renders individual skill content. Only `name`, `version`, `description`, `category`, `platforms`, and `installs` are used on the homepage.

**Impact:** Homepage is 430KB of HTML. With JS chunks (including Three.js at ~145KB), the first load is 240KB JS + 430KB HTML.

**Fix:** Split the data — keep a lightweight skills index for the homepage, load full content only on skill detail pages.

#### 9. Three.js loaded on every page

The `AsciiBackground` component imports Three.js (~145KB gzipped), but it's only rendered on the homepage. Due to Next.js chunking, Three.js may be loaded as a shared chunk across pages.

**Fix:** Verify Three.js is properly code-split. Consider using `next/dynamic` with `ssr: false` for the `AsciiBackground` import in `page.tsx`.

#### 10. `AsciiBackground` useEffect dependency on `ready` state

`components/AsciiBackground.tsx:194`:
```ts
}, [ready]);
```

The `ready` state is set to `true` inside the effect (line 176), which would normally trigger the effect to re-run. However, since the effect has a cleanup function that cancels the animation frame and disposes resources, setting `ready` to `true` would tear down and rebuild the entire WebGL scene once. This is wasteful — `ready` should not be in the dependency array, or the `setReady` call should be moved outside the animation loop.

---

### MEDIUM — Security Considerations

#### 11. `install.sh` path traversal via `--skill` argument

`public/install.sh:81-82`:
```bash
SKILL_DIR="$TARGET_DIR/$skill"
mkdir -p "$SKILL_DIR"
```

The `--skill` argument is used directly in path construction without sanitization. A malicious value like `--skill "../../.ssh/authorized_keys"` could create directories outside the intended target. The `curl` fetch would fail (no matching file on GitHub), but directories would be created.

**Fix:** Validate that the skill name matches `^[a-z0-9-]+$` before using it in paths.

#### 12. `dangerouslySetInnerHTML` for JSON-LD schemas

Used in `layout.tsx` (lines 106-108, 138-241) and `skills/[name]/page.tsx` (lines 181-189). The skill page properly escapes `<` as `\u003c` (line 186), and the layout uses `JSON.stringify` which is safe for the static data being serialized. The skill description and content come from the repo-controlled `skills.json`, not user input, so this is acceptable but worth noting — if skills.json ever accepts user contributions, these would need sanitization.

#### 13. GA4 inline script

`layout.tsx:104-108` uses `dangerouslySetInnerHTML` for the GA4 snippet. This is standard practice and safe since the GA4 ID is hardcoded, not user-supplied.

---

### LOW — Code Quality

#### 14. `SkillContent.tsx` custom `li` component props

`components/SkillContent.tsx:27`:
```tsx
li: ({ children, ordered, index }: { children?: React.ReactNode; ordered?: boolean; index?: number }) =>
```

The `ordered` and `index` props are passed by `react-markdown` but are not standard HTML props. This works but generates React warnings about unknown DOM props. The explicit type annotation suppresses the TypeScript error but the runtime warning remains.

#### 15. Static export with `sitemap.ts`

`next.config.mjs` uses `output: 'export'` (static HTML export). The `sitemap.ts` file works because Next.js generates it at build time. This is correct but worth noting — the sitemap `lastModified` timestamp will always be the build time, not the actual content modification time.

#### 16. `softwareVersion` hardcoded in JSON-LD

`layout.tsx:189`: `softwareVersion: "1.0.4"` is hardcoded in the SoftwareApplication schema. The `package.json` version is `0.1.0`. These should match or be derived from a single source.

#### 17. No ESLint configuration

The project has `next lint` in scripts but no `.eslintrc` file. Next.js provides a default config, but the project may benefit from explicit rules.

---

### INFORMATIONAL — Skills Analysis

- **58 skills** across 8 categories: marketing (15), dev (10), conversion (8), growth (8), analytics (7), operations (6), design (3), web3 (1)
- All skills are version `1.0.0`, all have 0 installs
- All skills list the same 4 platforms: openclaw, claude-code, cursor, codex
- Average skill content: 4,536 characters of markdown
- Largest skill: `ascii-banner` (9,147 chars)
- All 58 skill directories in `skills-data/` have matching entries in `skills.json`
- Skill content is educational markdown (frameworks, checklists, code snippets) — no executable code or dangerous patterns detected
- One skill (`web-performance`) contains `<script defer>` in its markdown content, but this is educational text rendered via react-markdown (which sanitizes HTML by default), not a security risk

---

## Summary

| Severity | Count | Key Issues |
|----------|-------|------------|
| Critical | 1 | Stale `public/skills.json` (37 vs 58 skills) |
| High | 6 | FAQ schema bug, missing og.png, hardcoded counts, domain mismatches, stale category list, empty meta tags |
| Medium | 5 | 430KB homepage, Three.js bundle, useEffect dep, install.sh path traversal, dangerouslySetInnerHTML usage |
| Low | 4 | li prop warnings, sitemap timestamps, version mismatch, no ESLint config |

The most urgent fix is syncing `public/skills.json` with the root `skills.json` — this directly breaks the CLI installer and API endpoint for 21 of 58 skills.

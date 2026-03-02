# skills.ws

Agent skills for AI coding assistants. 81 skills across 8 categories — built for OpenClaw, Claude Code, Cursor, Codex, and any agent that supports the SKILL.md format.

**Website:** [skills.ws](https://skills.ws) | **npm:** [skills-ws](https://www.npmjs.com/package/skills-ws) | **Docs:** [llms-full.txt](https://skills.ws/llms-full.txt)

---

## Quick Start

```bash
npx skills-ws install          # interactive picker
npx skills-ws install seo-geo  # install a specific skill
npx skills-ws install all      # install everything
npx skills-ws list             # list available skills
```

Skills are `SKILL.md` files that give AI coding assistants specialized knowledge — workflows, checklists, code patterns, and domain expertise. Install a skill and your agent gains expert-level capability in that domain.

---

## Skills (81 across 8 categories)

### Marketing (15)
SEO/GEO, content strategy, copywriting, paid ads, email sequences, PR/media, influencer marketing, brand strategy, webinars, blog engine, and more.

### Dev (16)
Git workflow, CI/CD, API design, database design, testing, web performance, security hardening, prompt engineering, AI agent design, MVP launcher, Next.js stack.

### Growth (10)
Social media, community building, customer feedback, business development, cold outreach, competitor intelligence, affiliate marketing.

### Operations (11)
EU legal compliance (GDPR, AI Act, DSA), hiring/team building, project management, CRM, accounting, revenue ops.

### Conversion (8)
Landing pages, signup flows, popups, A/B testing, pricing optimization, lead scoring, CRO, sales funnels.

### Analytics (7)
Google Analytics, Search Console, Bing/Yandex Webmaster, data analytics, retention analytics.

### Web3 (6)
Blockchain deployment, Aleph Cloud, decentralized infrastructure.

### Design (4)
UI/UX Pro Max, landing page builder, ASCII banner.

---

## How Skills Work

```
┌─────────────────────────────────────────┐
│            AI Coding Assistant           │
│  (OpenClaw, Claude Code, Cursor, Codex) │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │          SKILL.md files           │  │
│  │  Loaded into agent context on     │  │
│  │  startup — gives the agent        │  │
│  │  domain expertise, workflows,     │  │
│  │  checklists, and code patterns    │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

1. You install a skill via `npx skills-ws install <name>`
2. A `SKILL.md` file is placed in your agent's skills directory
3. Your AI assistant reads it on startup and gains that expertise
4. Ask your assistant to do anything related to that domain — it now knows the best practices, patterns, and workflows

Skills are **markdown only** — no executable code, no runtime dependencies, no supply chain risk.

---

## CLI Reference

```bash
# Interactive mode — browse and select skills
npx skills-ws install

# Install a specific skill
npx skills-ws install seo-geo

# Install multiple skills
npx skills-ws install seo-geo copywriting ab-testing

# Install all skills
npx skills-ws install all

# List available skills with categories
npx skills-ws list

# Install to a custom directory
npx skills-ws install seo-geo --dir ./my-agent/skills
```

The CLI auto-detects your agent type (OpenClaw, Claude Code, Cursor, Codex) and installs to the correct directory.

---

## Website Features

The [skills.ws](https://skills.ws) website provides:

- **Searchable skill grid** — filter by category, search by name
- **Individual skill pages** — full SKILL.md content rendered as Markdown
- **One-click install commands** — copy `npx` command to clipboard
- **Live npm download counter** — monthly download stats
- **VirusTotal scan status** — every skill file is scanned

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus search |
| `Esc` | Clear search |

---

## Development

```bash
git clone https://github.com/san-npm/skills-ws.git
cd skills-ws
npm install
npm run dev       # http://localhost:3000
npm run build     # static export to out/
npm run lint      # ESLint + Next.js linter
```

### Stack

- **Next.js 14** — static export (SSG), App Router
- **React 18** + TypeScript 5
- **Tailwind CSS 3.4** — dark theme
- **Three.js** — WebGL ASCII art background (homepage)
- **react-markdown** + remark-gfm — SKILL.md rendering

### Project Structure

```
skills-ws/
├── app/                    # Next.js App Router
│   ├── page.tsx            # Homepage — ASCII hero, skill grid, stats
│   ├── skills/[name]/      # Dynamic skill detail pages (SSG)
│   ├── docs/               # How agent skills work
│   ├── cli/                # CLI reference
│   ├── faq/                # FAQ with accordion
│   └── sitemap.ts          # Dynamic XML sitemap
├── components/             # React components
│   ├── AsciiBackground.tsx # Three.js WebGL → ASCII canvas
│   ├── SkillsGrid.tsx      # Searchable/filterable skill grid
│   ├── SkillContent.tsx    # Markdown renderer
│   ├── InstallBox.tsx      # Copy-to-clipboard install command
│   └── NpmDownloads.tsx    # Live npm download counter
├── lib/
│   └── skills.ts           # Skill data access + TypeScript interfaces
├── skills/                 # Raw SKILL.md files (81 directories)
├── public/
│   ├── skills.json         # Skills database (81 skills, all metadata + content)
│   ├── llms.txt            # LLM-readable skill index
│   ├── llms-full.txt       # Full content dump for LLMs
│   ├── robots.txt          # Crawl directives
│   └── install.sh          # Bash installer script
└── skills.json             # Master skills database
```

### Build Output

Static export generates ~85 pages:
- Homepage + docs + CLI + FAQ + 404
- 81 individual skill detail pages
- XML sitemap

No server needed — deploy to any static host (Vercel, Netlify, GitHub Pages, S3).

---

## SEO & Structured Data

- Dynamic XML sitemap with all skill pages
- OpenGraph + Twitter Card meta tags
- JSON-LD schemas: Organization, WebSite, SoftwareApplication, BreadcrumbList, FAQPage
- Google Analytics 4 integration
- `llms.txt` + `llms-full.txt` for AI crawlers
- `robots.txt` with sitemap reference

---

## Security

Skills are **markdown files only** — no executable code.

- Zero runtime dependencies (no supply chain risk)
- No `eval()`, `exec()`, or `child_process` patterns
- All skills built in-house, no third-party content
- VirusTotal scanning on all skill files
- Environment-only credentials (nothing hardcoded)
- npm package published with Sigstore provenance attestation

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

---

## License

MIT — [Commit Media SARL](https://openletz.com)

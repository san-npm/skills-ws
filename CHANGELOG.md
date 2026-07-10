# Changelog

## [1.10.0] - 2026-07-10

### Full-catalog best-practices and security audit (Jul 2026)

Every skill audited against official, fetched-this-week documentation from Anthropic, OpenAI, Cursor, GitHub Copilot, OpenClaw, the MCP spec, agentskills.io, OWASP, and npm. 87 parallel auditors produced 288 evidence-backed findings; 229 fixes were applied across 76 skills and every diff was independently re-verified (10 skills were already fully current). Repo-wide scans for hidden-Unicode instruction injection (U+E0000-E007F, zero-width, bidi), embedded secrets, and decode-and-execute patterns: clean.

**Critical fixes (`saas-billing`):** code read `subscription.current_period_end` and `invoice.subscription`, both removed in Stripe `2025-03-31.basil` and later, so renewals and scheduled downgrades were broken under the skill's own API pin. Now reads period bounds from subscription items and the subscription id from `invoice.parent.subscription_details`, pinned to `2026-06-24.dahlia`.

**Security fixes:** replaced an unregistered example API domain in `mcp-server-builder` with `rdap.org` (domain-takeover risk); fixed JSON-LD XSS (`programmatic-seo`) by escaping `<` in `dangerouslySetInnerHTML`; fixed query-parameter injection into an authenticated upstream call (`nextjs-performance`); corrected the false claim that a runtime hostname guard keeps a `NEXT_PUBLIC_*` bot token out of shipped bundles (`telegram-mini-apps`); added allowance-hygiene guidance to `ophis-swap`; added review-the-script caveats to `curl | bash` installers.

**Currency fixes across the catalog (selection):** Claude lineup and API (adaptive thinking, `output_config.effort`, Structured Outputs, prefill and temperature deprecations, platform.claude.com URLs) in `prompt-engineering` and `ai-agent-building`; OpenAI GPT-5.5/5.6 IDs and Responses API; MCP spec 2025-11-25 alignment and `registerTool` migration in both MCP skills; solc 0.8.36 + Osaka EVM default (`solidity-dev`); wagmi v3 (`wallet-integration`); Storybook 10 (`design-system`); Node 24 LTS / Go 1.26 base images (`docker-production`); GitHub Actions current majors and OIDC trusted publishing (`ci-cd-pipeline`, `cicd-pipelines`, `security-sentinel`, `security-hardening`); Lighthouse 13 budgets removal (`web-performance`); OWASP Top 10:2025 (`security-hardening`); vt-cli real flag surface (`virustotal`); Dune `dex.trades` schema (`onchain-analytics`); EU AI Act Digital Omnibus timeline (`eu-legal-compliance`); 1099-NEC $2,000 threshold (`accounting-finance`); dead-product corrections (ShareASale folded into Awin, Hotjar into Contentsquare, Delighted into Qualtrics, Orbit sunset by Postman, HARO relaunched under Featured.com, Product Hunt Orbit Awards).

**Broken-code fixes:** invalid HCL semicolons (`aws-production-deploy`), unparseable workflow YAML (`ci-cd-pipeline`), missing pnpm setup in CI samples (`testing-strategy`), Alertmanager env-var misuse and collector/Prometheus pipeline mismatch (`monitoring-observability`), SQL fan-out and dialect bugs (`data-analytics`, `data-management`, `retention-analytics`, `yandex-webmaster`), otplib v13 migration (`auth-implementation`), no-op WAL archive guard (`postgres-mastery`).

### Infrastructure

- **CLI**: `detectTarget()` now probes the directories each tool actually reads (`.claude/skills`, `.cursor/skills`, `.agents/skills`, OpenClaw workspace `skills/`, and user-level equivalents), prints what it detected, and defaults to `~/.agents/skills` (the cross-tool path). `--skill <name>` now works as an install alias; unknown arguments print usage and exit 1 instead of silently doing nothing.
- **Website**: corrected install commands (`npx skills-ws install all` / `install <name>`) and per-tool paths on the CLI, docs, FAQ, and skill pages, including the FAQPage/HowTo JSON-LD; unverifiable Gemini CLI support claim replaced with verified GitHub Copilot support; trust copy rewritten to verifiable statements.
- **Discovery index**: dropped the per-skill `version` field removed by discovery RFC v0.2.0; index is fully spec-conformant.
- **llms.txt / llms-full.txt**: now generated from the catalog at build time (counts and entries can no longer drift; both were stale and missing `ophis-swap`).
- **Publishing**: replaced the package.json swap with a staged `scripts/publish-npm.mjs` (never mutates the repo, asserts manifest versions match); SECURITY.md and README claims corrected (provenance is now stated as planned via npm trusted publishing).
- **Tests**: 12 to 18 checks, adding a byte-for-byte install test and an unknown-argument exit-code test.

## [1.9.0] — 2026-06-26

### Added

- **`ophis-swap`** (web3) — onchain token swaps via Ophis, an intent-based DEX (CoW Protocol deployment) that is MEV-protected, gasless for the trader, and keyless. Drives the Ophis MCP server (`mcp.ophis.fi`) to quote, build, and submit swaps and to read balances, prices, gas, and fee-rebate tiers across 11 EVM chains. Ships `SKILL.md` plus a `reference.md` tool schema. Catalog now totals **86 skills**.

## [1.7.0] — 2026-05-25

### Deep Audit & 2026 Refresh

Comprehensive audit of all 85 skills with parallel cluster reviews (analytics, conversion, design, dev, growth, marketing, operations, web3) and codex-verified factual updates.

**Frontmatter normalization (all 85 skills):**
- Every `name:` field now matches its directory (fixed `polymarket-trading` mismatch).
- Every `description:` is a single-line quoted string ≤300 chars (6 block-scalar `>` descriptions collapsed; 17 unquoted descriptions normalized).
- Dropped stray `version:` and `category:` fields that drifted from the house style on `aleph-cloud-self-deployment`, `content-strategy`, `copywriting`, `email-sequence`, `mcp-client`, `mcp-server-builder`, `page-cro`, `paid-ads`, `popup-cro`, `programmatic-seo`, `saas-billing`, `security-pentester`, `security-sentinel`, `seo-geo`, `signup-flow-cro`, `telegram-mini-apps`, `ui-ux-pro-max`.

**Major rewrites (promoted from `skills-data/` WIP):**
- `seo-geo` v3 (2026): rewritten around 2026 primary-source guidance from Google (AI Overviews / AI Mode), Microsoft Bing (Copilot + GEO), OpenAI (ChatGPT Search), and Anthropic. Explicit robots.txt directives for `OAI-SearchBot`, `Claude-SearchBot`, `Google-Extended`, etc. Per-engine playbooks, citation-extraction heuristics (~135–165 words optimal). Net: 607 → 203 lines, denser and current.
- `bing-webmaster`: rewritten to cover the **AI Performance report** (public preview, Feb 2026), Generative Engine Optimization per Bing's official guidelines, Copilot citation tracking, meta-directive controls (`NOARCHIVE` / `NOCACHE` / `DATA-NOSNIPPET`), and the 2026 abuse policies (prompt injection, artificially engineered language).
- `ui-ux-pro-max`: refocused on WCAG 2.1 AA accessibility, color palettes, font pairings, responsive design. 1133 → 72 lines, all detail now lives in `references/`.

**Stale-fact fixes (codex-verified):**
- `pr-media-outreach`: HARO/Connectively was shut down by Cision mid-2024 — replaced with Qwoted, Featured.com, Help a B2B Writer, SourceBottle, Terkel.
- `community-building`: Orbit was acquired/wound down by Common Room in 2023 — reference updated.
- `product-led-growth`: Clearbit → HubSpot Breeze Intelligence (post-acquisition); also fixed broken SQL on aha-moment detection (lines 80–104 had unqualified `e.*` column refs and a missing join).
- `social-media-growth`: hardcoded `(2025)` → 2026-baseline note.
- `stripe-billing` / `saas-billing`: bumped Stripe `apiVersion` from `2024-06-20` / `2024-12-18.acacia` to `2025-09-30.clover`.
- `eu-tax-accounting`: "current as of 2025" → 2026; added ViDA platform-economy rules + DE/BE/FR mandatory e-invoicing milestones.
- `solidity-dev`: solc `0.8.24` → `0.8.28` (unlocks transient storage, MCOPY, BLOBHASH, EOF previews); enabled `via_ir`.
- `smart-contract-auditor`: Mythril `--solv 0.8.20` → `0.8.28`.
- `prompt-engineering`: replaced invalid `model="claude-sonnet"` with `claude-sonnet-4-5`.
- `ai-agent-building`: refreshed all model identifiers (`gpt-4o` → `gpt-5`, `claude-3-5-sonnet-20241022` → `claude-sonnet-4-5`); rebuilt pricing table with late-2025 list prices.

**2026 content additions (codex + web-source verified):**
- `cold-outreach`: added Apple MPP open-rate caveat and the Feb 1, 2024 Google/Yahoo bulk-sender requirements (SPF/DKIM/DMARC, RFC 8058 one-click unsubscribe headers with `List-Unsubscribe-Post`, <0.3% spam rate). Refreshed tools stack with Clay, HeyReach/Aimfox, Bouncer.
- `local-seo`: added **Apple Business Connect** (launched Jan 11, 2023; covers Maps/Siri/Wallet/Messages/Spotlight) and **Bing Places for Business** (Microsoft listing graph used by ChatGPT Search). Noted Google Business Profile chat sunset (July 31, 2024). Inlined a minimal `LocalBusiness` JSON-LD example with `sameAs` linking Google/Apple/Bing map URLs.
- `prompt-engineering`: full prompt-caching section covering Anthropic `cache_control: {type:"ephemeral"}` (5m + 1h TTL, ~10% read price), OpenAI automatic prefix caching (`prompt_tokens_details.cached_tokens`), Gemini explicit `cachedContent`/context caching, plus extended thinking with `thinking={"type":"enabled","budget_tokens":N}` and a reasoning-surface comparison table.
- `ai-agent-building`: added Anthropic Memory Tool section (`{"type":"memory_20250818","name":"memory"}` with the `context-management-2025-06-27` beta header; six file ops `view/create/str_replace/insert/delete/rename`) and the OpenAI Responses API (March 2025) with the `"type":"mcp"` tool wiring for remote MCP servers.
- `seo-geo`: new "AI Search Optimization (GEO/AEO)" table covering brand entity strength, citation chunks, brand mentions vs links, freshness, llms.txt.

**Cross-skill disambiguation (no deletions):**
- `ci-cd-pipeline` (canonical handbook) ↔ `cicd-pipelines` (quick reference) — both annotated.
- `saas-billing` (Express/Node) ↔ `stripe-billing` (Next.js) — both annotated.
- `security-hardening` (defensive code) ↔ `security-pentester` (offensive testing) ↔ `security-sentinel` (runtime threat intel) ↔ `virustotal` (VT specifics) — disambiguation block added to each.
- `mcp-client` ↔ `mcp-server-builder`: both now reference MCP spec **2025-03-26 Streamable HTTP** transport (SSE deprecated).
- `nextjs-stack`: "Next.js 14+" → "Next.js 15+ (App Router, RSC, PPR)" with `'use cache'` + `cacheLife`/`cacheTag` + React Compiler.

**Tooling:**
- New `scripts/regen-catalog.mjs` — single source of truth for syncing `skills.json` + `public/skills.json` from `skills/*/SKILL.md` (description + content) plus version from `package.json`.
- Catalog count corrected from `84` → `85` in `package.json` description.

**Audit reports archived in `.audit/`** — three cluster reports (dev, growth, marketing) plus the consolidated `IMPROVEMENTS.md`.

**Integrity check:** 85 / 85 frontmatters parse cleanly · 0 name/dir mismatches · 0 unquoted descriptions · 0 block-scalar descriptions · 16 / 16 CLI tests pass.

---

## [Unreleased] — 2026-02-28

### Added — Premium Skills Tier

**10 premium skills added:**
- `aws-production-deploy` — ECS, RDS, CloudFront, Route53, SSL, monitoring, CDK/Terraform
- `stripe-billing` — Subscriptions, usage-based billing, webhooks, customer portal, metering
- `security-hardening` — OWASP Top 10, CSP, rate limiting, auth, pentesting checklist
- `ai-agent-building` — CrewAI, LangGraph, tool use, memory systems, multi-agent orchestration
- `nextjs-performance` — Core Web Vitals, ISR/SSG, edge functions, bundle analysis
- `postgres-mastery` — Indexes, query optimization, partitioning, pgvector, migrations
- `docker-production` — Multi-stage builds, compose, secrets, health checks, security
- `api-design` — REST best practices, versioning, pagination, OpenAPI, rate limiting
- `monitoring-observability` — Prometheus, Grafana, Datadog, SLOs, OpenTelemetry
- `ci-cd-pipeline` — GitHub Actions, testing pyramid, deployment gates, feature flags

**UI changes:**
- Premium skills show 🔒 lock icon and amber "Premium" badge on skill cards
- Premium skill detail pages show 30-line preview with gradient fade, then paywall CTA
- CTA button: "Get all premium skills — $49/year" linking to `NEXT_PUBLIC_PREMIUM_URL` env var
- New "★ Premium" filter button in skill category bar
- Premium skill count shown in footer stats (amber colored)
- Free skills remain fully accessible — no changes

**Files changed:**
- `lib/skills.ts` — Added `premium?: boolean` to Skill interface
- `skills.json` + `public/skills.json` — 10 new skills with `"premium": true`
- `components/SkillsGrid.tsx` — Premium badge, lock icon, premium filter button
- `components/PremiumGate.tsx` — New component: preview + paywall CTA
- `app/skills/[name]/page.tsx` — Premium badge on detail page, PremiumGate for premium content
- `app/page.tsx` — Premium skills count in stats section

**Notes:**
- Total skills: 80 (70 free + 10 premium)
- Static export — paywall is client-side only (intentionally bypassable for v1)
- CLI package unchanged — premium skills are web-only
- Build passes: 86 static pages generated

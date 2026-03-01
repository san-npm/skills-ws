# Changelog

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

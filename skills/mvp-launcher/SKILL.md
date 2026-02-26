---
name: mvp-launcher
description: "Ship MVPs fast: validation frameworks, scoping, build-vs-buy decisions, 3-week sprint plans, launch checklists, and post-launch playbooks."
---

# MVP Launcher

## 1. Validate Before Building

**Minimum validation checklist (do ALL before writing code):**

- [ ] Problem interviews with 5+ target users (ask about pain, not your solution)
- [ ] Competitor analysis — list top 5, identify gaps
- [ ] Landing page + waitlist (Carrd/Framer, $0-$20) — target 100+ signups or 5%+ conversion
- [ ] Fake door test: advertise the feature, measure clicks before building
- [ ] Define success metric: "MVP is successful if X users do Y within Z days"

**Kill signals:** <50 waitlist signups after 500 visits, zero users willing to pay, problem already solved well by incumbents.

## 2. Scope with MoSCoW

| Priority | Definition | Example |
|----------|-----------|---------|
| **Must** | Product is useless without it | Core value proposition, auth, data persistence |
| **Should** | Expected but can workaround | Email notifications, search, mobile responsive |
| **Could** | Nice to have, adds polish | Dark mode, export, keyboard shortcuts |
| **Won't** | Explicitly cut for v1 | Admin dashboard, API, integrations, i18n |

**The ONE thing test:** Complete this sentence: "Users will choose this over alternatives because ___." If your MVP doesn't nail that sentence, re-scope.

## 3. Build vs Buy

| Feature | Recommendation | Service | Build time if DIY |
|---------|---------------|---------|-------------------|
| Auth | **Buy** | Clerk, Supabase Auth, Auth0 | 2-5 days |
| Payments | **Buy** | Stripe, Lemon Squeezy | 3-7 days |
| Email (transactional) | **Buy** | Resend, Postmark | 1-2 days |
| Email (marketing) | **Buy** | Loops, ConvertKit | 2-3 days |
| File uploads | **Buy** | UploadThing, S3+presigned | 1-3 days |
| Search | **Buy** (until >100k records) | Algolia, Meilisearch | 3-5 days |
| Realtime | **Buy** | Ably, Pusher, Supabase Realtime | 2-4 days |
| Analytics | **Buy** | PostHog, Plausible | 1-2 days |
| CMS | **Buy** | Sanity, Payload | 3-7 days |
| Core feature | **Build** | — | That's your product |

**Rule:** If it's not your core differentiator, use a service. Period.

## 4. Tech Stack Selection

| Project type | Frontend | Backend | DB | Deploy |
|-------------|----------|---------|-----|--------|
| SaaS | Next.js / Remix | Server Actions / tRPC | Postgres (Neon) | Vercel |
| Marketplace | Next.js | API routes + queue | Postgres + Redis | Railway |
| Dev tool / API | Docs site (Mintlify) | Hono / Fastify | Postgres or SQLite | Fly.io |
| Content site | Astro / Next.js | Headless CMS | CMS-managed | Vercel / Cloudflare |
| Mobile-first | React Native / Expo | Supabase | Supabase Postgres | EAS |

**Don't overthink this.** Pick what you know. An MVP in a familiar stack ships 3x faster than one in the "right" stack.

## 5. Three-Week Sprint Plan

### Week 1: Core + Foundation
- [ ] Scaffold project, git repo, CI pipeline
- [ ] Auth integration (Clerk/Supabase — 2-4 hours)
- [ ] Database schema + ORM setup (Prisma/Drizzle)
- [ ] Core feature — the ONE thing — working end-to-end
- [ ] Basic CRUD for primary entity

### Week 2: UI + Integrations
- [ ] UI components (shadcn/ui or similar — don't build from scratch)
- [ ] Payment integration if monetized (Stripe Checkout)
- [ ] Transactional email (welcome, key actions)
- [ ] Mobile responsive pass
- [ ] Error handling + loading states

### Week 3: Polish + Ship
- [ ] Analytics (PostHog/Plausible)
- [ ] Error monitoring (Sentry)
- [ ] SEO basics (meta tags, OG images, sitemap)
- [ ] Legal pages (privacy policy, terms — use generators)
- [ ] Production deploy + custom domain
- [ ] Seed 3-5 beta users, collect feedback
- [ ] **LAUNCH**

## 6. Launch Checklist

### Infrastructure
- [ ] Custom domain + DNS configured
- [ ] SSL/HTTPS enforced
- [ ] Environment variables set (no secrets in code)
- [ ] Database backups enabled
- [ ] CDN for static assets

### Monitoring
- [ ] Error tracking (Sentry) with source maps
- [ ] Uptime monitoring (BetterStack, UptimeRobot)
- [ ] Analytics tracking core events

### SEO & Social
- [ ] Title + meta description on all pages
- [ ] OG image (use og-image.vercel.app or similar)
- [ ] Favicon + web manifest
- [ ] robots.txt + sitemap.xml
- [ ] Social profiles linked

### Legal & Payments
- [ ] Privacy policy page
- [ ] Terms of service page
- [ ] Cookie consent (if EU traffic)
- [ ] Stripe test mode → live mode verified
- [ ] Refund policy documented

## 7. Post-Launch: First 48 Hours

**Hour 0-6:** Monitor error tracking, watch for 5xx spikes, be in support channels.
**Hour 6-24:** Share on social, post on relevant communities (HN, Reddit, IndieHackers, Product Hunt).
**Hour 24-48:** Follow up with every user who signed up. Ask one question: "What almost stopped you from signing up?"

### Metrics to Watch (Week 1)

| Metric | Target | Tool |
|--------|--------|------|
| Signups | Track daily | Analytics |
| Activation (core action done) | >30% of signups | PostHog funnel |
| Day-1 retention | >20% | PostHog cohort |
| NPS / feedback sentiment | Qualitative | Manual outreach |
| Error rate | <1% of requests | Sentry |

### Iterate vs Pivot

**Iterate** if: Users activate but churn (fix retention), users request specific features (roadmap signal), conversion funnel has clear drop-off (optimize).
**Pivot** if: <5% activation after 2 weeks, feedback is consistently "I don't need this", you can't describe the user who loves it.

## 8. Anti-Patterns

| Don't | Do instead |
|-------|-----------|
| Build auth from scratch | Clerk/Supabase Auth (30 min) |
| Premature optimization | Ship, measure, then optimize hot paths |
| Over-engineer state management | Server Components + URL state + useState covers 90% |
| Manual deployments | Git push → auto deploy (Vercel, Railway) |
| Skip analytics | You're flying blind — add PostHog day 1 |
| Chase perfection | 80% quality shipped beats 100% quality in dev |
| Build admin dashboards | Use your DB GUI (Prisma Studio, Supabase dashboard) |
| Custom design system | shadcn/ui + Tailwind — move on |


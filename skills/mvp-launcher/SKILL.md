---
name: mvp-launcher
description: "Ship MVPs fast: validation frameworks, scoping, build-vs-buy, realistic budgets, tech-stack selection, 3-week sprints, launch checklists, analytics/legal setup, and post-launch playbooks. Use when scoping, building, or launching an MVP and deciding what to build vs buy, what to cut, and how to validate and instrument it."
---

# MVP Launcher

## 1. Validate Before Building

**Minimum validation checklist (do ALL before writing code):**

- [ ] Problem interviews with 5+ target users (ask about pain, not your solution — see interview script in §13)
- [ ] Competitor analysis — list top 5, identify gaps
- [ ] Landing page + waitlist (a no-code builder like Carrd, Framer, or a single Next.js page) — target 100+ signups or 5%+ visitor→signup conversion
- [ ] Fake-door test: advertise the feature, measure clicks before building (read the ethics rules below first)
- [ ] Define success metric: "MVP is successful if X users do Y within Z days"

**Kill signals:** <50 waitlist signups after 500 visits, zero users willing to pay, problem already solved well by incumbents.

> **Ethical fake-door / waitlist testing — non-negotiable.** A fake-door test measures intent, not deception.
> - **Disclose state.** Label it "Join the waitlist" / "Coming soon" / "Request early access" — never imply a feature exists if clicking can't deliver it. Don't take payment for something you can't ship; if you charge to validate willingness-to-pay, use a refundable pre-order/deposit and say so.
> - **Minimize data.** Collect only an email (and optionally one qualifying question). No unnecessary PII; no pre-checked marketing opt-ins. State why you're collecting it and add a one-line privacy note + link (see §10).
> - **Honor the implied promise.** Email everyone who signed up — even if you kill the idea ("we're not building this") — and let them unsubscribe.
> - **Don't run misleading paid ads.** Ad platforms (and consumer-protection law in the EU/UK/US) prohibit advertising products that don't exist or can't be bought. Frame ads as "early access / beta," not "buy now."

For deeper interview technique and ongoing feedback loops, pair this with the **`customer-feedback`** skill; for early-community and waitlist growth tactics, see **`community-building`**.

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
| Payments | **Buy** | Stripe, Lemon Squeezy (Stripe-owned; roadmap points to Stripe Managed Payments) | 3-7 days |
| Email (transactional) | **Buy** | Resend, Postmark | 1-2 days |
| Email (marketing) | **Buy** | Loops, Kit (formerly ConvertKit) | 2-3 days |
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
| SaaS | Next.js / React Router (framework mode, the continuation of classic Remix) | Server Actions / tRPC | Postgres (Neon) | Vercel |
| Marketplace | Next.js | API routes + queue | Postgres + Redis | Railway |
| Dev tool / API | Docs site (Mintlify) | Hono / Fastify | Postgres or SQLite | Fly.io |
| Content site | Astro / Next.js | Headless CMS | CMS-managed | Vercel / Cloudflare |
| Mobile-first | React Native / Expo | Supabase | Supabase Postgres | EAS |

**Don't overthink this.** Pick what you know. An MVP in a familiar stack ships 3x faster than one in the "right" stack. The table above is a JS/SaaS default — it is *not* universal. The following constraints override "pick what you know" and can force a different stack:

| Constraint | What it forces | Notes |
|-----------|----------------|-------|
| **Regulated (health/HIPAA, finance/PCI/SOC 2, gov)** | Vendors who sign a BAA/DPA and are in scope for your framework; audit logging; encryption at rest; least-privilege | Generic free tiers often *exclude* a BAA. Confirm contracts before storing regulated data. PCI scope shrinks dramatically if you never touch card data (use Stripe Checkout/Elements). |
| **B2B / enterprise sales** | SSO (SAML/OIDC) and SCIM provisioning on the *near* roadmap, org/role data model from day 1 | Even if v1 ships email login, model `organization → membership → role` now. Auth providers (Clerk, WorkOS, Auth0) sell enterprise SSO as an add-on — don't hand-roll SAML. |
| **Data residency / sovereignty (EU, etc.)** | Region-pinned hosting + DB; a sub-processor list; vendors offering EU regions | Pick a DB/host region in-jurisdiction (e.g. EU) and verify every sub-processor (analytics, email, LLM) honors it. |
| **Mobile + offline-first** | Local-first store with sync (SQLite/WatermelonDB, or a sync engine), conflict resolution | A server-only Postgres CRUD app does not work offline. Decide sync semantics before building. |
| **AI / LLM-heavy** | A model-cost + eval + safety plan (see §11) | Token costs, latency, eval harness, and data-retention terms change your architecture and unit economics. |
| **High-scale realtime / data** | Purpose-built infra (queues, streaming, columnar/analytics DB) | Don't force these into the SaaS default; but also don't pre-build them for an MVP with 50 users. |
| **Team skill** | Your existing language/runtime, even if "unfashionable" | Rails, Django, Laravel, Phoenix, .NET, Go all ship MVPs fine. Familiarity beats trend. |

**Heuristic:** start from the constraints above; only when none bind, fall back to the default table.

## 5. Three-Week Sprint Plan

### Week 1: Core + Foundation
- [ ] Scaffold project, git repo, CI pipeline
- [ ] Auth integration (Clerk/Supabase) — budget ~1 day, not minutes (see the auth row in §8 for everything you still own)
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
- [ ] Analytics + error monitoring wired with real events (see §12 for the event schema)
- [ ] SEO basics (meta tags, OG images, sitemap)
- [ ] Legal pages sized to your risk tier (privacy policy, terms, cookie/consent banner if needed — see §10; a generator is fine for Tier 0 only)
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
- [ ] OG image (generate with @vercel/og, prototype at og-playground.vercel.app, or use a similar service)
- [ ] Favicon + web manifest
- [ ] robots.txt + sitemap.xml
- [ ] Social profiles linked

### Legal & Payments
- [ ] Privacy policy that names your actual data, purposes, and sub-processors (analytics, email, payments, LLM vendors) — see §10
- [ ] Terms of service page
- [ ] Consent banner sized to your tracking + audience, not "if EU traffic" — see the consent decision rule in §10
- [ ] Stripe (or other PSP) test mode → live mode verified; webhooks verified in live mode
- [ ] Refund policy documented (and consumer-law cancellation rights honored where they apply)

## 7. Post-Launch: First 48 Hours

**Hour 0-6:** Monitor error tracking, watch for 5xx spikes, be in support channels.
**Hour 6-24:** Share on social and post on relevant communities — but each platform has its own rules and culture (below). Spray-and-pray gets you flagged or banned.
**Hour 24-48:** Follow up with every user who signed up (use the feedback email in §13). Ask one thing: "What almost stopped you from signing up?"

### Launch channels — rules, not just a list

| Channel | Norms / mechanics | Don't |
|--------|-------------------|-------|
| **Show HN** | Title = "Show HN: <what it does>". Post yourself, be the top commenter, answer every reply fast and humbly. Best early US-AM weekday. Front-load a direct, no-signup demo link. | No marketing voice, no fake upvote rings (HN flags rings → penalty/ban), no "we're excited to announce". |
| **Product Hunt** | Pick a launch *date*, line up a hunter/maker, prep gallery + tagline + first comment, mobilize your list to comment (not just upvote). 12:01 AM PT start. | Don't beg for upvotes off-platform (against rules); don't relaunch the same product repeatedly. |
| **Reddit** | Find subs where your users already are; read each sub's self-promo rule (many require a 9:1 contribute:promote ratio or ban links). Lead with the problem, link as context. | Don't cross-post identical text to many subs (spam filter), don't post a bare link in a sub that bans them. |
| **Indie Hackers** | Share the *story/metrics* (build log, revenue, lessons), not an ad. Engagement rewards transparency. | Don't post a pure landing-page link with no narrative. |
| **LinkedIn / X** | Founder voice, a short build-in-public thread, one clear CTA + link. | Don't link-dump; algorithms suppress naked outbound links. |
| **Niche communities (Discord/Slack/forums)** | Ask mods before promoting; contribute first. Often your highest-intent users. | Don't drop links in #general unannounced. |

Track each channel with a tagged URL (UTM params) so you know which channel actually converts — see §12.

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
| Build auth from scratch | Use a managed provider (Clerk, Supabase Auth, Auth0, WorkOS) — but budget ~1 day, not "30 min": you still own redirect/callback config, session + cookie security, password reset + email verification, an MFA/passkey decision, account linking, the org/role data model, webhook sync to your DB, and a privacy review of what the provider stores. |
| Premature optimization | Ship, measure, then optimize hot paths |
| Over-engineer state management | Server Components + URL state + useState covers 90% |
| Manual deployments | Git push → auto deploy (Vercel, Railway) |
| Skip analytics | You're flying blind — add PostHog day 1 |
| Chase perfection | 80% quality shipped beats 100% quality in dev |
| Build admin dashboards | Use your DB GUI (Prisma Studio, Supabase dashboard) |
| Custom design system | shadcn/ui + Tailwind — move on |

## 9. Realistic MVP Budget (2026)

"$0–$20" is a myth once you have real users. Most providers have a usable free tier for pre-launch, then charge as you scale. **Prices change — treat these as planning ranges and verify on each vendor's pricing page before you commit.**

| Item | Pre-launch / free tier | Once you have users (monthly) | Notes |
|------|------------------------|-------------------------------|-------|
| Domain | — | ~$1–$5/mo (annual) | One-time-ish; premium TLDs cost more. |
| Hosting / app | Free tier (Vercel/Netlify/Fly/Railway) | ~$20–$50 paid plan + usage | Usage-based egress/compute can spike — set spend limits. |
| Database | Free tier (Neon/Supabase/Turso) | ~$10–$30+ | Watch compute-hours / row counts on free tiers. |
| Auth | Free under an MAU cap | $0 → tens of $ as MAUs grow; SSO add-on is more | Enterprise SSO is a separate, larger line. |
| Transactional email | Free under a send cap | ~$10–$20 | Verify your sending domain (SPF/DKIM/DMARC) to avoid spam folder. |
| Marketing email | Free under a contact cap | scales with list size | |
| Analytics | Generous free event tier (PostHog/Plausible) | scales with events/pageviews | Self-host PostHog/Plausible to cap cost + own data. |
| Error monitoring | Free event tier (Sentry) | ~$26+ | |
| Uptime monitoring | Free tier (BetterStack/UptimeRobot) | low | |
| **Payments** | $0 to start | **per-transaction %** | Card fees are typically ~2.9% + a fixed fee per charge (region-dependent); platforms like Paddle or Lemon Squeezy (Stripe-owned, migrating toward Stripe Managed Payments) act as merchant-of-record and charge more but handle sales-tax/VAT. Verify current rates on the PSP's pricing page. |
| LLM / AI APIs | small free/trial credit | **usage-based, can dominate the bill** | Model your $/request × volume — see §11. |

**Budgeting rules:**
- Realistic bootstrapped MVP infra is roughly **low-tens of $/month at launch**, not $0 — plus per-transaction payment fees and any AI usage.
- **Set hard spend limits/alerts** on every usage-priced service (hosting egress, DB compute, LLM tokens) so a traffic spike or a loop doesn't produce a surprise bill.
- The dangerous lines are *usage-priced*: payments (scale with revenue, fine) and AI tokens (scale with usage, can exceed revenue). Cap them.

## 10. Risk-Tiered Legal & Privacy

> **Not legal advice.** This is a triage tool. A generator is acceptable *only* at Tier 0. The higher your tier, the more you need a real DPA review and, past a point, a lawyer.

**Pick the highest tier that applies:**

- **Tier 0 — brochure / waitlist, email-only, no payments.** A reputable generated privacy policy + terms is usually fine. Still: name your email/analytics vendors, add an unsubscribe path, and don't over-collect.
- **Tier 1 — accounts + payments, general consumer/B2B.** You now need: a privacy policy that *actually lists* your sub-processors (analytics, email, payments, hosting, LLM), a data-retention/deletion stance, a real cookie/consent decision (below), refund/cancellation terms, and DPAs signed with each vendor. Generators are a starting draft, not the finish line.
- **Tier 2 — sensitive data or sensitive users.** Health/medical, financial, biometric, precise location, or **children** (under-13/16 → COPPA / GDPR-K, strict). Also: EU/UK personal data at scale, US state privacy laws (e.g. CPRA and the growing set of US state laws), or selling/sharing data for ads. **Get counsel.** You likely need DPAs/BAAs, a lawful basis, data-subject-rights tooling (access/delete/opt-out), and possibly a DPIA.
- **Tier 3 — regulated industry / high-risk AI.** Fintech, insurance, healthcare delivery, anything making automated decisions about people, or AI in domains flagged as high-risk under regimes like the EU AI Act. **Counsel + compliance review before launch**, not after.

**Consent banner — decision rule (replaces "if EU traffic"):**
- Loading **non-essential** cookies/trackers (ad pixels, most third-party analytics, session replay) for visitors in the EU/UK and similar regimes generally requires **prior opt-in consent** (ePrivacy/GDPR) — a banner that blocks those scripts until the user agrees.
- US state laws (CPRA et al.) lean toward an **opt-out** model (e.g. "Do Not Sell/Share", Global Privacy Control) rather than opt-in.
- **You may not need a banner at all** if you use a cookieless / privacy-first analytics tool (e.g. Plausible, or PostHog configured without cookies) and load no ad/marketing trackers. The cleanest MVP path: minimize trackers so consent is simple or unnecessary.
- The trigger is the **purpose and origin** of what you load, not merely "is the visitor in the EU." Map your scripts first.

## 11. AI / LLM MVP Concerns (2026)

If your MVP wraps an LLM, these are first-class engineering and unit-economics problems, not afterthoughts:

- **Unit economics.** Price every AI call: `tokens_in + tokens_out → $/request`. Multiply by realistic per-user volume. AI cost can exceed your subscription price — gate it (rate limits, usage caps, paid tiers). Cheaper/smaller models for easy turns, premium models only when needed.
- **Evals before launch.** Build a small golden set (20–100 representative inputs with expected behavior) and an automated eval you re-run on every prompt/model change. Without evals you can't tell if a "harmless" prompt tweak regressed quality. Track win-rate over the set.
- **Prompt injection & untrusted input.** Treat any text the model ingests (user content, web pages, files, tool outputs) as potentially adversarial. Never let model output trigger privileged actions without validation; constrain tools; don't put secrets in prompts; sanitize/structure tool I/O.
- **Safety & abuse.** Add input/output filtering for your domain, refuse out-of-scope requests, and rate-limit to prevent cost-abuse. Log prompts/outputs for debugging — but see retention below.
- **Data-retention & training terms.** Read the provider's data policy: does your data train their models, and how long is it retained? For sensitive/regulated data choose a zero-retention / no-training tier or a deployment that contractually excludes training, and disclose AI processing in your privacy policy (ties to Tier 2/3 in §10).
- **Human-in-the-loop.** For consequential outputs (money, health, legal, irreversible actions) require human review/confirmation. Show sources/uncertainty; let users correct and report bad outputs (feeds your eval set).
- **Latency & fallbacks.** Stream responses; set timeouts; have a fallback model/path so a provider outage doesn't take your product down.

> For agent/tool design, RAG, memory, and eval depth, see the **`ai-agent-building`** skill.

## 12. Product Analytics & Activation Funnel

You can't decide *iterate vs pivot* (§7) without instrumented behavior. Set this up **day 1**, not after launch.

**Tooling:** PostHog (product analytics + funnels + session replay + flags, generous free tier, self-hostable), or Plausible (lightweight, cookieless, privacy-first) for traffic + Sentry for errors. Pick PostHog if you need funnels/retention; Plausible if you only need privacy-friendly traffic.

**Name events as `object_verb`, snake_case, with consistent props.** A minimal SaaS schema:

```ts
// Acquisition
posthog.capture('signup_started',   { method: 'email' })       // or 'google', 'github'
posthog.capture('signup_completed', { method: 'email' })

// Activation — the ONE core action that delivers value (define this explicitly!)
posthog.capture('project_created',  { source: 'onboarding' })  // <-- your "aha" event
posthog.capture('first_value_reached', {})                     // user got the core outcome

// Engagement / retention
posthog.capture('core_action_performed', { type: 'export' })
posthog.capture('invite_sent',      { count: 1 })

// Monetization
posthog.capture('checkout_started', { plan: 'pro' })
posthog.capture('subscription_started', { plan: 'pro', mrr: 19 })

// Always identify after auth so events tie to a person
posthog.identify(userId, { email, plan, signup_date })
```

**Tracking hygiene:** define the events in one shared `analytics.ts` module (no stringly-typed sprinkles), tag every campaign/launch link with UTM params (`?utm_source=hn&utm_medium=launch`), and verify events fire in the tool's live/debug view before you rely on them.

**The activation funnel to build (PostHog → Funnels):**

`landing_viewed → signup_completed → {your aha event} → first_value_reached → core_action_performed (day 2+)`

| Step | Healthy MVP threshold | If it's the drop-off… |
|------|----------------------|------------------------|
| Visitor → signup | >2–5% (cold traffic) | Sharpen the landing-page promise (§13) |
| Signup → aha event (activation) | >30% | Fix onboarding: fewer steps, prefill, demo data, clearer first action |
| Aha → day-1 retention | >20% | The core value isn't sticky — re-examine the problem |
| Trial/free → paid | a few % is normal | Pricing/packaging or value-timing issue |
| Error rate | <1% of requests | Triage in Sentry before chasing growth |

> Numbers are rough planning benchmarks, not laws — they vary widely by product, audience, and price point. Trend *your own* numbers week over week.

## 13. Launch Assets

### Landing page structure (above-the-fold first)
1. **Headline** — the outcome, not the mechanism. ("Get paid in 2 days, not 30." not "Invoicing software.")
2. **Subhead** — who it's for + how it works in one line.
3. **Primary CTA** — one action (Start free / Join waitlist). Repeat it down the page.
4. **Social proof** — logos, a quote, "used by N", or a metric, as soon as you have any.
5. **3 benefit blocks** — problem → how you solve it (benefit-led, not feature-led).
6. **Visual** — product screenshot/GIF or a short demo. Show the thing.
7. **FAQ** — kill the top 5 objections (price, security/privacy, lock-in, "does it do X").
8. **Footer** — links to privacy/terms (§10), contact, social.

### Problem-interview script (validation, §1)
Goal: learn about *their* world, never pitch.
1. "Walk me through the last time you dealt with <problem area>." (story, not opinions)
2. "What did you do? What tools/workarounds?"
3. "What was the most frustrating part?"
4. "How often does this happen? What does it cost you (time/money)?"
5. "Have you tried to fix it? What happened?"
6. "If a magic wand fixed this, what would change for you?"
- End: "Who else has this problem that I should talk to?"
- **Rules:** open questions, embrace silence, dig into past behavior (predictive) not future intentions ("would you use…" is unreliable). Don't mention your idea until the end, if at all.

### Post-launch feedback email (to new signups, §7)
> Subject: quick one about <product>
>
> Hi <name> — thanks for trying <product>. I'm the founder and I read every reply.
>
> One question: **what almost stopped you from signing up?**
>
> (Bonus: what were you hoping it would do that it didn't?)
>
> Just hit reply — it goes straight to me.
>
> — <you>

Keep it plaintext, from a real human address, one question. Replies are gold; route them into your **`customer-feedback`** loop.


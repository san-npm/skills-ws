---
name: social-media-kit
description: "Produce a ready-to-ship social content kit — platform-spec'd posts, hooks, hashtag sets, a repurposing matrix, a calendar, and an FTC/music/giveaway compliance checklist. Use when packaging a launch/campaign kit, repurposing a long-form asset across platforms, or building a content calendar. For viral/algorithm tactics see social-media-growth."
---

# Social Media Kit

Turn briefs and long-form assets into a **finished, on-spec, approval-ready content kit**. This skill is the *production/deliverable* layer: exact platform specs, copy structures, hashtag sets, a repurposing matrix, a calendar, and a sign-off + compliance checklist. It is the assembly line, not the growth lab.

Sibling skills (intentional cross-links, do not duplicate them):
- **social-media-growth** — algorithmic optimization, viral mechanics, engagement-at-scale. Use for *why a post spreads*; use this skill for *building the post*.
- **content-strategy** — topic clusters, entity-first briefs, editorial operating model. Use to decide *what to make*; use this skill to *make and package it*.
- **copywriting** — headline/CTA frameworks (PAS/AIDA/4U). Pull hooks and CTAs from there.
- **influencer-marketing** — creator briefs, contracts, paid disclosures at scale.
- **marketing-analytics** — GA4/UTMs/attribution to actually *measure* the kit (this skill links its outputs to UTMs).
- **email-sequence**, **paid-ads**, **marketplace-launch** — adjacent channels a kit usually feeds.

---

## 0) Inputs the kit needs (collect these first)

Do not generate a kit blind. Require or infer:

| Input | Why it matters | If missing |
|---|---|---|
| **Objective** (awareness / leads / launch / retention) | Sets CTA and metric | Default to awareness, flag it |
| **Audience** (B2B SaaS / ecommerce / creator / local service) | Picks platforms + tone | Ask; do not guess B2B vs B2C |
| **Source asset** (blog, webinar, podcast, changelog, founder note) | The repurposing root | Ask for one; a kit needs raw material |
| **Brand voice + banned phrases** | Consistency, legal | Pull from `brand-strategy`/`copywriting`; else neutral-expert |
| **Platforms in scope** | Don't spec what they won't ship | Default: LinkedIn + X + one short-video |
| **Offer/links + UTM convention** | Trackable CTAs | Use UTM template in §6 |
| **Compliance flags** (paid/affiliate, music, claims, giveaway) | Avoid takedowns/FTC | Run §7 checklist regardless |
| **Brand/handle, hashtags, asset sizes** | On-brand output | Provide placeholders, mark `<TODO>` |

Output of this skill = a single deliverable doc (see §8) the client can copy-paste or hand to a designer/scheduler.

---

## 1) Platform specs (verify against live limits — platforms change these often)

Limits and durations below are accurate **as of June 2026** but every platform ships changes frequently; treat the verify-links as source of truth before a client-facing deliverable. Never hard-code a number you can't confirm — if unsure, write "check current limit at <official help URL>".

### LinkedIn (B2B default)
- **Post text:** up to **3,000 characters** for personal + company posts (the old ~1,300-char cap is long gone). Only the first **~140–210 chars** show before the "…see more" fold on most viewports — front-load the hook.
- **Formats:** text, single image, **document/carousel (PDF, up to ~300 pages but use 5–12)**, native video, polls, newsletters/articles, LinkedIn Live.
- **Native video:** lands better than off-platform links; vertical 9:16 increasingly favored for the mobile feed. Confirm current max length at linkedin.com help.
- **Links:** an outbound link in the post body can suppress reach; common practice is to put the link in the **first comment** and reference it ("link in comments") — test this, it is a heuristic, not a guarantee.
- **Hashtags:** **3–5**, mixing one broad (#Marketing) with niche (#B2BSaaS). More than ~5 looks spammy and does not help.
- **Best-performing:** specific lessons learned, contrarian-but-defensible takes, single-chart data insights, build-in-public updates, document carousels.
- **Structure:** Hook line (≤210 chars) → whitespace → story/insight (short paragraphs, 1–2 lines each) → concrete takeaway → one CTA or question.

### X / Twitter
- **Single post:** **280 characters** on a free account; **X Premium** subscribers can post **long-form up to ~25,000 characters** (do not assume the audience has Premium — author for 280 unless told otherwise, and put the payoff before any "show more" fold).
- **Threads:** still the workhorse for depth. **5–9 posts** is a healthier default than the old "10–15" — each post must stand alone and earn the next.
- **Media:** up to 4 images per post; native video and GIFs; video length depends on account tier (verify at help.x.com).
- **Hashtags:** **0–2.** On X, hashtags rarely add reach and can look dated; prefer plain keywords the search/algorithm already indexes.
- **Thread structure:** Hook post (promise a payoff) → numbered or logically-stepped points → a summary/recap post → CTA (follow / link / "RT the top"). Repost the hook once after ~24h if it performed.

### Instagram
- **Carousels:** up to **20 slides** (the old 10-slide cap was raised) — 6–10 is the practical sweet spot. Carousels can re-show to people who didn't engage, so they're strong for reach.
- **Reels:** the headline format. Standard Reels run up to **90 seconds**, but Instagram has expanded longer Reels (3-minute Reels have been rolling out, and IG has tested up to ~10 min) — **verify the current max in-app before promising a length**, since it varies by account and rollout. Hook in the **first 1–2 seconds**, deliver value by 0:15, CTA at the end + on-screen text (most watch muted).
- **Aspect ratio:** **9:16** vertical for Reels and the main feed crop; keep text inside safe zones away from UI overlays.
- **Stories:** up to 60 seconds per slide (longer videos auto-split into 60s chunks; feed shares still preview at 15s), ephemeral, great for polls/stickers/link sticker (link sticker is available to all accounts now).
- **Hashtags:** **3–5** topical tags now outperform the old "stuff 30 tags." Mix mid-size (10k–500k posts) with a couple of niche/branded. Hashtag reach has declined industry-wide — treat them as discovery garnish, not the engine.
- **Captions:** up to 2,200 chars; first ~125 show before truncation.

### TikTok
- **Length:** 15s–10min supported; **21–34s** is a common high-completion-rate window for value content, but test — completion rate and rewatches matter more than raw length.
- **Hook:** first **1–2 seconds** must stop the scroll (motion, pattern interrupt, bold claim, or text question).
- **Structure:** Hook → quick context → payoff/value → soft CTA. Use on-screen captions; design for sound-on but legible muted.
- **Sound:** trending audio can boost distribution, but **see §7 — commercial/brand accounts must use the Commercial Music Library or licensed audio**, not the consumer trending-sounds catalog.
- **Hashtags/keywords:** 3–5 specific tags; TikTok is also a search engine — put keywords in the caption and spoken/on-screen text.

### YouTube Shorts
- **Length:** up to **3 minutes** (raised from 60s). Vertical 9:16.
- **Use:** repurpose Reels/TikToks, but Shorts viewers skew toward "how/why" search intent — lead with the question being answered. Shorts feed into long-form channel discovery, so add an end-screen pointing to a full video where relevant.
- **Hashtags:** 1–3 in the description; the title carries more weight (it's search-driven).

### Threads
- **Post:** **500 characters**, up to 10 images or a single video. Casual, conversational, reply-driven; reach favors posts that start conversations. Cross-posting raw X threads underperforms — adapt tone to be more discursive.

### Bluesky
- **Post:** **300 characters**; image alt-text supported and encouraged. Chronological-ish feeds + custom feeds; hashtags work for discovery. Good for tech/dev/builder audiences; lower volume, higher signal.

> Author **once per platform**, not once for all. A LinkedIn post pasted to X reads as a press release; an X thread pasted to Threads reads cold. Repurpose the *idea*, rewrite the *post*.

---

## 2) Hooks & post structures (the copy layer)

A kit lives or dies on the first line. Generate **3–5 hook variants per post** and let the client pick. Hook patterns (see `copywriting` for the full frameworks):

- **Stat/contrarian:** "Most {audience} think {belief}. The data says the opposite."
- **Result/outcome:** "We {specific result} in {timeframe}. Here's the exact process."
- **Mistake/confession:** "I wasted {time/$} on {thing} so you don't have to."
- **Listicle/promise:** "{N} {things} that {benefit} (number {X} surprised me)."
- **Question/tension:** "Why do {audience} keep {failing at X}?"
- **Story/in-medias-res:** "Three months ago this product was dead. Then we changed one thing."

**Reusable structures:**

| Format | Skeleton |
|---|---|
| LinkedIn text | Hook (≤210ch) → 3–5 short paragraphs (story→insight) → 1 takeaway → 1 CTA/question. Link in comment. |
| X thread | Hook post → 5–9 numbered points (1 idea each) → recap → CTA. |
| IG carousel | Slide 1 cover hook (big text) → 6–10 value slides (1 point/slide, minimal words) → CTA slide (save/share/link in bio). |
| Short video (Reels/TikTok/Shorts) | 0–2s hook → 3–8s context → 8–25s payoff → CTA + on-screen text throughout. |
| Story sequence | Frame 1 hook/poll → 2–4 value frames → frame with link sticker. |

**CTA bank (match to objective):** awareness → "Follow for more / save this"; leads → "Free guide in the link"; launch → "We're live — link in bio"; community → "What's your take? 👇"; retention → "New in {product}: …".

---

## 3) Hashtag & keyword workflow (research, don't guess)

Hashtag *reach* has fallen across platforms; treat tags as discovery/garnish and put real effort into **searchable keywords** in captions, alt-text, and spoken audio. Build a reusable **hashtag bank** per client:

1. **Seed** 15–25 candidate tags from: the client's pillars, competitor posts that performed, and platform autocomplete (type the seed, read suggestions).
2. **Size-bucket** each tag by post volume (where the platform shows it): **niche** (<50k), **mid** (50k–500k), **broad** (>500k). Avoid only-broad tags — your post drowns.
3. **Per post, pick:** LinkedIn 3–5 (1 broad + niche); IG 3–5 (1–2 mid + niche + 1 branded); TikTok/YouTube 3–5 specific; X 0–2 or none; Threads/Bluesky 1–3.
4. **Always include 1 branded tag** (#YourBrand) to build an archive and let UGC find you.
5. **Re-audit monthly:** drop tags with no impressions (check per-platform analytics), promote tags that drove profile visits/saves.
6. **Keywords ≥ hashtags:** write the literal phrases your audience searches into the first line, the caption, and (for video) the on-screen text — IG, TikTok and YouTube all rank captions in search.

---

## 4) Repurposing matrix (one asset → a full kit)

The core engine: take **one source asset** and atomize it. Map each source type to outputs:

| Source asset | LinkedIn | X | IG | Short video | Other |
|---|---|---|---|---|---|
| **Blog post / guide** | 1 lesson as a personal-insight post + a document carousel | Thread of the main points | Carousel of the key steps | 45–60s "here's the gist" | Email snippet; 3–5 quote graphics |
| **Webinar / podcast** | Best quote + takeaway | Thread of timestamps/insights | Audiogram + carousel of frameworks | 2–4 clipped highlights | YouTube full + Shorts; newsletter recap |
| **Product launch / changelog** | "What we shipped & why" | Feature thread w/ GIFs | Demo carousel | Screen-recorded demo Reel | Email blast; paid-ads creative (`paid-ads`) |
| **Customer result / case study** | Story post (problem→result) | Result thread | Before/after carousel | Testimonial clip (get consent — §7) | Sales-page proof block (`sales-funnel`) |
| **Founder POV / opinion** | Contrarian take | Hot-take + thread | Quote card | Talking-head Reel | Newsletter essay |
| **Data / report** | One-chart insight | "5 stats" thread | Chart carousel | "What this data means" Short | Gated report (lead gen) |

**Atomization rule of thumb:** one substantial long-form asset reliably yields **8–12 distinct social pieces** across a 2–3 week window. Don't ship them same-day — stagger (see §5).

---

## 5) 4-week content calendar (inlined template — copy this)

This is the full working template — copy the grid and the cadence/mix defaults straight into the deliverable.

**Cadence defaults by audience** (posts/week per platform — start here, then let §6 data tune it):

| Audience | LinkedIn | X | IG | TikTok/Shorts | Notes |
|---|---|---|---|---|---|
| B2B SaaS | 3–5 | 3–7 (+replies) | 0–2 | 1–2 | LinkedIn-led; X for reach |
| Ecommerce / DTC | 1–2 | 2–4 | 4–7 | 4–7 | Visual-led; UGC heavy |
| Creator / personal brand | 2–3 | 5–10 | 3–5 | 5–7 | Volume + consistency |
| Local service | 1–2 | 0–1 | 3–5 | 2–3 | + Google Business + local hashtags (`local-seo`) |

**Content-mix rule (per week, any platform):** roughly **40% educational/value, 30% story/POV, 20% social-proof/UGC, 10% promo/CTA**. If promo creeps above ~20%, reach drops. Tag every planned post with its bucket so the mix is auditable.

**Weekly grid (duplicate for 4 weeks):**

```
WEEK __ — Theme: ____________________  Objective: ____________________

| Day | Platform | Format       | Bucket   | Hook / Topic            | Source asset      | CTA + UTM            | Status   |
|-----|----------|--------------|----------|-------------------------|-------------------|----------------------|----------|
| Mon | LinkedIn | text         | value    | "3 mistakes in ___"     | Blog #14          | Guide → ?utm_...      | Draft    |
| Mon | X        | thread       | value    | repurpose Mon LI        | Blog #14          | link last post        | Draft    |
| Tue | IG       | carousel     | value    | "___ in 7 steps"        | Blog #14          | Save / link in bio    | Draft    |
| Tue | TikTok   | short video  | story    | founder POV clip        | Webinar 06/02     | Follow                | Filming  |
| Wed | LinkedIn | document     | proof    | case study carousel     | Case study: Acme  | Demo → ?utm_...        | Approved |
| Wed | X        | single       | promo    | "We shipped ___"        | Changelog v2.1    | link → ?utm_...        | Scheduled|
| Thu | IG       | reel         | value    | repurpose Tue TikTok    | Webinar 06/02     | Follow                | Draft    |
| Thu | LinkedIn | poll         | value    | "Which matters more?"   | —                 | —                     | Idea     |
| Fri | X        | thread       | story    | "What we learned this wk"| Founder note      | Follow                | Idea     |
| Fri | IG       | story        | proof    | UGC repost (w/ consent) | Customer DM       | Link sticker          | Idea     |

Reserve 1–2 SLOTS/week for reactive/trend posts — do NOT pre-fill them.
```

**Status pipeline (use these exact states):** `Idea → Draft → Internal review → Client approval → Scheduled → Published → Reported`. Nothing publishes without `Client approval`.

**Batching workflow:** plan + draft a full month in one session → one designer/asset pass → one approval round (§8 checklist) → schedule all at once (Buffer/Later/Hootsuite/Metricool/native schedulers) → keep reactive slots open → report at month end (§6).

---

## 6) Timing & posting — run an experiment, don't copy a generic chart

Generic "post Tue 8–10am" advice is **not actionable** — best times depend on the audience's timezone, niche, and platform, and they drift. Replace the cheat-sheet with a protocol:

1. **Baseline from the platform's own analytics.** Each platform reports when *your* followers are active (LinkedIn page analytics, IG/Threads Insights, X analytics, TikTok Pro, YouTube Studio). Start within those windows, not a blog's.
2. **Pick 2–3 candidate slots** spanning that active window (e.g., a morning, a midday, an evening slot in the audience's primary timezone).
3. **Rotate, hold everything else constant.** Vary only the time; keep format/topic/length comparable. Run each slot **≥3–4 times** before judging — single posts are noise. (For rigorous design see `ab-testing`.)
4. **Judge on the right metric for the objective:** reach/impressions for awareness; saves+shares for value content; **link clicks via UTM** for leads/launch; watch-time/completion for video. Vanity likes are the weakest signal.
5. **Tag every link with UTMs** so `marketing-analytics` can attribute traffic/conversions by platform and post:
   ```
   https://example.com/offer
     ?utm_source=linkedin
     &utm_medium=social
     &utm_campaign=launch_2026q3
     &utm_content=carousel_3mistakes
   ```
   Keep `utm_source` = platform, `utm_medium` = `social` (or `social-paid`), `utm_campaign` = the kit/launch, `utm_content` = the specific creative. Use a UTM builder + link shortener for clean display.
6. **Holdout check for promos:** when a post claims to drive signups/sales, don't post the same offer everywhere at once — stagger or hold one platform back a few days to sanity-check that the spike tracks the post.
7. **Iterate weekly/monthly:** keep slots that win on the objective metric, kill the rest, re-test quarterly (audiences and algorithms move).

> Distribution mechanics (when to repost, reply-window effects, viral loops) belong to **social-media-growth** — defer there rather than asserting algorithm "hacks" here.

---

## 7) Compliance & policy guardrails (run before every kit ships)

Social posts carry real legal/platform-policy exposure. This is general guidance, **not legal advice — verify with a qualified professional and the current platform/ FTC/ local-regulator rules** for the client's jurisdiction. Check each item:

- **Paid / sponsored / affiliate disclosure (FTC + equivalents):** any material connection (payment, free product, affiliate commission, employee posting about own employer) must be **clearly and conspicuously** disclosed. Use a plain, unavoidable tag — **#ad** or **#sponsored** placed *before the "…more" fold*, plus the platform's built-in "Paid partnership" / branded-content tool. "#sp", "#ambassador", or a buried hashtag is **not** sufficient. Outside the US, follow local rules (e.g., UK ASA/CMA, EU UCPD) — they're similarly strict. See `influencer-marketing` for creator-side contract language.
- **Music & audio licensing:** **brand/business accounts cannot freely use the consumer trending-sounds catalogs.** Use each platform's **Commercial Music Library / licensed catalog** (TikTok Commercial Music Library, IG/Meta's licensed tracks for business, YouTube Audio Library) or your own/licensed audio. Unlicensed popular music gets posts **muted or taken down** and can trigger rights claims. Same caution for stock images, fonts, and footage — confirm the license covers commercial social use.
- **Giveaways / contests / sweepstakes:** must post **official rules** (eligibility, start/end dates, entry method, odds/no-purchase-necessary where required, sponsor identity). Each platform has promotion guidelines (e.g., release the platform from liability, don't require inaccurate tagging). Sweepstakes/contests are **regulated** and vary by state/country — check local law; some jurisdictions require registration/bonding. Get sign-off before launching one.
- **Testimonials & results claims:** endorsements must reflect **truthful, typical** experience; non-typical results need a disclaimer. Keep **written consent** on file before reposting a customer's words/face/UGC. Don't fabricate or incentivize reviews without disclosure.
- **Regulated / sensitive claims (health, finance, crypto, supplements, legal):** avoid unsubstantiated efficacy, earnings, or investment claims; many are governed by sector regulators (FDA/FTC, SEC/FCA, etc.) and platform ad policies. Add required risk/disclosure language; route to compliance/legal. For crypto/DeFi, never imply guaranteed returns.
- **Privacy & data:** don't post customer PII, internal data, minors' images without guardian consent, or anything under NDA. Geotags can leak sensitive locations.
- **Platform content & community policies:** each platform bans certain content/claims and restricts engagement-bait ("comment X to get the link" can be throttled or penalized depending on platform). Check the platform's current community + advertising policies for the niche before scheduling.
- **Accessibility (do this as standard):** add **alt-text** to images and **captions/subtitles** to all video — it's required for inclusive reach and improves discovery; several platforms surface it in search.

**Disclosure quick-reference:**

| Situation | Minimum disclosure |
|---|---|
| Paid sponsorship | "Paid partnership" tool + **#ad** above the fold |
| Free product (gifted) | Built-in tag + clear "gifted by {brand}" / #ad |
| Affiliate link | "#ad" or clear "I earn a commission" near the link |
| Employee/founder promoting own brand | State the affiliation in-post |
| Giveaway | Official rules link + "no purchase necessary" where applicable |
| Customer testimonial | Written consent on file + typicality note if results atypical |

---

## 8) Approval checklist & deliverable format

**Pre-publish sign-off (every post must pass):**

- [ ] On-spec for the platform (char count, slide count, aspect ratio, length — §1, verified live)
- [ ] Hook works *before the fold* / in the first 1–2s of video
- [ ] One clear CTA, correct link, **UTM attached** (§6)
- [ ] On-brand voice; no banned phrases; spelling/grammar
- [ ] Visuals: correct dimensions, text in safe zones, **alt-text + captions** present
- [ ] **Compliance pass (§7):** disclosure if paid/affiliate; licensed music/assets; giveaway rules; consent for testimonial/UGC; no unsubstantiated regulated claims
- [ ] Links resolve; no placeholder `<TODO>` left
- [ ] Content-mix bucket tagged; not >~20% promo for the week
- [ ] Client/legal approval recorded → status moved to `Scheduled`

**Deliverable doc structure (what this skill outputs):**

```
# {Client} Social Kit — {Campaign}, {Month YYYY}
1. Objective + audience + platforms (from §0)
2. Voice + banned phrases
3. Per-platform spec sheet used (§1, with verify date)
4. The posts — grouped by platform, each with:
     - 3–5 hook variants (one marked RECOMMENDED)
     - full copy, on-spec
     - hashtag/keyword set
     - asset spec (size, format, alt-text, caption)
     - CTA + full UTM string
     - compliance flags + required disclosure
5. Repurposing map (which source → which posts)  (§4)
6. 4-week calendar grid (§5)
7. Posting-experiment plan (candidate slots + metric)  (§6)
8. Approval checklist status per post  (§8)
9. Reporting plan (metrics per objective, link to marketing-analytics)
```

Hand the doc to a scheduler (Buffer/Later/Metricool/native) or a designer; it should be copy-paste-ready with nothing left to invent.

---

## 9) Audience-specific quick playbooks

- **B2B SaaS:** LinkedIn-led (founder + company), X for reach, document carousels for frameworks, build-in-public + customer results. CTA → gated guide/demo. Light IG. Feed proof into `sales-funnel`.
- **Ecommerce / DTC:** IG + TikTok-led, heavy UGC and short demo video, shoppable/link-in-bio, seasonal calendar. Disclosure on every gifted/affiliate post (§7). Creative doubles as `paid-ads` source.
- **Creator / personal brand:** volume + consistency, one platform mastered before expanding, story+POV heavy, repurpose top performers relentlessly, newsletter as the owned-audience anchor (`email-sequence`).
- **Local service:** IG + Google Business + local hashtags/keywords, reviews/testimonials (with consent), service-area + event posts; pair with `local-seo`.
- **Launch campaign:** pre-launch tease → launch-day blast across all platforms (staggered, §6 holdout) → post-launch proof/recap; one `utm_campaign` ties it together; coordinate with `marketplace-launch` and `email-sequence`.
- **Thought leadership:** contrarian-but-defensible POVs, one-chart data posts, consistent cadence on one core platform, repurpose talks/podcasts; measure on saves/shares + inbound, not likes.

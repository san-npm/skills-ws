---
name: affiliate-marketing
description: "Affiliate/partner program design, commission economics, fraud-resistant tracking & attribution, compliance (FTC/GDPR/CPRA/tax/KYC), recruitment, and payout ops. Use when launching an affiliate program, designing commission terms, building click/conversion tracking, reviewing affiliate fraud, vetting payouts, or recruiting partners."
---

# Affiliate Marketing

## Workflow

### 1. Program Structure

**In-house vs network:**

| Factor | In-house | Network (ShareASale, Impact, CJ, etc.) |
|--------|----------|-----------------------------------|
| Setup cost | Higher (build/integrate tracking) | Lower (platform onboarding fee) |
| Ongoing cost | SaaS tracker fee + payment ops + fraud ops + tax/1099 ops + eng maintenance | Network override (commonly ~20-30% on top of commission) + per-payout fees |
| Control | Full | Limited by platform rules/TOS |
| Recruitment | You do it all | Access to affiliate marketplace |
| Tracking | Custom or SaaS (Rewardful, PartnerStack, FirstPromoter, Tolt) | Built-in |
| Best for | SaaS, high-value products, brand control | E-commerce, consumer products, fast volume recruitment |

**"In-house = free" is a myth.** Even self-hosting, you pay: SaaS tracker subscription (or build/maintain a click table), payment rails (PayPal/Wise/Tipalti fees, FX, reversals), fraud review labor, tax compliance (W-9/W-8BEN collection, 1099-NEC/1042-S filing), sanctions screening, and ongoing engineering. Budget 3-8% of affiliate GMV for ops on top of commissions; networks bundle most of this into their override.

**Recommendation:** Start in-house with a SaaS tracker (Rewardful, PartnerStack, FirstPromoter, Tolt) so you keep first-party data and brand control. Add a network only when you need volume recruitment in a marketplace and can absorb the override. Prices/overrides change — verify current network rates at impact.com / shareasale.com and tracker pricing on each vendor's site (as of Jun 2026).

### 2. Commission Models

| Model | Structure | Best for | Example |
|-------|-----------|----------|---------|
| CPA (Cost Per Acquisition) | Flat fee per signup/sale | SaaS free trials, lead gen | $50 per paid signup |
| CPS (Cost Per Sale) | % of sale value | E-commerce, variable pricing | 20% of first purchase |
| Recurring | % of subscription revenue | SaaS with monthly billing | 20% for a defined window (see below) |
| Tiered | Increasing % at volume thresholds | Motivating top performers | 20% (1-10), 25% (11-50), 30% (50+) |
| Hybrid | Base CPA + recurring bonus | Balanced motivation | $25 CPA + 10% recurring |

**Setting commission rates (margin/LTV-anchored, not a fixed rule):**
- Compute blended CAC and gross-margin LTV per segment. Cap total affiliate payout (CPA + lifetime recurring) so it stays a fraction of contribution margin — a common target is ≤25-40% of gross-margin LTV, but the right number depends entirely on your margins and competitive landscape.
- Recurring duration is a business choice, not a universal "12 months." Pick the window from margin and partner type:

| Partner / product | Typical recurring term | Why |
|------|------|------|
| SMB SaaS, thin margin | First 12 months | Caps liability where churn + payback risk is high |
| High-margin SaaS, sticky product | 24 months or lifetime | High LTV/long retention justifies sharing more; lifetime is a recruiting magnet (e.g., many infra/dev tools) |
| Ecommerce | One-time % of first order (sometimes 30-day repeat) | No subscription to share |
| High-ticket / enterprise | Flat CPA or % of first contract, sometimes Y1 only | Long sales cycle, large deal size, finance prefers a fixed liability |
| Agency / reseller | Margin share or revenue share for life of the account | They own the relationship and support |
| Influencer / large creator | Higher % or flat fee + bonus, often negotiated per-deal | Reach commands a premium; negotiate per partner |

- Trade-off to state explicitly: lifetime/long terms maximize recruitment and partner loyalty but create perpetual liability and harder unit-economics forecasting; short windows protect margin but recruit fewer top affiliates. Model both against gross-margin LTV before committing.
- Review rates quarterly using affiliate-sourced cohort LTV, refund/chargeback rate, and payback period vs other channels.

### 3. Tracking Implementation

Track in your database, not just a cookie. The cookie is a pointer to a server-side **click record** that carries the data you need to attribute, de-fraud, and reverse. Never derive a payout directly from a raw cookie value.

**Schema (Postgres):**
```sql
CREATE TABLE affiliates (
  id            BIGSERIAL PRIMARY KEY,
  status        TEXT NOT NULL DEFAULT 'pending', -- pending | active | paused | banned
  payout_hash   BYTEA,            -- hash of payout destination (detect linked accounts)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE affiliate_clicks (
  click_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id  BIGINT NOT NULL REFERENCES affiliates(id),
  landing_path  TEXT,
  utm_source    TEXT, utm_medium TEXT, utm_campaign TEXT,
  ip_hash       BYTEA,            -- hash, not raw IP (privacy)
  ua_hash       BYTEA,            -- coarse device/UA fingerprint hash
  consent       BOOLEAN NOT NULL DEFAULT FALSE,  -- analytics/marketing consent at click time
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON affiliate_clicks (affiliate_id, created_at);

CREATE TABLE affiliate_conversions (
  id            BIGSERIAL PRIMARY KEY,
  click_id      UUID REFERENCES affiliate_clicks(click_id),
  affiliate_id  BIGINT NOT NULL REFERENCES affiliates(id),
  customer_id   BIGINT NOT NULL,
  event_type    TEXT NOT NULL,          -- 'signup' | 'sale' | 'rebill'
  amount_cents  BIGINT NOT NULL,
  commission_cents BIGINT NOT NULL,
  idempotency_key  TEXT UNIQUE NOT NULL, -- e.g. order_id + event_type
  status        TEXT NOT NULL DEFAULT 'pending', -- pending | locked | approved | paid | reversed | rejected
  locked_until  TIMESTAMPTZ,            -- payout hold (refund/chargeback window)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Session fingerprints for fraud joins in §5 (self-referral / IP & device overlap)
CREATE TABLE customer_sessions (
  customer_id   BIGINT NOT NULL,
  ip_hash       BYTEA,
  ua_hash       BYTEA,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON customer_sessions (customer_id);
```

**On click — validate, then store a click record (signed click_id in the cookie):**
```javascript
const crypto = require('crypto');
const SECRET = process.env.AFFILIATE_COOKIE_SECRET; // 32+ random bytes

const sign = (v) => crypto.createHmac('sha256', SECRET).update(v).digest('base64url');

app.get('/ref/:affiliateId', async (req, res) => {
  // 1. Validate the affiliate exists AND is approved/active (not pending, banned, or paused)
  const aff = await getAffiliate(req.params.affiliateId);
  if (!aff || aff.status !== 'active') return res.redirect('/'); // silently drop, no cookie

  // 2. Record the click server-side with fraud + consent signals
  const click = await createClick({
    affiliateId: aff.id,
    landingPath: req.query.lp || '/',
    utm: { source: req.query.utm_source, medium: req.query.utm_medium, campaign: req.query.utm_campaign },
    ipHash: hashIp(req.ip),          // hash; do not store raw IP
    uaHash: hashUa(req.get('user-agent')),
    consent: req.cookies.consent === 'granted', // see Compliance: set strictly-necessary only pre-consent
  });

  // 3. Cookie holds an HMAC-signed click_id, not a guessable affiliate id
  const value = `${click.click_id}.${sign(click.click_id)}`;
  res.cookie('aff_click', value, {
    maxAge: cookieWindowMs(aff),  // per-program window, see table below
    httpOnly: true, secure: true, sameSite: 'lax', path: '/',
  });
  res.redirect(click.landingPath);
});
```

**On conversion — verify signature, enforce window + attribution rules, idempotent, reversible:**
```javascript
app.post('/api/checkout/complete', async (req, res) => {
  const raw = req.cookies.aff_click;
  if (!raw) return res.json({ ok: true }); // organic / direct — no attribution, do not invent one

  const [clickId, sig] = raw.split('.');
  if (!clickId || sig !== sign(clickId)) return res.json({ ok: true }); // tampered cookie

  const click = await getClick(clickId);
  if (!click) return res.json({ ok: true });

  // Attribution-window check (the click, not the cookie, is the source of truth)
  if (Date.now() - click.created_at.getTime() > cookieWindowMs({ id: click.affiliate_id })) {
    return res.json({ ok: true }); // expired
  }

  // Exclusions: existing customers, self-referral, paused affiliate
  const aff = await getAffiliate(click.affiliate_id);
  if (!aff || aff.status !== 'active') return res.json({ ok: true });
  if (await isExistingCustomerBeforeClick(req.user.id, click.created_at)) return res.json({ ok: true });
  if (await isSelfReferral(aff, req.user, click)) return res.json({ ok: true });

  // Idempotent write — survives retries / duplicate webhooks; hold for refund/chargeback window
  await recordConversion({
    clickId,
    affiliateId: aff.id,
    customerId: req.user.id,
    eventType: 'sale',
    amountCents: req.body.amount_cents,
    commissionCents: computeCommission(aff, req.body.amount_cents),
    idempotencyKey: `${req.body.order_id}:sale`, // UNIQUE — duplicate => no-op
    status: 'locked',
    lockedUntil: addDays(new Date(), 30), // do not pay until refund window passes
  });
  res.json({ ok: true });
});
```

**Reversal on refund/chargeback (clawback before payout):**
```javascript
// Stripe webhook: charge.refunded / charge.dispute.created
await db.query(
  `UPDATE affiliate_conversions SET status='reversed'
     WHERE idempotency_key=$1 AND status IN ('locked','approved')`,
  [`${orderId}:sale`]
);
// If already paid, record a negative adjustment against the affiliate's next payout.
```

**Cookie window standards:**

| Product type | Cookie window | Rationale |
|-------------|--------------|-----------|
| SaaS | 30-90 days | Longer consideration cycle |
| E-commerce | 7-30 days | Shorter purchase cycle |
| High-ticket | 90-180 days | Enterprise sales cycle |

**Coupon-code attribution (cookieless fallback):** Map a unique discount code → affiliate. At order time, if a tracked coupon is used, attribute to that affiliate. Resolve conflicts explicitly with the cookie/click (define which wins — usually the **explicitly-entered coupon** since it is a stronger intent signal than a stale cookie). Codes survive cross-device and consent-blocked tracking, so most programs offer both a link and a code.

**Attribution rules:**
- **Last click wins** — standard and simplest. The most recent *valid* affiliate click within the window gets credit.
- **First click wins** — rewards discovery (Amazon historically used variants of this). Keep the earliest valid click; later clicks don't overwrite.
- **Linear / multi-touch split** — complex and rarely worth it for affiliate; avoid unless you have multiple affiliates per journey and a reason to split.
- **Direct traffic does NOT erase a valid affiliate click.** A user clicking an affiliate link and later returning via direct/bookmark/branded-search should still convert to the affiliate while the click is within the window — that is the normal, fair behavior. Wiping it under-credits affiliates and is *not* an anti-fraud measure. (Self-referral fraud is handled by the `isSelfReferral` check and the fraud rules in §5, not by nuking direct traffic.) If you intentionally run *paid-search-last-touch* rules to stop affiliates poaching your own branded-search traffic, document that policy in the affiliate agreement — don't bury it in code.

### 4. Partner Recruitment

**Ideal affiliate profiles:**

| Type | Characteristics | Approach |
|------|----------------|----------|
| Content creators | Blog/YouTube in your niche | Outreach with free product + custom commission |
| Review sites | G2, Capterra, niche review blogs | Ensure listing, offer affiliate tracking |
| Influencers | Social following in target audience | Custom landing page + higher commission |
| Existing customers | Happy users with audience | In-app referral prompt + affiliate upgrade option |
| Agencies | Serve your target market | Reseller/referral hybrid program |

**Recruitment outreach template:**
```
Subject: Partner with [Product] — [X]% commission

Hi [Name],

I've been following your content on [specific topic] — [genuine compliment].

We're building [Product], which helps [audience] with [value prop].
I think it'd be a natural fit for your audience.

Our affiliate program:
- [X]% recurring commission (or flat $X per signup)
- [X]-day cookie window
- Dedicated affiliate dashboard
- Custom landing pages and creatives

Interested in trying it out? Happy to set you up with a free account
and walk through the program.

[Name]
```

### 5. Compliance

> This is operational guidance, not legal advice. Affiliate programs move money and touch privacy, tax, and advertising law across jurisdictions — have counsel review your agreement, disclosures, and data flows. Rules change; verify against the linked primary sources.

**FTC disclosure (US) — Endorsement Guides, updated 2023 and actively enforced through 2026:**
- Affiliates MUST disclose a material connection clearly and conspicuously, *before/near* the link, in the same medium (in-video for video, in-stream for audio), not only in a description or "link in bio."
- A bare `#ad`/`#sponsored` can be sufficient if unavoidable; vague terms like `#collab`, `#sp`, `#ambassador`, or `#partner` are not. Platform "paid partnership" toggles do not replace a clear disclosure.
- The brand can be liable for affiliates' deceptive claims. The FTC's 2023 rule allows civil penalties for fake/incentivized reviews and undisclosed insider endorsements — your contract must require truthful, substantiated claims and ban fake reviews and "review gating." Primary source: FTC Endorsement Guides + the Rule on Consumer Reviews and Testimonials (ftc.gov).
- Put disclosure obligations, an approved-claims list, and audit rights in the affiliate agreement, and monitor (don't just promise to monitor — the FTC expects active monitoring).

**Privacy & consent (table stakes by 2026 — do not ship cookie tracking without this):**
- **EU/UK (GDPR + ePrivacy):** affiliate/analytics cookies are not "strictly necessary," so you need prior opt-in consent before setting them. Pre-consent, set only a strictly-necessary cookie; gate the `/ref` click cookie and any device hashing on `consent === granted`. Honor IAB TCF signals if you use a CMP. Use coupon-code attribution as the cookieless fallback for non-consenting EU users.
- **US (CPRA/CCPA + state laws):** offer a "Do Not Sell or Share My Personal Information" / opt-out, honor Global Privacy Control (GPC) browser signals, and disclose affiliate tracking in your privacy policy. Sharing click data with networks can count as a "sale/share."
- Store IP/UA as salted hashes, set a data-retention limit on click logs, and write affiliate data sharing into your DPA / privacy policy. Verify current obligations at gdpr.eu, ico.org.uk, and oag.ca.gov/privacy (as of Jun 2026).

**Advertising-channel & trademark rules (protect brand + avoid account bans):**
- Email: affiliates emailing on your behalf must comply with **CAN-SPAM** (US), **CASL** (Canada — express consent + identification), and GDPR/PECR (EU/UK). Ban purchased lists and require working unsubscribe + sender identification in the agreement.
- Paid search: forbid bidding on your brand/trademark terms and trademark + "coupon/discount/promo" combos, and ban direct-linking / typosquatting / fake domains. Forbid running ads that impersonate you.
- Platform policies: Google/Meta/TikTok/Amazon Associates each restrict how affiliate links and incentivized content run — affiliates violating these can get your assets flagged. Reference them in the agreement.

**Tax, KYC & sanctions (before you pay anyone):**
- Collect tax forms before first payout: **W-9** (US persons) / **W-8BEN(-E)** (non-US). File **1099-NEC** for US payees over the IRS threshold (verify the current-year threshold at irs.gov) and **1042-S** for applicable foreign payees; withhold where required.
- KYC/identity verification on affiliates (especially high-payout) to prevent payout fraud and money laundering; many payout providers (Tipalti, Trolley/PayPal, Wise) bundle this.
- **Sanctions screening:** screen affiliates and payout destinations against OFAC SDN and equivalent EU/UK lists; block payouts to sanctioned persons/countries. Bake "we may withhold payment for legal/sanctions/fraud reasons" into the agreement.
- VAT/GST: in some jurisdictions affiliate commission is a taxable supply — clarify who issues invoices and whether commissions are inclusive/exclusive of VAT.

**Affiliate agreement must-have clauses:** disclosure & truthful-claims obligations + audit rights; prohibited methods (brand bidding, spam, cookie stuffing, self-referral, incentivized/fake reviews, adware); payout terms, hold/lock period, clawback on refund/chargeback/fraud; consent/data-handling obligations; right to withhold for legal/sanctions/fraud; termination + survival of clawback.

**Fraud detection — run these as scheduled reviews, hold suspicious conversions before payout** (uses the §3 schema, including `customer_sessions` and the hashed `affiliates.payout_hash` of each affiliate's payout destination):

```sql
-- 1. Self-referral / IP & device overlap (click and conversion share fingerprint)
SELECT cv.affiliate_id, cv.customer_id
FROM affiliate_conversions cv
JOIN affiliate_clicks ck ON ck.click_id = cv.click_id
JOIN customer_sessions cs ON cs.customer_id = cv.customer_id
WHERE ck.ip_hash = cs.ip_hash OR ck.ua_hash = cs.ua_hash;

-- 2. Cookie stuffing / forced clicks: huge click volume, near-zero conversion, sub-second dwell
SELECT affiliate_id,
       COUNT(*) AS clicks,
       AVG(EXTRACT(EPOCH FROM (first_conv.created_at - ck.created_at))) AS avg_dwell_s
FROM affiliate_clicks ck
LEFT JOIN LATERAL (
  SELECT created_at FROM affiliate_conversions c
  WHERE c.click_id = ck.click_id ORDER BY created_at LIMIT 1
) first_conv ON true
WHERE ck.created_at > now() - interval '7 days'
GROUP BY affiliate_id
HAVING COUNT(*) > 5000
   AND COUNT(*) FILTER (WHERE first_conv.created_at IS NOT NULL)::float / COUNT(*) < 0.001;

-- 3. Abnormal conversion rate (suspiciously high CVR vs program median)
WITH per_aff AS (
  SELECT a.id AS affiliate_id,
         COUNT(DISTINCT ck.click_id) AS clicks,
         COUNT(DISTINCT cv.id)       AS conversions
  FROM affiliates a
  LEFT JOIN affiliate_clicks ck      ON ck.affiliate_id = a.id
  LEFT JOIN affiliate_conversions cv ON cv.affiliate_id = a.id
  WHERE ck.created_at > now() - interval '30 days'
  GROUP BY a.id
)
SELECT affiliate_id, clicks, conversions,
       ROUND(conversions::numeric / NULLIF(clicks,0), 4) AS cvr
FROM per_aff
WHERE clicks > 100 AND conversions::numeric / NULLIF(clicks,0) > 0.20  -- tune to your niche
ORDER BY cvr DESC;

-- 4. High refund/chargeback rate (low-quality or fraudulent traffic)
SELECT affiliate_id,
       COUNT(*) AS conversions,
       COUNT(*) FILTER (WHERE status = 'reversed') AS reversed,
       ROUND(COUNT(*) FILTER (WHERE status='reversed')::numeric / COUNT(*), 3) AS reversal_rate
FROM affiliate_conversions
WHERE created_at > now() - interval '90 days'
GROUP BY affiliate_id
HAVING COUNT(*) >= 10
   AND COUNT(*) FILTER (WHERE status='reversed')::numeric / COUNT(*) > 0.10
ORDER BY reversal_rate DESC;

-- 5. Duplicate / linked accounts (same payout destination across "different" affiliates)
SELECT payout_hash, array_agg(id) AS affiliate_ids, COUNT(*)
FROM affiliates
GROUP BY payout_hash
HAVING COUNT(*) > 1;
```

Additional non-SQL checks: brand-bidding violations (monitor paid-search SERPs for your trademark via a rank/ad monitor), minimum click→conversion dwell (reject sub-second), and a manual quarterly review of the top affiliates by revenue. Default-hold (`status='locked'`) all conversions through the refund window so fraudulent ones can be reversed before any payout.

### 6. Performance Optimization

**Monthly affiliate dashboard:**

| Metric | Calculate | Benchmark |
|--------|-----------|-----------|
| Active affiliates | Affiliates with ≥1 conversion/month | 10-20% of total |
| Revenue per affiliate | Total affiliate revenue / Active affiliates | Track trend |
| Conversion rate | Conversions / Clicks | 2-5% (depends on niche) |
| EPC (Earnings Per Click) | Total commissions / Total clicks | $0.50-2.00 |
| Average commission | Total paid / Total conversions | Track vs CAC |
| Affiliate-sourced % | Affiliate revenue / Total revenue | 10-30% target |

**Top performer strategy:**
- Identify top 10% of affiliates by revenue
- Offer exclusive commission rates (+5-10%)
- Provide early access to new features for content
- Quarterly check-in call with affiliate manager
- Custom creatives and co-branded landing pages

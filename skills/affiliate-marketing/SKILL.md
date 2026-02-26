---
name: affiliate-marketing
description: "Affiliate program design, commission structures, partner recruitment, tracking implementation, and performance optimization."
---

# Affiliate Marketing

## Workflow

### 1. Program Structure

**In-house vs network:**

| Factor | In-house | Network (ShareASale, Impact, etc.) |
|--------|----------|-----------------------------------|
| Setup cost | Higher (build tracking) | Lower (platform fee) |
| Commission fee | None (just payouts) | 20-30% on top of commission |
| Control | Full | Limited by platform rules |
| Recruitment | You do it all | Access to affiliate marketplace |
| Tracking | Custom or SaaS (Rewardful, FirstPromoter) | Built-in |
| Best for | SaaS, high-value products | E-commerce, consumer products |

**Recommendation:** Start in-house with a SaaS tracker (Rewardful, PartnerStack, FirstPromoter). Move to network only if you need volume affiliate recruitment.

### 2. Commission Models

| Model | Structure | Best for | Example |
|-------|-----------|----------|---------|
| CPA (Cost Per Acquisition) | Flat fee per signup/sale | SaaS free trials, lead gen | $50 per paid signup |
| CPS (Cost Per Sale) | % of sale value | E-commerce, variable pricing | 20% of first purchase |
| Recurring | % of subscription revenue | SaaS with monthly billing | 20% recurring for 12 months |
| Tiered | Increasing % at volume thresholds | Motivating top performers | 20% (1-10), 25% (11-50), 30% (50+) |
| Hybrid | Base CPA + recurring bonus | Balanced motivation | $25 CPA + 10% recurring |

**Setting commission rates:**
- Calculate your CAC from other channels
- Set affiliate commission at 30-50% of your average CAC (profitable from day 1)
- For SaaS: recurring commission should cap at 12 months (prevents perpetual liability)
- Review rates quarterly based on affiliate-sourced LTV vs other channels

### 3. Tracking Implementation

**Server-side tracking (recommended — survives ad blockers):**
```javascript
// On referral click — store affiliate ID
app.get('/ref/:affiliateId', (req, res) => {
  res.cookie('affiliate_id', req.params.affiliateId, {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30-day cookie
    httpOnly: true,
    secure: true,
    sameSite: 'lax'
  });
  res.redirect('/');
});

// On conversion — attribute to affiliate
app.post('/api/signup', async (req, res) => {
  const affiliateId = req.cookies.affiliate_id;
  if (affiliateId) {
    await recordConversion({
      affiliateId,
      customerId: newUser.id,
      value: plan.price,
      type: 'signup'
    });
  }
});
```

**Cookie window standards:**

| Product type | Cookie window | Rationale |
|-------------|--------------|-----------|
| SaaS | 30-90 days | Longer consideration cycle |
| E-commerce | 7-30 days | Shorter purchase cycle |
| High-ticket | 90-180 days | Enterprise sales cycle |

**Attribution rules:**
- Last click wins (standard, simplest)
- First click wins (rewards discovery, used by Amazon)
- Linear (split credit) — complex, avoid unless needed
- Direct traffic always overrides affiliate (prevent self-referral fraud)

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

**FTC disclosure requirements:**
- Affiliates MUST disclose the relationship ("I earn a commission if you buy through my link")
- Disclosure must be clear, conspicuous, and BEFORE the link
- "Ad" or "Sponsored" labels on social media
- Include disclosure guidelines in your affiliate agreement

**Fraud prevention:**
- Monitor for self-referrals (same IP for click and conversion)
- Flag unusually high conversion rates (> 20% = suspicious)
- Require minimum cookie age (> 1 second between click and conversion)
- Ban coupon/deal sites from bidding on your brand keywords
- Review top affiliates manually quarterly

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

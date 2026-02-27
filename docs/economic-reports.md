# Economic Models — Passive Income Apps
## Commit Media SARL — February 2026

---

## 1. ReceiptSnap — AI Receipt Scanner & Expense Tracker

### The Market
- Expense management market: $6.4B globally, growing 10%/year
- Dominated by enterprise players: Expensify ($147M ARR), Zoho Expense, SAP Concur
- **Gap:** No good lightweight, privacy-first, client-side-only receipt scanner for freelancers and micro-businesses
- EU freelancer market: 30M+ people. Luxembourg alone has 12k+ independent workers

### Competition (honest assessment)
- **Expensify:** $5/user/month, enterprise-focused, overkill for solo freelancers
- **Wave:** Free but US-focused, requires account, not privacy-first
- **Smart Receipts (Android):** Open source, ugly, but free
- **Our angle:** No account needed, all data stays on device (IndexedDB), EU VAT detection, €4.99/mo cheaper than everything except free

### Revenue Model
| Metric | Value |
|--------|-------|
| Price | €4.99/mo or €39.99/yr |
| Free tier | 5 scans/month |
| Conversion rate (realistic) | 2-4% of active users |
| Churn (monthly) | 5-8% |
| Customer LTV (12mo avg) | ~€35 |
| CAC target | <€10 |

### Revenue Timeline (realistic)
| Month | Users | Paying | MRR |
|-------|-------|--------|-----|
| 1-3 | 50-200 | 0-5 | €0-25 |
| 4-6 | 500-1,000 | 15-30 | €75-150 |
| 7-12 | 2,000-5,000 | 60-150 | €300-750 |
| 12-18 | 5,000-10,000 | 150-400 | €750-2,000 |

### How users find it
- SEO: "receipt scanner app", "expense tracker freelancer", "scan receipt VAT"
- Product Hunt launch (one-time spike)
- Reddit/IndieHackers posts
- Word of mouth from freelancer communities

### Your time investment
- **Setup (one-time, 2-3h):** Stripe account, domain, privacy policy approval
- **Ongoing:** Near zero. I handle updates, bug fixes, SEO
- **Marketing (optional):** 1h/week posting in freelancer communities for first 3 months

### Costs
| Item | Monthly |
|------|---------|
| Vercel hosting | €0 (free tier) |
| Domain | ~€1 (amortized) |
| Stripe fees | 1.4% + €0.25/transaction |
| **Total** | **~€1/mo** |

### Honest verdict
**Low ceiling, low effort.** This is a €500-2k/mo app at best unless you build a mobile native version and get App Store distribution. The web-only version will struggle with discoverability. Good as a portfolio piece and steady small income. Won't make you rich.

**Risk: 3/10 | Effort: 2/10 | Upside: 4/10**

---

## 2. CryptoTax.eu — EU Crypto Tax Calculator

### The Market
- Crypto tax software market: ~$1.5B, growing 20%/year with increasing regulation
- EU is tightening: MiCA regulation, DAC8 directive (mandatory exchange reporting from 2026)
- Koinly: estimated $20-50M ARR, 2M+ users
- CoinTracker: $100M+ funding, acquired by Intuit
- **Gap:** Most tools are US-first. EU country-specific rules (France PFU, Germany 1yr exemption, Luxembourg 6mo) are poorly supported or afterthoughts

### Competition (honest assessment)
- **Koinly:** €49-€279/year. Best EU support but still generic
- **CoinTracker:** US-focused, expensive
- **Blockpit:** EU-focused competitor based in Austria. €49-€199/year. They're our real competition
- **Wundertax/Taxfix:** German-only, broader tax tools with some crypto support
- **Our angle:** Free up to 25 txns, EU-specific from day one, client-side privacy, cheaper than all competitors at €29.99/yr

### Revenue Model
| Metric | Value |
|--------|-------|
| Price | €29.99/year |
| Free tier | 25 transactions, 1 tax year |
| Conversion rate | 5-10% (tax tools convert well — people NEED the report) |
| Churn (annual) | 20-30% (seasonal — many buy once per tax season) |
| Customer LTV | ~€45 (1.5 years avg) |
| CAC target | <€15 |

### Revenue Timeline (realistic)
| Month | Users | Paying | MRR |
|-------|-------|--------|-----|
| 1-3 | 100-500 | 5-25 | €12-62 |
| 4-6 | 1,000-3,000 | 50-150 | €125-375 |
| 7-12 | 5,000-15,000 | 250-750 | €625-1,875 |
| **Tax season (Jan-Apr)** | **Spike** | **500-2,000** | **€1,250-5,000** |
| Year 2 | 20,000-50,000 | 1,000-5,000 | €2,500-12,500 |

### How users find it
- **SEO (primary):** "crypto tax calculator France", "déclaration crypto impôts", "Krypto Steuer Deutschland", "crypto tax Luxembourg"
- **Programmatic SEO:** Generate pages for every EU country + language combo (30+ pages)
- **Reddit:** r/CryptoTax, r/vosfinances, r/Finanzen
- **Tax season Google Ads:** €5-15 CPA in Jan-Apr when intent is highest

### Your time investment
- **Setup (one-time, 3-4h):** Stripe, domain (cryptotax.eu if available), privacy policy, GDPR compliance
- **Ongoing:** Near zero for maintenance
- **Critical:** Tax rules change yearly — I need 2-3 hours/year per country to update rules (or you verify my updates)
- **Marketing (recommended):** 2-3 blog posts in French about crypto tax declarations during tax season

### Costs
| Item | Monthly |
|------|---------|
| Vercel hosting | €0 |
| Domain (cryptotax.eu) | ~€2 (amortized) |
| Stripe fees | 1.4% + €0.25 |
| CoinGecko API (free tier) | €0 |
| Google Ads (tax season only) | €100-500 (Jan-Apr) |
| **Total** | **~€2/mo off-season, €100-500/mo tax season** |

### Honest verdict
**Best opportunity of the four.** Real pain, real willingness to pay, seasonal urgency. EU-specific is genuinely underserved. €29.99/yr is impulse-buy territory. SEO compounds over time. Biggest risk: keeping tax rules accurate.

⚠️ **Legal:** MUST add disclaimer: "Estimates only, not tax advice. Consult a professional." Protects Commit Media SARL.

**Risk: 5/10 | Effort: 4/10 | Upside: 8/10**

---

## 3. FocusForge — Telegram Mini App Pomodoro + Tasks

### The Market
- Productivity app market: $90B+ globally
- Telegram Mini Apps: 900M users, in-app purchases hit $13.6M in Jan 2025 alone
- **Gap:** No good Pomodoro + task tracker as a Telegram Mini App

### Competition (honest assessment)
- **Forest:** $4M+/year, gamified focus timer. Native app only
- **Pomofocus.io:** Free web Pomodoro, no tasks, no monetization
- **In Telegram:** Almost nothing serious. Basic timer bots
- **Our angle:** Lives inside Telegram (zero friction), timer + tasks combined, Telegram Stars payment (no credit card needed)

### Revenue Model
| Metric | Value |
|--------|-------|
| Price | $3.99/mo via Telegram Stars (~260 Stars) |
| Free tier | Basic timer + 5 tasks/day |
| Telegram's cut | 0% on Stars currently |
| Conversion rate | 1-3% |
| Churn | 10-15%/month |
| Customer LTV | ~$16 (4 months avg) |

### Revenue Timeline (realistic)
| Month | Users | Paying | MRR |
|-------|-------|--------|-----|
| 1-3 | 200-1,000 | 2-10 | $8-40 |
| 4-6 | 1,000-5,000 | 20-75 | $80-300 |
| 7-12 | 5,000-20,000 | 75-300 | $300-1,200 |
| 12-24 | 20,000-100,000 | 300-1,500 | $1,200-6,000 |

### Your time investment
- **Setup (one-time, 1-2h):** Create bot via BotFather, configure Mini App URL, Stars payments
- **Ongoing:** Near zero
- **Marketing:** Post in 5-10 Telegram productivity groups at launch

### Costs
| Item | Monthly |
|------|---------|
| Everything | €0-1 |

### Honest verdict
**Low cost, low effort, medium upside.** Telegram Mini Apps are a land grab. Risk: Telegram user base skews towards lower purchasing power regions. Western Telegram users are smaller but pay more. Could surprise if it goes viral.

**Risk: 3/10 | Effort: 1/10 | Upside: 5/10**

---

## 4. RentCalc EU — Rental Property Investment Calculator

### The Market
- EU residential real estate: €30T+ in value
- "Rental yield calculator" gets 12k+ monthly searches globally
- **Gap:** No EU-wide tool comparing yields across countries with tax adjustments
- Luxembourg: Highest property prices in EU, massive expat investor community

### Competition (honest assessment)
- **Generic calculators:** Dozens exist. All US/UK focused
- **Calculette.net (France):** Basic, free, French-only
- **Immobilienscout24 (Germany):** Basic calculator, German-only
- **No EU-wide comparison tool exists**
- **Our angle:** Multi-country comparison, tax-adjusted yields, programmatic SEO for 500+ EU cities

### Revenue Model
| Metric | Value |
|--------|-------|
| Price | €9.99/mo or €79.99/yr |
| Free tier | Single property calculator |
| Conversion rate | 3-5% (high intent investors) |
| Churn | 5-8%/month |
| Customer LTV | ~€70 (7 months avg) |
| CAC target | <€20 |

### Revenue Timeline (realistic)
| Month | Users | Paying | MRR |
|-------|-------|--------|-----|
| 1-3 | 100-300 | 0-5 | €0-50 |
| 4-6 | 500-1,500 | 15-45 | €150-450 |
| 7-12 | 2,000-8,000 | 60-240 | €600-2,400 |
| 12-24 | 10,000-30,000 | 300-1,500 | €3,000-15,000 |

### How users find it
- **SEO (90% of traffic):** "rendement locatif Lyon", "Mietrendite berechnen München", "rental yield Lisbon"
- **Programmatic SEO:** Auto-generate 500+ city pages, each ranking independently
- **Real estate forums, LinkedIn**

### Your time investment
- **Setup (one-time, 3-4h):** Stripe, domain, privacy policy
- **Data verification (one-time, 4-6h):** Spot-check tax rates and rental data for key countries
- **Ongoing:** Near zero. SEO does the work

### Costs
| Item | Monthly |
|------|---------|
| Vercel | €0 |
| Domain (rentcalc.eu) | ~€2 |
| Real estate data APIs | €0-50 |
| **Total** | **~€2-50/mo** |

### Honest verdict
**Highest long-term upside, slowest start.** SEO takes 6-12 months to compound, but once it does, it's a machine. Property investors have money. 500+ programmatic city pages = massive moat. This is the "plant a tree" play.

**Risk: 4/10 | Effort: 3/10 | Upside: 9/10**

---

## Portfolio Summary

### Combined Revenue (realistic, all 4 apps)
| Timeframe | Monthly Revenue |
|-----------|----------------|
| Month 3 | €25-275 |
| Month 6 | €350-1,275 |
| Month 12 | €1,675-6,025 |
| Month 18 | €3,500-15,000 |
| Month 24 | €5,000-25,000 |

### Combined Costs
| Item | Monthly |
|------|---------|
| Vercel (free tier) | €0 |
| Domains (4) | ~€6 |
| Stripe fees | ~2-3% of revenue |
| Aleph VMs (2) | ~€10 |
| Google Ads (seasonal) | €100-500 (4 months/year) |
| **Total overhead** | **€16-516/mo** |

### Your Total Time Investment
| Activity | One-time | Ongoing |
|----------|----------|---------|
| Stripe setup | 2h | — |
| Domain purchases | 1h | — |
| Legal review (privacy/terms) | 2h | — |
| BotFather setup (FocusForge) | 30min | — |
| Tax rule verification (CryptoTax) | — | 3h/year |
| RentCalc data spot-check | 4h | 2h/year |
| Marketing posts (optional) | — | 1-2h/week for 3 months |
| **Total** | **~10h** | **1-2h/month** |

### Key Risks (no bullshit)
1. **Client-side only = no real paywall.** Users can clear IndexedDB and reset free limits. Real monetization needs server-side auth eventually.
2. **SEO takes time.** Months 1-6 will be near zero organic traffic.
3. **Tax accuracy liability.** CryptoTax.eu needs bulletproof disclaimers.
4. **Telegram Stars payout rules can change anytime.**
5. **No mobile apps.** Web-only limits discoverability vs native App Store.
6. **I can't enforce payments.** Without a backend, "Pro" features are just a client-side toggle. A developer could bypass it in 5 minutes.

### Priority Order
1. **CryptoTax.eu** — best risk/reward, seasonal urgency
2. **RentCalc EU** — highest ceiling, needs time
3. **FocusForge** — lowest effort, good experiment
4. **ReceiptSnap** — solid but crowded

### What I Handle vs What You Handle

**I handle (autonomous):**
- Code, bug fixes, updates, new features
- SEO, meta tags, sitemap, programmatic pages
- Landing pages, comparison content
- Monitoring, deployments
- Analytics setup

**You handle:**
- Stripe account (Commit Media SARL)
- Domain purchases + DNS
- Telegram bot creation (BotFather)
- Legal review (I draft, you approve)
- Tax rule confirmation (CryptoTax)
- Customer support (minimal for self-serve)

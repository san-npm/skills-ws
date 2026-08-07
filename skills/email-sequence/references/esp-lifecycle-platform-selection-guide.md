## Contents

- ESP / Lifecycle Platform Selection Guide
- Decision Framework

## ESP / Lifecycle Platform Selection Guide

Pricing changes constantly and is usually metered by contacts, sends, monthly active profiles, or message volume — **verify current pricing on each vendor's page before committing** (links below). Choose by capability and data model, not list price.

| Platform | Category | Best for | Pricing model (verify current) |
|---|---|---|---|
| **Kit** (formerly ConvertKit) | Marketing | Creators, newsletters, course sellers | Contact-based; free starter tier — [kit.com/pricing](https://kit.com/pricing) |
| **Mailchimp** | Marketing | Small business getting started | Contact-based tiers — [mailchimp.com/pricing](https://mailchimp.com/pricing) |
| **Klaviyo** | Marketing + light CDP | Ecommerce (deep Shopify, revenue attribution) | Contact + SMS volume — [klaviyo.com/pricing](https://www.klaviyo.com/pricing) |
| **Customer.io** | Lifecycle (event-based) | SaaS behavioral automation, product-data triggers | Profiles/messages — [customer.io/pricing](https://customer.io/pricing) |
| **Loops** | Lifecycle | Modern SaaS, simple event flows | Contact-based — [loops.so/pricing](https://loops.so/pricing) |
| **Braze** | Enterprise lifecycle/CDP | Cross-channel (email+push+in-app) at scale | Custom/MAU — [braze.com](https://www.braze.com) |
| **Iterable** | Enterprise lifecycle/CDP | Cross-channel orchestration, large teams | Custom — [iterable.com](https://iterable.com) |
| **ActiveCampaign** | Marketing + CRM | SMB with sales-CRM needs | Contact tiers — [activecampaign.com/pricing](https://www.activecampaign.com/pricing) |
| **HubSpot** | Full marketing suite + CRM | Teams wanting marketing+sales+CRM in one | Contact + seat — [hubspot.com/pricing](https://www.hubspot.com/pricing) |
| **Postmark** | Transactional (delivery API) | Fast, reliable transactional email | Per-message volume — [postmarkapp.com/pricing](https://postmarkapp.com/pricing) |
| **Resend** | Transactional (dev-first) | Modern dev teams, React Email | Per-message volume — [resend.com/pricing](https://resend.com/pricing) |
| **Amazon SES** | Transactional/bulk (infra) | High-volume, lowest cost-per-email, you build the layer | Per-message — [aws.amazon.com/ses/pricing](https://aws.amazon.com/ses/pricing) |
| **Beehiiv** | Newsletter/media | Newsletter monetization & growth | Subscriber tiers — [beehiiv.com/pricing](https://www.beehiiv.com/pricing) |

> Marketing platforms (Kit, Klaviyo, Mailchimp, HubSpot…) optimize for campaigns, segments, and broadcast. **Lifecycle/CDP platforms** (Customer.io, Braze, Iterable, Loops) optimize for *event-triggered* journeys keyed on product behavior — see the event-driven automation section above. **Transactional senders** (Postmark, Resend, SES) optimize purely for inbox speed/reliability of system mail. Most mature stacks run a transactional sender *and* a marketing/lifecycle platform on separate subdomains.

### Decision Framework

- **Ecommerce:** Klaviyo (deep Shopify integration, revenue attribution)
- **SaaS, event-driven:** Customer.io or Loops (behavioral triggers on product data); Braze/Iterable when you need email+push+in-app at scale
- **Creator/Newsletter:** Kit or Beehiiv
- **Enterprise cross-channel:** Braze, Iterable, or HubSpot
- **Transactional only:** Postmark or Resend for best deliverability; Amazon SES when cost-per-email at high volume dominates
- **Budget-conscious starting out:** Mailchimp or Kit free tier

---

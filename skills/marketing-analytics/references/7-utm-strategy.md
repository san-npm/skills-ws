## Contents

- 7. UTM strategy
- 7.1 Convention
- 7.2 Rules (these are the ones people break)

## 7. UTM strategy

### 7.1 Convention

```
utm_source   = the platform / referrer        (google, facebook, linkedin, newsletter, partner-acme)
utm_medium   = the marketing channel type      (cpc, paid_social, email, referral, affiliate, display)
utm_campaign = the campaign                     (spring-sale-2026, product-launch-q2)
utm_content  = creative / placement variant     (hero-image-a, cta-blue, sidebar)
utm_term     = keyword                          (paid search only)
utm_id       = optional campaign ID joining to ad-platform cost (recommended for CAC/ROAS joins)
```

### 7.2 Rules (these are the ones people break)

- **All lowercase, hyphens not spaces/underscores.** GA4 treats `Email`, `email`, and `e-mail` as three different mediums — fragmentation destroys channel reports. Use the §6.6 QA query weekly.
- **Use the canonical `medium` values GA4 maps to default channel groups** (`cpc`, `paid_social`, `email`, `organic`, `referral`, `display`, `affiliate`). A made-up medium like `social-paid` falls into "Unassigned".
- **Never put UTMs on internal links.** A click on an internally-tagged link starts a **new session** and reattributes the user to that fake source — wiping the real acquisition channel. For internal A/B/CTA tracking use event parameters (§3.1), not UTMs.
- **Tag every external inbound link you control:** ads, email CTAs, social posts, partner placements, QR codes, paid newsletter slots.
- **Document the taxonomy in one shared sheet** and (better) generate URLs from a builder that enforces the allowed values — free-typed UTMs are the #1 source of dirty channel data.
- **Don't tag organic/owned destinations you don't want counted as campaigns** (e.g. links inside your own transactional emails to the app) unless you've decided they should be a channel.

---

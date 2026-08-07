## Contents

- Deliverability Checklist
- Email Authentication Setup
- SPF (Sender Policy Framework)
- DKIM (DomainKeys Identified Mail)
- DMARC (Domain-based Message Authentication)
- 2026 Bulk-Sender Compliance (Google / Yahoo / Microsoft / Apple)
- Legal & Consent Requirements (by jurisdiction)
- Full Deliverability Checklist

## Deliverability Checklist

### Email Authentication Setup

#### SPF (Sender Policy Framework)

Pick the ONE include that matches your actual sending provider. Do not paste all of these.

```dns
; Add to your domain's DNS as a TXT record. Use exactly ONE SPF record.
; --- Pick the include(s) for the ESP(s) you actually send through: ---
; Google Workspace:   v=spf1 include:_spf.google.com ~all
; SendGrid:           v=spf1 include:sendgrid.net ~all
; Mailchimp: no SPF include needed; authenticate via the 2 CNAME (DKIM) + 1 DMARC TXT records from the Mailchimp dashboard
; Amazon SES:         v=spf1 include:amazonses.com ~all
; Postmark:           v=spf1 include:spf.mtasv.net ~all
; Resend (on the send. subdomain Resend assigns): v=spf1 include:amazonses.com ~all
;   (copy the exact records from the Resend dashboard Records tab)

; CRITICAL RULES:
; - Exactly ONE SPF (v=spf1) TXT record per domain. Two SPF records = PermError = auth fails.
; - Hard cap of 10 DNS lookups across the WHOLE record (each include:/a/mx/redirect counts).
;   Stacking 4+ ESP includes (Google + SendGrid + Mailchimp + ...) commonly blows the limit
;   and silently breaks SPF. Audit with kitterman.com/spf/validate.html or dmarcian's tool.
; - Don't have one apex SPF for every product. Send each ESP from its OWN subdomain
;   (e.g. mail.yourdomain.com for marketing, txn.yourdomain.com for transactional), each with
;   its own single-include SPF + DKIM. This isolates reputation and dodges the 10-lookup ceiling.
; - SPF "flattening" (inlining IPs to save lookups) is a last resort — IPs drift, so only
;   automate it with a tool that re-flattens, never hand-maintain.
; - Use ~all (softfail) while validating; switch to -all (hardfail) once mail is confirmed aligned.
```

> Note: SPF alone does NOT survive forwarding and is NOT sufficient for DMARC alignment if your From domain differs from the envelope/Return-Path. DKIM is the more durable signal — configure both.

#### DKIM (DomainKeys Identified Mail)

```dns
; Your ESP provides the DKIM record. Add as CNAME or TXT:
selector1._domainkey.yourdomain.com → CNAME → provided-by-esp.dkim.example.com

; OR as TXT record:
selector1._domainkey.yourdomain.com  TXT  "v=DKIM1; k=rsa; p=MIGfMA0GCS..."

; Key points:
; - 2048-bit keys minimum
; - Rotate keys annually
; - Each ESP needs its own DKIM selector
```

#### DMARC (Domain-based Message Authentication)

```dns
; Start with monitoring mode:
_dmarc.yourdomain.com  TXT  "v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com; pct=100"

; After reviewing reports (2-4 weeks), move to quarantine:
_dmarc.yourdomain.com  TXT  "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com; pct=100"

; When confident, enforce:
_dmarc.yourdomain.com  TXT  "v=DMARC1; p=reject; rua=mailto:dmarc@yourdomain.com; pct=100"

; Migration path: none → quarantine → reject (over 4-8 weeks)
; Do NOT jump straight to p=quarantine/reject: until your rua aggregate reports show
; SPF/DKIM aligned for ~100% of legitimate mail, enforcement will silently junk your own email
; (forms, invoices, ESP, support tooling). Stage it after the reports are clean.
```

---

### 2026 Bulk-Sender Compliance (Google / Yahoo / Microsoft / Apple)

Google and Yahoo's bulk-sender rules took effect Feb 2024 and enforcement has only tightened since (Microsoft/Outlook.com began phasing in equivalent requirements for high-volume senders in 2025). **"Bulk sender" = roughly 5,000+ messages/day to a given provider's domains**, but treat these as table-stakes hygiene for ANY commercial sending — failing them lands you in spam regardless of volume.

**Mandatory for bulk senders (all of these, not pick-one):**

| Requirement | What it means in practice |
|---|---|
| **Authenticate with SPF *and* DKIM** | Both must pass. DKIM is the one that survives forwarding — never ship DKIM-less bulk mail. |
| **DMARC record published** | Minimum is a valid `p=none` policy on your From domain. You do NOT need quarantine/reject to be compliant — `p=none` with aggregate reporting satisfies the rule. Move to enforcement later, after alignment is clean. |
| **From-domain alignment** | The From: domain must align (relaxed is fine) with the SPF or DKIM domain. No more sending "From: you@yourbrand.com" via an unaligned ESP envelope. |
| **One-click unsubscribe (RFC 8058)** | Commercial/bulk mail MUST include both `List-Unsubscribe` AND `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers, and honor the resulting POST without making the user log in or click through extra pages. This is a hard requirement, not optional. (See header example below.) |
| **Visible unsubscribe in the body** | A clearly visible, working unsubscribe link in the message body, in addition to the header. |
| **Process unsubscribes within 2 days** | Google/Yahoo require honoring opt-outs **within 48 hours**, far stricter than CAN-SPAM's 10 business days. Build for near-real-time suppression. |
| **Spam complaint rate under threshold** | Keep complaints **below 0.3%** (measured in Google Postmaster Tools); **aim to stay under 0.1%**. Spikes above 0.3% get you throttled or blocked. |
| **No spoofing / valid PTR** | Sending IPs need valid forward and reverse DNS (PTR), and you must not impersonate Gmail/Yahoo From addresses. |
| **TLS for transport** | Use TLS for outbound connections (every reputable ESP does this by default). |

**RFC 8058 one-click unsubscribe headers** — your ESP usually injects these, but verify they're present and that the POST endpoint actually suppresses:

```
List-Unsubscribe: <https://yourdomain.com/unsub?u=USER_ID&c=CAMPAIGN_ID>, <mailto:unsub@yourdomain.com?subject=unsubscribe>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

When a mailbox provider's "Unsubscribe" UI button is clicked, the provider sends an HTTP `POST` (body `List-Unsubscribe=One-Click`) to your HTTPS URL. Your endpoint MUST suppress the recipient immediately and return 200 — no login, no confirmation page, no "are you sure?". A `List-Unsubscribe` header pointing only to a landing page that requires extra clicks does **not** satisfy RFC 8058.

> Apple Mail respects `List-Unsubscribe` and surfaces a native unsubscribe affordance too; Apple MPP (below) separately distorts open metrics. The same headers cover Apple — no extra work.

**Quick self-audit:** send a test to a Gmail account, open *Show original*, and confirm `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`, and that both List-Unsubscribe headers are present. Then enroll the domain in **Google Postmaster Tools** and **Yahoo Sender Hub** to watch complaint rate, spam rate, and domain/IP reputation over time.

---

### Legal & Consent Requirements (by jurisdiction)

Authentication gets you to the inbox; **consent law governs whether you're allowed to send at all.** Marketing email ≠ transactional email — most of these regimes only restrict *marketing/commercial* messages.

| Law / Region | Consent model | Key obligations |
|---|---|---|
| **CAN-SPAM (US)** | Opt-out | Truthful headers & subject; valid physical postal address in every email; clear unsubscribe honored within 10 business days (but honor in ≤2 days for bulk per provider rules above). No prior consent legally required, but it's best practice. |
| **GDPR + ePrivacy (EU/EEA)** | Opt-in | Freely-given, specific, informed consent before marketing email (narrow "soft opt-in" exists for existing customers re: similar products). Log proof of consent; honor withdrawal as easily as it was given; respect data-subject/erasure requests. |
| **PECR (UK)** | Opt-in | UK equivalent of ePrivacy; same soft opt-in carve-out for existing customers. Pairs with UK GDPR. |
| **CASL (Canada)** | Opt-in (express or implied) | Among the strictest: express or qualifying implied consent required; sender identification; functioning unsubscribe honored within 10 business days; keep consent records. Penalties are steep. |
| **Australia (Spam Act)** | Opt-in (express or inferred) | Consent + clear sender ID + working unsubscribe honored within 5 business days. |

**Transactional vs. marketing — the critical boundary:** Transactional/relationship messages (password resets, receipts, shipping, security alerts, account notices) are exempt from most consent rules and from CAN-SPAM's unsubscribe requirement. But the moment you add a promotional CTA, cross-sell, or "while you're here, upgrade" block, the email becomes *commercial* and the full marketing rules apply. **Keep transactional and marketing on separate sending subdomains/streams** (e.g., Postmark/SES for transactional, Klaviyo/Kit for marketing) so a marketing reputation problem never blocks password resets — and so you don't accidentally strip required marketing disclosures from genuine transactional mail.

> This is general guidance, not legal advice. Consent law varies by jurisdiction and changes; confirm your specific obligations with qualified counsel before launching to a new region.

### Full Deliverability Checklist

**Authentication (2026 bulk-sender minimum):**
- [ ] SPF record configured, single record, under 10 DNS lookups (check: mxtoolbox.com/spf.aspx)
- [ ] DKIM configured for all sending sources (2048-bit), passes on every stream
- [ ] DMARC record present at **minimum `p=none`** with `rua=` aggregate reporting; move to `quarantine`/`reject` only after reports show ~100% alignment — do not enforce blind
- [ ] From-domain aligns (relaxed OK) with the SPF or DKIM domain
- [ ] Return-Path/envelope sender aligned with From domain
- [ ] `List-Unsubscribe` **and** `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers present (RFC 8058), and the POST endpoint suppresses without login

**Infrastructure:**
- [ ] Dedicated sending IP (if volume >100K/month) or shared IP with good reputation
- [ ] IP warmed up properly (start with engaged users, increase volume 20-30%/day)
- [ ] Custom tracking domain (clicks/opens) — not the ESP default
- [ ] HTTPS on tracking domain

**List Hygiene:**
- [ ] Double opt-in enabled (or confirmed opt-in)
- [ ] Bounce management: remove hard bounces immediately
- [ ] Soft bounces: retry 3x, then remove
- [ ] Remove unengaged subscribers after 90 days of no opens/clicks
- [ ] Process unsubscribes within **48 hours** (Google/Yahoo bulk-sender rule; CAN-SPAM allows 10 business days but providers require 2; build for near-real-time suppression)
- [ ] Never purchase email lists — ever
- [ ] Run list through verification service before importing (NeverBounce, ZeroBounce)

**Content:**
- [ ] Text-to-image ratio: at least 60% text, 40% images
- [ ] Alt text on all images
- [ ] Unsubscribe link visible and functional
- [ ] Physical mailing address included (CAN-SPAM requirement)
- [ ] Avoid spam trigger words in subject lines
- [ ] No URL shorteners (bit.ly etc.) — flagged as suspicious
- [ ] Test with mail-tester.com before large sends (aim for 9+/10)

**Monitoring:**
- [ ] Enrolled in Google Postmaster Tools, Yahoo Sender Hub, and (for Outlook volume) Microsoft SNDS/JMRP
- [ ] Track inbox placement rate (not just delivery rate)
- [ ] Set up alerts for bounce rate >2% and **spam complaints — keep under 0.3% (Google/Yahoo hard ceiling), target <0.1%**
- [ ] Review DMARC aggregate (rua) reports monthly; confirm alignment before tightening policy

---

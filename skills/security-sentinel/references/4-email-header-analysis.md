## Contents

- 4. Email Header Analysis
- Validate Sender Authenticity
- Header Red Flags
- Interpreting Authentication Results

## 4. Email Header Analysis

### Validate Sender Authenticity

```bash
# Check SPF record
dig TXT example.com | grep "v=spf1"

# Check DKIM selector (replace "selector" with the real one from the email's
# DKIM-Signature header s= tag — common defaults: google, default, k1, s1)
dig TXT selector._domainkey.example.com

# Check DMARC policy
dig TXT _dmarc.example.com
```

### Header Red Flags

| Header Field | Check | Red Flag |
|-------------|-------|----------|
| `Return-Path` | Match with `From` | Different domain = spoofing attempt |
| `Received` chain | Trace hops | Unexpected mail servers |
| `Authentication-Results` | SPF/DKIM/DMARC | `fail` or `none` on any |
| `X-Mailer` | Software used | Bulk mailer or suspicious client |
| `Reply-To` | Match with `From` | Different address = phishing likely |
| `Message-ID` domain | Match with sender | Mismatch = forged email |

### Interpreting Authentication Results

```
Authentication-Results: mx.google.com;
  dkim=pass header.d=example.com;        ← GOOD: signed by claimed domain
  spf=pass (google.com: domain of noreply@example.com designates 1.2.3.4 as permitted sender);
  dmarc=pass (p=REJECT)                  ← GOOD: strict DMARC policy

If ANY of dkim/spf/dmarc = fail → SUSPICIOUS
If sender domain has no DMARC record → MEDIUM RISK (no spoofing protection)
If DMARC policy = none → LOW protection (monitoring only, not enforcing)
```

---

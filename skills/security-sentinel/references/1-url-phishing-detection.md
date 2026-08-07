## Contents

- 1. URL & Phishing Detection
- Scan Before Clicking
- Phishing Indicators (Heuristic)
- Typosquatting Detection

## 1. URL & Phishing Detection

### Scan Before Clicking

```bash
# VirusTotal URL scan
vt url "https://example.com" --include=last_analysis_stats,reputation

# Google Safe Browsing — v4 threatMatches:find still works until 2027-03-31.
# Migrate to v5 (real-time SearchHashes / hash-prefix lookups) for new builds; see §9.
curl -s "https://safebrowsing.googleapis.com/v4/threatMatches:find?key=$GSB_API_KEY" \
  -d '{
    "threatInfo": {
      "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
      "platformTypes": ["ANY_PLATFORM"],
      "threatEntryTypes": ["URL"],
      "threatEntries": [{"url": "https://example.com"}]
    }
  }'
```

### Phishing Indicators (Heuristic)

Check URLs against these red flags:

| Indicator | Risk | Example |
|-----------|------|---------|
| Homoglyph characters | High | `goog1e.com` (1 instead of l) |
| Excessive subdomains | Medium | `login.secure.account.example.xyz` |
| Recently registered (<30 days) | High | WHOIS creation_date check |
| Free hosting/URL shortener | Medium | `bit.ly`, `000webhostapp.com` |
| IP address as URL | High | `http://192.168.1.1/login` |
| Misspelled brand names | High | `paypa1.com`, `arnazon.com` |
| HTTP (no TLS) for login page | Critical | `http://bank.example.com/login` |
| Suspicious TLD | Medium | `.xyz`, `.top`, `.buzz`, `.tk` |

### Typosquatting Detection

A correct check must (1) decode punycode (`xn--`) to catch IDN homograph attacks, (2) fold Unicode confusables to their ASCII skeleton (so `раура1.com` with Cyrillic letters collapses onto `paypal`), and (3) compare the **eTLD+1** (registrable domain), not `split('.')[0]` — otherwise `paypal.com.evil.ru` and `paypal.attacker.io` slip through, and multi-label brands like `co.uk` confuse the base extraction. Compare both the edit-distance ratio AND an exact skeleton match (skeleton match = almost certainly malicious).

```python
# pip install tldextract idna confusable_homoglyphs
from difflib import SequenceMatcher
import idna, tldextract
from confusable_homoglyphs import confusables

KNOWN_BRANDS = [  # store as registrable domains (eTLD+1)
    "google.com", "facebook.com", "paypal.com", "amazon.com",
    "microsoft.com", "apple.com", "netflix.com", "coinbase.com",
    "binance.com", "metamask.io", "uniswap.org", "opensea.io",
]
# Fold a label to its ASCII/Latin "skeleton" so cross-script lookalikes collapse onto
# their Latin form. We pass preferred_aliases=['latin'] so is_confusable() returns the
# LATIN homoglyph of a non-Latin char (e.g. Cyrillic 'а' U+0430 -> 'a'); pure-ASCII chars
# return False and pass through unchanged.
def skeleton(s: str) -> str:
    out = []
    for ch in s:
        try:
            m = confusables.is_confusable(ch, greedy=True, preferred_aliases=["latin"])
        except Exception:
            m = False
        if m and m[0].get("homoglyphs"):
            out.append(m[0]["homoglyphs"][0]["c"])  # Latin canonical form
        else:
            out.append(ch)
    return "".join(out).lower()

BRAND_SKELETONS = {b: skeleton(tldextract.extract(b).domain) for b in KNOWN_BRANDS}

def registrable(domain: str) -> str:
    """Decode punycode, return eTLD+1 (handles co.uk, .com.br, etc.)."""
    try:
        domain = idna.decode(domain.encode("ascii")) if "xn--" in domain else domain
    except idna.IDNAError:
        pass
    ext = tldextract.extract(domain.lower())
    return f"{ext.domain}.{ext.suffix}" if ext.suffix else ext.domain

def check_typosquat(domain: str, threshold: float = 0.85) -> list:
    alerts = []
    reg = registrable(domain)            # e.g. paypal.com.evil.ru -> evil.ru
    label = tldextract.extract(reg).domain
    label_skel = skeleton(label)
    for brand, brand_skel in BRAND_SKELETONS.items():
        if reg == brand:
            continue
        if label_skel == brand_skel:     # confusable/homoglyph hit
            alerts.append(f"CRITICAL: '{domain}' confusable-matches '{brand}' (homoglyph skeleton)")
            continue
        ratio = SequenceMatcher(None, label, tldextract.extract(brand).domain).ratio()
        if ratio >= threshold:
            alerts.append(f"'{domain}' (reg: {reg}) resembles '{brand}' (similarity: {ratio:.0%})")
    # brand name present but NOT the registrable domain → impersonation in a subdomain/path host
    for brand in KNOWN_BRANDS:
        bl = tldextract.extract(brand).domain
        if bl in domain.lower() and registrable(domain) != brand:
            alerts.append(f"HIGH: '{brand}' label appears in '{domain}' but it is not {brand}")
    return alerts
```

---

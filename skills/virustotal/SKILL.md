---
name: virustotal
description: "URL, file, domain, and IP scanning via VirusTotal CLI and API. Threat detection, reputation checks, malware analysis, phishing detection."
---

# VirusTotal Scanner

Scan URLs, files, domains, and IPs for threats using VirusTotal.

## Prerequisites

Install vt CLI:
```bash
# Download from https://github.com/VirusTotal/vt-cli/releases
# Or: pip install vt-py (Python library)
vt init --apikey $VT_API_KEY
```

Free tier: 4 lookups/minute, 500/day. Premium: higher limits.

## Quick Scans

### Scan URL
```bash
vt scan url "https://example.com"
# Returns analysis ID, then:
vt url "https://example.com" --include=last_analysis_stats,reputation
```

### Scan Domain
```bash
vt domain "example.com" --include=last_analysis_stats,reputation,registrar,creation_date
```

### Scan File
```bash
vt scan file /path/to/file
# Or by hash:
vt file "SHA256_HASH" --include=last_analysis_stats,type_description,size
```

### Scan IP
```bash
vt ip "1.2.3.4" --include=last_analysis_stats,country,as_owner
```

## Interpreting Results

### Analysis Stats
```
harmless: X    — engines found it safe
malicious: X   — engines flagged as malicious
suspicious: X  — engines found it suspicious
undetected: X  — engines didn't flag it
```

**Decision matrix:**
- malicious = 0, suspicious = 0 → **Clean**
- malicious = 1-2 → **Likely false positive**, investigate vendor names
- malicious = 3-5 → **Suspicious**, proceed with caution
- malicious > 5 → **Malicious**, do not use/visit

### Reputation Score
- Positive → community voted safe
- Negative → community flagged as dangerous
- 0 → no community votes

## Batch Scanning

Scan multiple URLs from a file:
```bash
while IFS= read -r url; do
  echo "Scanning: $url"
  vt scan url "$url"
  sleep 15  # respect rate limit (free tier)
done < urls.txt
```

## Python API

```python
import vt
import os

client = vt.Client(os.environ["VT_API_KEY"])

# Scan URL
analysis = client.scan_url("https://example.com")
# Get results
url_obj = client.get_object("/urls/{url_id}")
stats = url_obj.last_analysis_stats
print(f"Malicious: {stats['malicious']}, Clean: {stats['harmless']}")

client.close()
```

## Security Audit Workflow

For auditing a website or skill:
1. Scan the main domain
2. Scan all external URLs referenced in code/config
3. Scan any downloadable files
4. Check domain age and registration (new domains = higher risk)
5. Report any URL with malicious > 0

## References

- [references/vt-api-guide.md](references/vt-api-guide.md) — API endpoints and advanced usage


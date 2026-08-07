---
name: virustotal
description: "Use VirusTotal CLI (`vt`) and Python (`vt-py`) for URL, file, domain, IP, Intelligence, LiveHunt, Retrohunt, relationship, and private-scanning workflows. Use when the requested tool or data source is specifically VirusTotal. For broader multi-source trust decisions, use `security-sentinel`."
---

# VirusTotal Scanner

Look up and triage URLs, files, domains, and IPs against VirusTotal's multi-engine aggregation (70+ AV engines, sandboxes, and crowd-sourced threat data).

> **VirusTotal is evidence, not proof.** Aggregated AV verdicts are a *signal*, not a clean bill of health. Zero detections never means "safe" (see the triage rubric below), and a few detections never means "definitely malware." Always combine VT data with context: file provenance, prevalence, behavior, and the relationships VT exposes.

## Privacy & confidentiality — read before submitting anything

Submitting a **file or URL** (`vt scan file`, `vt scan url`, `client.scan_file/scan_url`) **uploads it to VirusTotal**, where it becomes available to VirusTotal's premium customers, threat-intel partners, and antivirus vendors. Filenames, document metadata, embedded paths, certificates, and any secrets inside the file/URL (tokens, query-string credentials, internal hostnames) are exposed and effectively **permanent and non-retractable**.

Hard rules:

- **Do NOT upload** proprietary source, customer data, signed internal binaries, credentials, private keys, internal/staging URLs, or live incident artifacts **without explicit owner approval**.
- **Hash-first.** Before uploading a file, look it up by hash (`vt file <sha256>`). A hash lookup discloses *nothing* about the file's contents — only whether VT has seen that exact hash. Upload only when the hash is unknown *and* you're authorized to disclose the sample.
- **URLs leak too.** A URL with a session token or PII in the query string discloses those values. Strip secrets, or look up the domain/host reputation instead of submitting the full URL.
- For sensitive samples, use **Private Scanning** (VT Enterprise / Google Threat Intelligence) — files are analyzed in isolation and **not shared** with the community or vendors. See the Private Scanning section.
- **Public-API licensing limit:** the free/public API "must not be used in commercial products or services" or in business workflows that don't contribute new files. Commercial/automated use requires a Premium/Enterprise key.

## Prerequisites

Install the `vt` CLI (Go binary) and/or the `vt-py` Python library:

```bash
# CLI: download a release binary from
#   https://github.com/VirusTotal/vt-cli/releases  (macOS/Linux/Windows)
# or via Homebrew:
brew install virustotal-cli        # provides the `vt` binary

# Python library (separate from the CLI):
pip install vt-py                  # import as `import vt`

# Configure the CLI with your API key (stores it in ~/.vt.toml):
export VT_API_KEY="<your-api-key>"   # get one at https://www.virustotal.com (Profile > API key)
vt init --apikey "$VT_API_KEY"
```

### Rate limits & quotas (verify current numbers)

Public (free) API as of Jun 2026: **4 requests/minute, 500/day**, plus a monthly cap. Quotas are enforced on three axes (per-minute, daily, monthly); daily quota resets at **00:00 UTC**, monthly on the 1st at 00:00 UTC. Premium/Enterprise keys raise all three and unlock Intelligence search, sandbox feeds, LiveHunt/Retrohunt, and Private Scanning. Confirm your tier's exact limits at https://docs.virustotal.com/reference/public-vs-premium-api (limits change).

The CLI does not auto-throttle — add your own backoff in loops (see Batch Scanning) and handle HTTP 429 (`QuotaExceededError` in `vt-py`).

## Quick lookups (read-only — no upload)

Prefer these whenever you already have an IOC. None of these upload file contents.

```bash
# File by hash (MD5 / SHA-1 / SHA-256 all work as the identifier):
vt file <SHA256> --include=last_analysis_stats,last_analysis_date,reputation,type_description,size,meaningful_name,popular_threat_classification

# URL — note: the CLI accepts the raw URL and computes the URL id for you:
vt url "https://example.com/path" --include=last_analysis_stats,last_analysis_date,reputation,categories,last_final_url

# Domain (registration age + resolutions are strong phishing signals):
vt domain "example.com" --include=last_analysis_stats,reputation,categories,creation_date,registrar,last_dns_records

# IP address:
vt ip "203.0.113.10" --include=last_analysis_stats,reputation,country,as_owner,network
```

`--include` (repeatable, comma-separated) restricts the response to the attributes you list — faster, cheaper, and easier to parse than the full object.

## Submitting for fresh analysis (uploads — heed the privacy rules above)

```bash
# Re-analyze an item VT already knows, WITHOUT re-uploading the file
# (recomputes verdicts with today's engine signatures — use this for stale reports):
ANALYSIS_ID=$(curl -s -X POST -H "x-apikey: $VT_API_KEY" \
  "https://www.virustotal.com/api/v3/files/<SHA256>/analyse" | jq -r '.data.id')
vt analysis "$ANALYSIS_ID"

# Submit a NEW URL (uploads the URL); capture the analysis id, then poll it:
ANALYSIS_ID=$(vt scan url "https://suspicious.example/landing" | awk '{print $NF}')
vt analysis "$ANALYSIS_ID" --include=stats,status   # status: "queued" -> "completed"

# Submit a NEW file (uploads file bytes — only if authorized to disclose):
ANALYSIS_ID=$(vt scan file ./unknown.bin | awk '{print $NF}')
vt analysis "$ANALYSIS_ID"
```

**Rescan vs. retrieve vs. submit:**
- *Retrieve* (`vt file/url/domain/ip`): returns the last stored report. Free, no upload, but may be months old.
- *Rescan* (POST `/files/<hash>/analyse` via curl, `vt scan url` for known URLs): asks engines to re-evaluate a *known* item. No file upload. The `vt` CLI has no rescan flag; use the API endpoint. Use when `last_analysis_date` is stale.
- *Submit* (`vt scan file <path>`): uploads new bytes. Only for genuinely unknown, disclosable samples.

## Interpreting results — triage rubric (NOT a detection-count threshold)

`last_analysis_stats` looks like:

```
harmless: N     undetected: N
malicious: N    suspicious: N
timeout: N      confirmed-timeout: N    failure: N
```

**Do not** map a raw `malicious` count to a verdict. A single high-quality engine flag can be a true positive, while 60 "undetected" can still be fresh malware no engine has seen. Triage with the full picture:

| Signal | Where to find it | Why it matters |
|---|---|---|
| **Detection freshness** | `last_analysis_date` | A "0/70" report from 8 months ago says nothing about today. Rescan stale reports before trusting them. |
| **Which engines flagged it** | per-engine `last_analysis_results` | Reputable engines (e.g. major vendors) carry more weight than little-known ones. Generic names (`Trojan.Generic`, `ML.Attribute.HighConfidence`) and heuristic/ML hits are weaker than a specific family name. |
| **Threat classification** | `popular_threat_classification` | VT's consensus label + suggested family (e.g. `ransomware`, `Emotet`) — far more useful than the raw count. |
| **Sandbox behavior** | `behaviour` / `behaviour_summary` relationship | Files that touch the registry, inject, beacon to C2, or drop payloads are suspicious even at low detection counts. |
| **Relationships** | `contacted_domains`, `contacted_ips`, `contacted_urls`, `dropped_files`, `embedded_urls`, `bundled_files`, `pe_resource_parents` | Pivot to known-bad infrastructure even when the file itself is "clean". |
| **Prevalence / first seen** | `first_submission_date`, `times_submitted`, `total_votes` | A binary first seen an hour ago, submitted once, is higher risk than a years-old, globally common file. |
| **Community signal** | `reputation` (signed int), `total_votes.harmless/malicious`, comments | Crowd input — corroborating, not decisive; can be gamed. |
| **Categories** | domain/URL `categories` (per vendor) | `phishing`, `malware`, `parked`, `newly-registered` from URL-categorization vendors. |
| **Domain/IP age & infra** | `creation_date`, `registrar`, `last_dns_records`, `as_owner` | Days-old domains, bulletproof ASNs, and fast-flux DNS are classic phishing/C2 markers. |

Practical guidance:
- **Zero detections is NOT "clean."** For anything you'd actually execute or trust, also check sandbox behavior, relationships, prevalence, and signer — and rescan if the report is old. Targeted malware and new phishing kits routinely show 0 detections at first.
- **One or two detections is NOT automatically a false positive.** Open the per-engine results: a specific family name from a strong engine is a real lead; a lone generic/ML hit on a widely-distributed signed file is more likely noise. Decide by *evidence*, not by the count.
- **Escalate, don't auto-block, in production.** For an internal audit, "any malicious > 0 on a third-party URL/domain" is a reasonable *flag-and-investigate* trigger — but confirm with the per-engine detail, categories, and `last_final_url` (redirect target) before declaring it malicious or breaking a build.

## Batch scanning with rate-limit backoff

Look up many hashes/URLs from a file. Prefer **hash lookups** (no upload) for batch work:

```bash
# Hash list -> JSONL report, respecting ~4 req/min on the free tier:
while IFS= read -r h; do
  [ -z "$h" ] && continue
  vt file "$h" --include=last_analysis_stats,last_analysis_date,reputation \
      --format=json >> reports.jsonl \
    || echo "{\"error\":true,\"hash\":\"$h\"}" >> reports.jsonl   # 429/timeouts
  sleep 16          # 4 req/min => one every 15s; 16s leaves headroom
done < hashes.txt

# Extract the malicious count per hash with jq:
jq -r '[.id, (.attributes.last_analysis_stats.malicious|tostring)] | @tsv' reports.jsonl
```

`--format=json` (or `-f json`) emits machine-readable output; pipe through `jq` for automation. On Premium keys, replace the loop with a single Intelligence search (below) instead of N lookups.

## Python API (`vt-py`)

`vt.Client` is a context manager — use `with` so the HTTP session is always closed. **Never** build a URL object path with a literal `{url_id}`; URL identifiers must be generated with `vt.url_id()`.

```python
import os
import vt

API_KEY = os.environ["VT_API_KEY"]

# --- Read-only lookups (no upload) -----------------------------------------
with vt.Client(API_KEY) as client:
    # File by hash (MD5/SHA-1/SHA-256 are valid ids as-is):
    f = client.get_object("/files/44d88612fea8a8f36de82e1278abb02f")
    print(f.last_analysis_stats, f.type_description)

    # URL: you MUST derive the id via vt.url_id(), then format the path with {}:
    url_id = vt.url_id("https://example.com/path")
    u = client.get_object("/urls/{}", url_id)        # positional path arg, NOT an f-string
    print(u.last_analysis_stats, getattr(u, "last_final_url", None))

    # Domain / IP:
    d = client.get_object("/domains/{}", "example.com")
    ip = client.get_object("/ip_addresses/{}", "203.0.113.10")
    print(d.last_analysis_stats, ip.as_owner)

# --- Submitting for analysis (UPLOADS — see privacy rules) -----------------
with vt.Client(API_KEY) as client:
    # scan_url returns an Analysis; wait_for_completion blocks until done:
    analysis = client.scan_url("https://suspicious.example/landing",
                               wait_for_completion=True)
    print(analysis.status, analysis.stats)           # "completed", {...}

    # File upload (only if authorized to disclose the sample):
    with open("./unknown.bin", "rb") as fh:
        analysis = client.scan_file(fh, wait_for_completion=True)
    print(analysis.status, analysis.stats)

    # After completion, fetch the persisted object for full detail
    # (URL example — re-derive the id, never hardcode {url_id}):
    url_id = vt.url_id("https://suspicious.example/landing")
    u = client.get_object("/urls/{}", url_id)
    print(u.last_analysis_results)                   # per-engine verdicts
```

Manual polling (when you don't want `wait_for_completion`, e.g. fire-and-forget then check later):

```python
import time, vt

with vt.Client(API_KEY) as client:
    analysis = client.scan_url("https://suspicious.example")  # don't block
    analysis_id = analysis.id
    while True:
        analysis = client.get_object("/analyses/{}", analysis_id)
        if analysis.status == "completed":
            break
        time.sleep(20)                               # respect rate limits
    print(analysis.stats)
```

Error handling & async:

```python
import vt
from vt.error import APIError

try:
    with vt.Client(API_KEY) as client:
        f = client.get_object("/files/<sha256>")
except APIError as e:
    if e.code == "NotFoundError":
        print("VT has never seen this hash — unknown, not 'clean'.")
    elif e.code == "QuotaExceededError":
        print("Rate/quota hit (HTTP 429) — back off and retry later.")
    else:
        raise
```

For high throughput, `vt-py` also exposes an asyncio client (`vt.Client(...).iterator(...)`, `scan_file_async`, `get_object_async`) — use it with `asyncio` to pipeline lookups instead of sleeping between synchronous calls.

## Advanced API endpoints & automation (VT Intelligence / Enterprise)

These require a Premium/Enterprise (Google Threat Intelligence) key. Reference for the endpoints worth knowing:

### Relationship traversal (pivoting)

Fetch objects related to a file/URL/domain/IP without a separate search. Use the relationship subcommands on the CLI (`vt file <relationship> <hash>`) or the `relationships/...` path in the API:

```bash
# CLI: what domains/IPs/URLs a sample contacts, and what it drops:
vt file contacted_domains <SHA256>
vt file contacted_ips <SHA256>
vt file dropped_files <SHA256>
vt url last_serving_ip_address "https://x.example"
vt domain resolutions "evil.example"           # historical A/AAAA records
vt domain communicating_files "evil.example"   # malware seen talking to it
```

```python
# Python: iterate a relationship (auto-paginates):
with vt.Client(API_KEY) as client:
    for dom in client.iterator("/files/<sha256>/contacted_domains", limit=40):
        print(dom.id, getattr(dom, "reputation", None))
```

Common file relationships: `behaviours`, `contacted_domains`, `contacted_ips`, `contacted_urls`, `dropped_files`, `bundled_files`, `embedded_urls`, `pe_resource_parents`, `execution_parents`. Domain/IP: `resolutions`, `communicating_files`, `downloaded_files`, `urls`, `siblings`, `subdomains`.

### Sandbox behavior reports

```bash
vt file behaviours <SHA256>                       # list available sandbox runs
# or fetch the merged summary via the API path:
#   GET /files/<sha256>/behaviour_summary
```

```python
with vt.Client(API_KEY) as client:
    # behaviour_summary returns a plain JSON dict (no type/id), so use
    # get_json, not get_object:
    summ = client.get_json("/files/{}/behaviour_summary", "<sha256>")["data"]
    print(summ.get("processes_tree"), summ.get("registry_keys_set"))
```

Behavior is the strongest single signal for low-detection samples: look at process injection, persistence (`registry_keys_set`, scheduled tasks), C2 (`network_communication`, DNS), and dropped/written files.

### VT Intelligence search (replace N lookups with one query)

```bash
# Search corpus with VT's query language; great for hunting & batch triage:
vt search 'type:peexe positives:5+ tag:signed fs:2026-06-01+' --limit=50 --include=sha256,last_analysis_stats
vt search 'entity:url url:"login" engines:"phishing" p:3+'
```

```python
with vt.Client(API_KEY) as client:
    it = client.iterator("/intelligence/search",
                         params={"query": "type:peexe positives:5+ p:5+"},
                         limit=100)
    for obj in it:
        print(obj.id, obj.last_analysis_stats["malicious"])
```

Useful query modifiers: `positives:N+` (min detections), `p:N+` (alias), `fs:YYYY-MM-DD+` (first-seen since), `ls:` (last-seen), `type:` (`peexe`, `pdf`, `apk`, `document`…), `tag:`, `entity:` (`file`/`url`/`domain`/`ip`), `engines:"<verdict text>"`, `metadata:`, `imphash:`, `vhash:`, `behaviour_network:`. Combine for precise hunts; quote multi-word terms.

### LiveHunt & Retrohunt (YARA at scale)

- **LiveHunt** — register a YARA ruleset; VT matches every *new* submission against it going forward and notifies you. Manage rulesets via the API:

```bash
# Create a LiveHunt ruleset from a local YARA file:
vt hunting ruleset add my_rules ./rules.yar
vt hunting ruleset list
vt hunting notification list --filter "ruleset:my_rules"   # recent matches
```

```python
with vt.Client(API_KEY) as client:
    ruleset = client.post_object("/intelligence/hunting_rulesets", obj=vt.Object(
        obj_type="hunting_ruleset",
        obj_attributes={"name": "my_rules", "enabled": True,
                        "rules": open("rules.yar").read()}))   # kwarg is obj_attributes, not attributes
    print(ruleset.id)
```

- **Retrohunt** — run a YARA ruleset *retroactively* against VT's historical corpus (typically last ~12 months) to find samples that already existed:

```python
with vt.Client(API_KEY) as client:
    job = client.post_object("/intelligence/retrohunt_jobs", obj=vt.Object(
        obj_type="retrohunt_job",
        obj_attributes={"rules": open("rules.yar").read()}))   # kwarg is obj_attributes, not attributes
    # poll job.status until "finished", then read /intelligence/retrohunt_jobs/<id>/matching_files
```

### VT Graph

Build/visualize an investigation graph linking files, URLs, domains, IPs, and actors. API root `/graphs`; create nodes/links programmatically or open the result in the web Graph UI. Use it to document an incident's infrastructure and share with responders.

### Private Scanning (no community/vendor sharing)

For confidential samples, the **Private Scanning** API analyzes files in isolation; results are visible only to you and are **not** shared with the community, partners, or AV vendors. Endpoints live under `/private/...`:

```python
with vt.Client(API_KEY) as client:                 # requires an entitled Enterprise key
    with open("./confidential.bin", "rb") as fh:
        analysis = client.scan_file_private(fh)     # uploads privately
    # poll analysis, then:  client.get_object("/private/files/{}", <sha256>)
```

Prefer Private Scanning (or local sandboxing) over public submission whenever the sample may contain proprietary or sensitive data.

## Security-audit workflow (auditing a site, app, or dependency)

1. **Inventory IOCs first** — collect domains, full URLs, IPs, and file hashes from the code/config/lockfiles you're auditing. Hash files locally (`shasum -a 256 file`); don't upload yet.
2. **Hash-first file lookups** for every artifact (no disclosure). Treat `NotFoundError` as *unknown*, not safe.
3. **Domain & IP reputation** — check `creation_date`/`registrar` (newly-registered = higher risk), `categories`, and `as_owner`. Flag days-old domains and known-bad ASNs.
4. **URL checks** — look up URL reputation/categories and inspect `last_final_url` to catch redirects to phishing/malware landing pages.
5. **Rescan stale reports** (POST `/files/<hash>/analyse` by hash, or `wait_for_completion=True` on a fresh URL scan) so verdicts reflect today's signatures.
6. **Pivot on relationships** — for any flagged item, traverse `contacted_domains/ips`, `dropped_files`, and sandbox `behaviour_summary` to map the blast radius.
7. **Triage with the rubric** above (engine quality, family label, behavior, prevalence) — never on raw counts alone.
8. **Escalate, document, don't auto-break** — record hash, `last_analysis_date`, flagging engines, family, and a VT permalink; have a human confirm before blocking a dependency or failing CI.

## Handling actual malware safely

If you must work with a real malicious sample:

- **Isolate.** Open/copy it only inside a disposable, network-restricted VM (snapshot beforehand). Never on your host or a build agent.
- **Never execute** outside an instrumented sandbox; VT's sandbox `behaviour_summary` is the safe way to observe behavior.
- **Disable auto-actions** — turn off auto-extract/preview, mail-client rendering, and indexers that might open the file.
- **Chain of custody** — record source, SHA-256, acquisition time, who handled it, and storage location; keep samples encrypted/password-protected (e.g. zip with `infected`) at rest.
- **Disclosure check** — confirm you're authorized before any public upload; otherwise hash-lookup or Private Scanning only.
- **Report format** — include SHA-256 (+ MD5/SHA-1), file type/size, `last_analysis_date`, `popular_threat_classification`, count and names of flagging engines, key sandbox behaviors, contacted infra, and a VT permalink.

# Stasho reference

Details behind the workflow in SKILL.md. Source: `docs.stasho.xyz`, alpha as of September 2026.

## Custom domains

A domain points at Aleph's IPFS gateway; an on-chain record tells the gateway which CID to serve for that host. Every deploy re-points that record, so DNS is set once.

### Records to create (host `app.example.com`)

| Type | Name | Value |
| --- | --- | --- |
| CNAME | `app.example.com` | `ipfs.public.aleph.sh.` |
| CNAME | `_dnslink.app.example.com` | `_dnslink.app.example.com.static.public.aleph.sh.` |
| TXT | `_control.app.example.com` | the project owner's wallet address (shown in the attach dialog) |

The `_control` TXT is the ownership proof: the gateway only serves a host whose `_control` value matches the wallet that wrote the on-chain record. Attach the domain in the project's Domains panel; the app does the on-chain write, the user does the DNS.

### Apex domains

DNS forbids a CNAME at the zone apex. Either an ALIAS/ANAME to `ipfs.public.aleph.sh.`, or an A record to the gateway's current IP (`dig +short ipfs.public.aleph.sh`). With Cloudflare-style CNAME flattening the record must be DNS-only (unproxied): a proxied record answers with the CDN's IPs, the check never matches, and the host stays `PENDING DNS`.

### Statuses

| Status | Meaning | Duration |
| --- | --- | --- |
| `PENDING FIRST DEPLOY` | Domain attached, no live deployment yet | Until the first deploy is live |
| `PENDING DNS` | Waiting on the three records; the panel shows a check per record and re-tests every 60s | Provider propagation, minutes to hours |
| `FINALIZING` | Records resolve, on-chain record written, waiting on Aleph's gateway to serve the new CID | Variable, 7-40+ minutes |
| `LIVE` | Gateway serving the current deployment at the host | |
| `UNREACHABLE` | Gateway still has the site, a DNS record was removed | Until the record is restored |
| `GATEWAY ERROR` | Record accepted, gateway failing to serve the CID; usually Aleph-side | Retryable, redeploy if it persists |

`FINALIZING` after a redeploy is the single most common confusion: the domain keeps serving the previous build until Aleph's gateway republishes, which is out of the app's and DNS's control. Redeploying again does not speed it up. The new build is reachable immediately at its raw `https://<cid>.ipfs.aleph.sh/` URL, which is the right thing to share while a domain catches up.

## Build settings

Project Settings tab: build command, output directory, production branch, framework (Next.js static export, Next.js, React/Vite, Vue, Astro, Nuxt, static HTML), deploy target (IPFS only for now).

- The build config lives in the deploy workflow file inside the repo, so a change to any of those fields regenerates it and opens a PR. Deploys keep the old config until that PR merges.
- Settings live in the project's encrypted record, so editing needs the encryption key unlocked (sign the unlock prompt on the Overview tab).
- Framework never auto-updates after import. After a migration, use `Re-detect from repo`, then Apply, then Save (Apply alone saves nothing).

## Environment variables

Build-time only, and public by construction: they are baked into the build and can appear in the shipped JavaScript. Suitable for `NEXT_PUBLIC_*` / `VITE_*` style values, API endpoints, feature flags, analytics IDs. There is no secret store; a build-time secret belongs in the repo's GitHub Actions secrets.

| Rule | Value |
| --- | --- |
| Name format | letter or `_` first, then letters, digits, `_` |
| Reserved | `BACKEND_URL`, `AUDIENCE`, `TOKEN`, any `GITHUB_*` or `ACTIONS_*` |
| Count | 50 per project |
| Value size | 4 KB each, 16 KB total |

Saving never touches the repo (no PR). Changes apply on the next deploy. The workflow's `Fetch build env` step pulls them at build time and fails the deploy loudly if the fetch fails, rather than shipping a half-configured build.

## Deployment failures

| Symptom | Cause | Fix |
| --- | --- | --- |
| Stuck at `pending_workflow` | The workflow PR is not merged | Merge it (`Merge & deploy`, or on GitHub) |
| Stuck at `queued` over 5 min | GitHub Actions runner queue | Check the repo's Actions tab; abandon and redeploy if nothing moves |
| Fails at `installing` | `package.json` / `package-lock.json` mismatch | The workflow uses `npm install`, not `npm ci`; align the lockfile locally and push |
| Fails at `building` | Build command errored | Read the captured stderr in the row, then the linked Actions log |
| Fails at `uploading` | 50 MB per-artifact or 1 GB per-day cap | Shrink the artifact or wait for UTC midnight |
| Fails at `pinning` | Aleph network issue | Retry, usually transient |

## Data ownership

Project data is encrypted client-side and written as Aleph messages under the owner's address. The backend cannot read project names or repos. Deployments are content-addressed and pinned on IPFS, so a build survives independently of the dashboard record, and project history can be reconstructed from public Aleph messages with the owner's private key alone (see the docs' recovery guide and the Aleph storage schema reference).

Alpha caveat worth passing on before someone commits to it: alpha data has been reset before (the Aleph channel was renamed twice in May 2026) and further resets are not ruled out. Deployed sites are safer than dashboard data.

## Known alpha limitations

- Static output only. Nothing that needs a server at request time (API routes, SSR, a database).
- One GitHub install per wallet; connecting a second account or org replaces the first.
- Apple sign-in is not wired up yet; use email or Google.
- Custom-domain go-live time after a redeploy is variable and Aleph-side.

## Links

- Drop page: `https://stasho.xyz/drop/`
- Drop API reference: `https://docs.stasho.xyz/reference/drop-api.html`
- Docs index: `https://docs.stasho.xyz/`
- Alpha status and limits: `https://docs.stasho.xyz/alpha.html`
- App: `https://app.stasho.xyz`
- Feedback: `hello@stasho.xyz`

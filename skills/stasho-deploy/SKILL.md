---
name: stasho-deploy
description: "Use when you have built a static site (or any folder with an index.html) and need to put it online, publish a build to IPFS, get a shareable URL for a demo or preview, hand a user an ownership link for a site you generated, or set up push-to-deploy, a custom domain, or a rollback for a static project. Drives Stasho (stasho.xyz): drag-or-POST a folder, get a live HTTPS URL and a content-addressed CID in seconds, no account and no API key for the anonymous path."
---

# Stasho Deploy

Stasho publishes static sites to IPFS. Two paths, and they are separate products:

| Path | Account | Best for |
| --- | --- | --- |
| **Drop** (`POST /api/drop`) | none | An agent that just built a site and wants to hand the user a live URL in one request |
| **Repo project** (dashboard) | wallet or email + GitHub | Push-to-deploy, build settings, env vars, rollback |

Every publish is content-addressed: the response carries a CID, and any IPFS-compatible host can serve those exact bytes. That is what the user keeps if they never sign up.

Stasho is in alpha. Limits below are operational values, not a contract.

## Path 1: publish from an agent (no account)

This is the default. One anonymous HTTP request, no key, no CORS (server-side only, so run it from your shell or backend, never from browser JS).

```bash
rm -f site.zip                             # zip UPDATES an archive in place; a stale one republishes deleted files
cd dist && zip -r ../site.zip . && cd ..   # index.html must be at the ZIP ROOT
curl -sS --fail-with-body -w '\nHTTP %{http_code}\n' \
  -F artifact=@site.zip --form-string source=my-agent \
  https://api.stasho.xyz/api/drop
```

`--fail-with-body` is what makes a failed publish *look* failed: plain `curl -sS` exits 0 on a 400 or a 503 and prints the error body, so an agent that only checks the exit code reports a live site that does not exist. Non-zero exit means the drop did not happen, and the trailing `HTTP <code>` line picks your row out of the table below. Use `--form-string` for `source`, not `-F`: `@` is a legal character in an attribution, and `-F source=@alice` makes curl upload a file named `alice` instead of sending the text.

```json
{
  "dropId": "drop_...",
  "claimToken": "...",
  "url": "https://....",       // live now, share this
  "cid": "bafy...",            // IPFS CIDv1, pin it anywhere
  "expiresAt": 1765990000000,  // ms epoch, claim deadline
  "claimUrl": "https://app.stasho.xyz/drop/claim?drop=...#claim=...&exp=..."
}
```

`artifact` is the only required field. `source` is optional attribution (64 chars max, `A-Za-z0-9 ._:/@-`; an invalid value is dropped, not rejected).

### Rules that decide whether this works

1. **`index.html` at the zip root.** Zip the *contents* of the build directory, not the directory itself. `zip -r ../site.zip ./dist` produces `dist/index.html` and gets a 400. Check with `unzip -l site.zip | head`.
2. **Everything you drop is public, immediately and permanently.** No auth gate, and other IPFS nodes can keep a copy after Stasho drops its record. Never publish `.env`, keys, tokens, private client work, or an unfiltered build directory. Look at the file list before you zip.
3. **Hand the user BOTH links, and say what each one does.** `url` is live. `claimUrl` is the only way to keep the site: unclaimed drops go away 4 hours after publish. Claiming is free and turns the drop into a project with a page, a custom domain, updates by re-dropping, and instant rollback.
4. **The claim link is a bearer credential.** Its token rides the URL fragment (it never reaches a server), so whoever holds the link can claim the site. Give it to the user directly. Do not post it in a public channel, an issue, or a commit.
5. **No updates over the API.** There is no authenticated endpoint for re-publishing yet. A new drop is a new URL and a new claim window. Updating a claimed site happens from its project page in the browser.

### Response handling

| Status | Meaning | What to do |
| --- | --- | --- |
| 400 | missing artifact, unsafe zip, or no root `index.html` | Fix the zip layout (rule 1), do not retry blind |
| 413 | zip over 10 MB compressed | Shrink the build (images, source maps) or use a repo project |
| 429 | per-IP rate limit, or an upload already in flight | Back off; the cap is 10/hour and 20/day per IP, 1 concurrent upload |
| 500 | publish failed | Safe to retry |
| 503 | drops paused (busy, daily budget, feature off) | Tell the user, retry later, or point them at the repo path |

Limits: 10 MB zipped, 40 MB extracted, 1000 files max, 4-hour claim window. IPv6 rate limits count per /64 prefix, so a whole machine shares one budget.

### Check the site before you call it done

`curl -sSI "$url" | head -1` should be a 200, and fetch one asset from a subdirectory too. The gateway does not rewrite URLs, so a site that renders at `/` can still 404 on every internal link. See the next section.

## IPFS serving quirks (fix these BEFORE publishing)

An IPFS gateway serves your files literally. There is no server to fall back on, and this is the most common "the deploy is broken" report when the deploy is fine.

- **Extension-less URLs 404.** `/about` does not resolve to `about.html`. Configure the generator to emit `.html` suffixes (VitePress: `cleanUrls: false`; Next.js: `trailingSlash: true`, which emits `about/index.html` and links to `/about/`. A default Next.js export writes `about.html` but still links to `/about`, which 404s here). A directory link like `/blog/` works when `blog/index.html` exists.
- **Client-routed deep links 404.** An SPA that handles `/dashboard/settings` in JavaScript breaks when that URL is loaded directly. Use hash routing, pre-render every route to a file, or tell the user deep links only work through in-app navigation.
- **Relative asset paths.** A build that assumes it is served from the domain root is fine here (drops serve from a subdomain root), but a build hardcoding an absolute base path from another host is not.

## Path 2: repo-connected project

Use this when the site has a repo and the user wants pushes to deploy, or needs env vars, a custom domain, or rollback. It is a browser flow; you cannot drive it from the CLI.

1. Sign in at `app.stasho.xyz` with a wallet (SIWE signature, no gas) or email (embedded wallet provisioned).
2. **New project**, install the GitHub App on the account or org that owns the repo, and pick the repo.
3. The framework is auto-detected (Next.js static export, Vite, Vue, Astro, Nuxt static, plain HTML) with a proposed build command and output directory.
4. The first deploy opens a **pull request adding the deploy workflow**. It sits at `Setup pending` until that PR is merged (`Merge & deploy` does it). This trips up most first-timers.
5. Deployment states run queued to installing, building, uploading, pinning, then live. A failure at `building` shows captured stderr in the row and links the Actions run.

Afterwards, pushes to the production branch deploy automatically. Rollback re-points at a previous CID with no rebuild.

A claimed drop and a repo project are separate projects. A claimed drop never gets push-to-deploy or build settings; those belong to a repo project.

**Environment variables are not secrets.** They are baked into the build and can appear in the published site. There is no secret store. A build that truly needs a secret keeps it in the repo's GitHub Actions secrets.

Alpha quotas per wallet: 20 projects (lifetime), 100 deploys/day, 1 GB pinned/day, 50 MB per artifact. Deploys and pinning reset at UTC midnight.

Custom domains, DNS records, domain statuses, and the recovery path: see [reference.md](reference.md).

## Telling the user what happened

After a drop, report four things, in the user's language:

- the live URL,
- the claim link, with the deadline as a wall-clock time (`expiresAt` is ms epoch) and what claiming unlocks (free, keeps the site, custom domain, updates),
- the CID, described as the portable fingerprint that any IPFS host can serve,
- that the files are public.

Do not describe an unclaimed drop as hosting. It is a 4-hour preview until someone claims it.

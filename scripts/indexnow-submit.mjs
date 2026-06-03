#!/usr/bin/env node
/**
 * IndexNow submission for skills.ws
 * ---------------------------------
 * Notifies IndexNow-participating search engines (Bing, Yandex, Seznam, Naver,
 * Yep, …) the moment our content changes, instead of waiting for them to
 * re-crawl. https://www.indexnow.org/documentation
 *
 * The shared endpoint (api.indexnow.org) fans a single submission out to every
 * participating engine, so we only POST once.
 *
 * Canonical host: skills.ws currently 307-redirects apex → www, so the host that
 * actually returns 200 is www.skills.ws. IndexNow requires the host, keyLocation
 * and every submitted URL to share one host and return 200, so we resolve the
 * live canonical host by following the redirect at runtime (override with
 * INDEXNOW_HOST). This keeps the submission valid even if the redirect direction
 * is later flipped to make the apex canonical.
 *
 * URL list is built from skills.json so it stays in lockstep with app/sitemap.ts
 * — same static pages, same category pages, same per-skill pages. If the sitemap
 * shape changes, mirror it here (and vice-versa).
 *
 * Usage:
 *   node scripts/indexnow-submit.mjs                 # submit the whole sitemap
 *   node scripts/indexnow-submit.mjs /skills/seo     # submit specific path(s)
 *   node scripts/indexnow-submit.mjs https://www.skills.ws/faq
 *   node scripts/indexnow-submit.mjs --dry-run       # print payload, don't POST
 *   node scripts/indexnow-submit.mjs --no-verify     # skip key-file liveness check
 *
 * Env overrides (handy in CI / for testing):
 *   INDEXNOW_KEY, INDEXNOW_HOST, INDEXNOW_ENDPOINT,
 *   INDEXNOW_VERIFY_ATTEMPTS, INDEXNOW_VERIFY_DELAY_MS
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Registrable domain we probe to discover the canonical (200-serving) host.
const SITE_DOMAIN = "skills.ws";
const KEY = process.env.INDEXNOW_KEY || "81658695aad54ee3a7ce2951b5cb4a4e";
const ENDPOINT = process.env.INDEXNOW_ENDPOINT || "https://api.indexnow.org/indexnow";

// IndexNow caps a single submission at 10,000 URLs.
const MAX_BATCH = 10000;

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const positional = args.filter((a) => !a.startsWith("--"));
const dryRun = flags.has("--dry-run");
const skipVerify = flags.has("--no-verify");

/**
 * Determine which host actually serves 200. INDEXNOW_HOST wins; otherwise follow
 * redirects from the apex and take the final host. Falls back to the apex if the
 * probe fails (e.g. offline dry-run).
 */
async function resolveHost() {
  if (process.env.INDEXNOW_HOST) return process.env.INDEXNOW_HOST;
  try {
    const res = await fetch(`https://${SITE_DOMAIN}/`, {
      redirect: "follow",
      headers: { Accept: "text/html" },
    });
    return new URL(res.url).host;
  } catch {
    return SITE_DOMAIN;
  }
}

/** Build the same URL set that app/sitemap.ts emits, rooted at `base`. */
function buildSitemapUrls(base) {
  const data = JSON.parse(readFileSync(join(ROOT, "skills.json"), "utf8"));
  const skills = Array.isArray(data) ? data : data.skills || [];
  const categories = [...new Set(skills.map((s) => s.category))];

  return [
    base,
    `${base}/docs`,
    `${base}/cli`,
    `${base}/faq`,
    ...categories.map((c) => `${base}/skills/category/${c}`),
    ...skills.map((s) => `${base}/skills/${s.name}`),
  ];
}

/** Turn a CLI argument (full URL or site-relative path) into an absolute URL. */
function normalizeUrl(base, arg) {
  if (/^https?:\/\//i.test(arg)) return arg;
  return `${base}/${arg.replace(/^\/+/, "")}`;
}

/**
 * Confirm the key file is publicly readable and returns the exact key before we
 * submit. This both follows IndexNow's verification model and acts as a poll for
 * "is the latest deploy live yet?" in CI, where we may run moments after a push.
 * A cold Vercel build can take minutes, hence the generous default window.
 */
async function verifyKeyLive(
  keyLocation,
  {
    attempts = Number(process.env.INDEXNOW_VERIFY_ATTEMPTS) || 30,
    delayMs = Number(process.env.INDEXNOW_VERIFY_DELAY_MS) || 20000,
  } = {}
) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(keyLocation, { headers: { Accept: "text/plain" } });
      if (res.ok) {
        const body = (await res.text()).trim();
        if (body === KEY) return true;
        console.warn(`  key file content mismatch (got "${body.slice(0, 40)}…")`);
      } else {
        console.warn(`  key file HTTP ${res.status} (attempt ${i}/${attempts})`);
      }
    } catch (err) {
      console.warn(`  key file fetch failed: ${err.message} (attempt ${i}/${attempts})`);
    }
    if (i < attempts) await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}

async function submitBatch(host, keyLocation, urlList) {
  const payload = { host, key: KEY, keyLocation, urlList };

  if (dryRun) {
    console.log(`[dry-run] POST ${ENDPOINT}`);
    console.log(JSON.stringify(payload, null, 2));
    return { ok: true, status: 0 };
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Host: "api.indexnow.org",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text().catch(() => "");
  return { ok: res.ok, status: res.status, text };
}

function explain(status) {
  switch (status) {
    case 0:
      return "dry run — nothing sent.";
    case 200:
    case 202:
      return "OK — URLs accepted (engines will crawl on their schedule).";
    case 400:
      return "Bad request — malformed URL list or payload.";
    case 403:
      return "Forbidden — key not found/valid at keyLocation. Is the .txt file deployed?";
    case 422:
      return "Unprocessable — URLs don't match the host, or key mismatch.";
    case 429:
      return "Too many requests — rate limited. Back off and retry later.";
    default:
      return `Unexpected status ${status}.`;
  }
}

async function main() {
  const host = await resolveHost();
  const base = `https://${host}`;
  const keyLocation = `${base}/${KEY}.txt`;

  const urls = positional.length
    ? positional.map((a) => normalizeUrl(base, a))
    : buildSitemapUrls(base);

  console.log(`IndexNow → ${ENDPOINT}`);
  console.log(`Host: ${host}  |  Key file: ${keyLocation}`);
  console.log(`Submitting ${urls.length} URL(s)${dryRun ? " (dry run)" : ""}.`);

  if (!dryRun && !skipVerify) {
    process.stdout.write("Verifying key file is live… ");
    const live = await verifyKeyLive(keyLocation);
    if (!live) {
      console.error(
        `\nKey file not reachable at ${keyLocation}.\n` +
          `Deploy public/${KEY}.txt first, or pass --no-verify to submit anyway.`
      );
      process.exit(1);
    }
    console.log("OK.");
  }

  let allOk = true;
  for (let i = 0; i < urls.length; i += MAX_BATCH) {
    const batch = urls.slice(i, i + MAX_BATCH);
    const { ok, status, text } = await submitBatch(host, keyLocation, batch);
    const tag = `batch ${i / MAX_BATCH + 1} (${batch.length} URLs)`;
    if (ok) {
      console.log(`✓ ${tag}: HTTP ${status} — ${explain(status)}`);
    } else {
      allOk = false;
      console.error(`✗ ${tag}: HTTP ${status} — ${explain(status)}`);
      if (text) console.error(`  body: ${text.slice(0, 300)}`);
    }
  }

  if (!allOk) process.exit(1);
  console.log("Done.");
}

main().catch((err) => {
  console.error("IndexNow submission failed:", err);
  process.exit(1);
});

#!/usr/bin/env node
// Regenerate skills.json + public/skills.json from skills/<name>/SKILL.md.
// Preserves category, features, useCases, version, color, platforms, installs.
// Updates description (from frontmatter) and content (from body).
// Bumps top-level version from package.json.

import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SKILLS_DIR = join(ROOT, "skills");
// skills.json is what lib/skills.ts imports, so it is the copy the site renders
// and the one that wins when the two catalogs disagree.
const CANONICAL = "skills.json";
const COPIES = [CANONICAL, "public/skills.json"];
const TODAY = new Date().toISOString().slice(0, 10);

/** Everything the skill page renders, fingerprinted. `rev` and `revised` are
 *  bookkeeping, excluded so the stamp cannot chase its own output. Hashing the
 *  whole object rather than a field list means a metadata-only edit -- features,
 *  useCases, category, version -- moves the date too, not just a SKILL.md edit. */
function fingerprint(skill) {
  const { rev: _rev, revised: _revised, ...rendered } = skill;
  const stable = Object.keys(rendered).sort().map((k) => [k, rendered[k]]);
  return createHash("sha256").update(JSON.stringify(stable)).digest("hex").slice(0, 12);
}

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 128 * 1024 * 1024 });
}

/** Last commit date touching a skill's SKILL.md. Fallback seed only, for a
 *  checkout with no catalog history to read. */
function skillFileDate(name) {
  try {
    return git(["log", "-1", "--format=%cs", "--", `skills/${name}/SKILL.md`]).trim() || TODAY;
  } catch {
    return TODAY;
  }
}

/** When each skill's rendered object last changed, read from the canonical
 *  catalog's own history.
 *
 *  Seeding from SKILL.md alone under-reported every change that landed in the
 *  catalog rather than the Markdown: `version`, `features`, `category` and the
 *  rest are rendered on the page but live only here. ab-testing is the worked
 *  example -- its SKILL.md last moved 2026-07-10, but 3653e2d normalised its
 *  displayed version on 2026-08-07, and a SKILL.md-only seed would have frozen
 *  the wrong date permanently, since the fingerprint then matches and never
 *  restamps.
 *
 *  For each skill, walk the catalog's commits newest-first while the
 *  fingerprint still equals the current one; the oldest commit that still
 *  matches is when the object reached its present value. */
function seedFromCatalogHistory(current) {
  let log;
  try {
    log = git(["log", "--format=%H %cs", "--", CANONICAL]).trim();
  } catch {
    return new Map();
  }
  if (!log) return new Map();

  const commits = log.split("\n").map((line) => {
    const [sha, date] = line.split(" ");
    return { sha, date };
  });

  // fingerprints[i] = Map(name -> fingerprint) as of commits[i]
  const fingerprints = commits.map(({ sha }) => {
    const m = new Map();
    try {
      const past = JSON.parse(git(["show", `${sha}:${CANONICAL}`]));
      for (const s of past.skills || []) m.set(s.name, fingerprint(s));
    } catch {
      // A commit where the catalog was absent or unparseable reads as "differs
      // from today", which ends the walk at the commit after it. That is the
      // right answer: the object cannot be shown to have existed before it.
    }
    return m;
  });

  const seeds = new Map();
  for (const [name, fp] of current) {
    let last = null;
    for (let i = 0; i < commits.length; i++) {
      if (fingerprints[i].get(name) !== fp) break;
      last = commits[i];
    }
    // last === null means HEAD's catalog already differs from the working copy,
    // i.e. this run is the change.
    seeds.set(name, last ? last.date : TODAY);
  }
  return seeds;
}

/** Skill names in the canonical catalog at HEAD, for spotting additions and
 *  removals. A removal changes both published catalogs and every generated
 *  skill list, but leaves each surviving skill's own date untouched. */
function committedNames() {
  try {
    return new Set((JSON.parse(git(["show", `HEAD:${CANONICAL}`])).skills || []).map((s) => s.name));
  } catch {
    return null;
  }
}

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error("no frontmatter");
  const body = m[2].replace(/^\n+/, "");
  const fm = {};
  for (const line of m[1].split("\n")) {
    const lm = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!lm) continue;
    let v = lm[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    fm[lm[1]] = v;
  }
  return { fm, body };
}

async function main() {
  const pkg = JSON.parse(await readFile(join(ROOT, "package.json"), "utf8"));
  const version = pkg.version;

  const dirs = (await readdir(SKILLS_DIR, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  // Read all SKILL.md content + frontmatter.
  const skillMap = new Map();
  for (const name of dirs) {
    const raw = await readFile(join(SKILLS_DIR, name, "SKILL.md"), "utf8");
    const { fm, body } = parseFrontmatter(raw);
    if (fm.name !== name) {
      throw new Error(`name/dir mismatch: dir=${name} name=${fm.name}`);
    }
    if (!fm.description) {
      throw new Error(`${name}: missing description`);
    }
    skillMap.set(name, { description: fm.description, content: body.trimEnd() });
  }

  // Build ONE merged catalog and write it to both copies. Computing them
  // independently let the two drift: three skills already disagreed on
  // features/useCases and installs, so the public API advertised different
  // metadata than the site rendered, and a revision stamp computed per copy
  // would have recorded two different dates for the same content.
  const canonical = JSON.parse(await readFile(join(ROOT, CANONICAL), "utf8"));
  let updated = 0;
  let added = 0;

  const skills = [];
  for (const s of canonical.skills) {
    const fresh = skillMap.get(s.name);
    if (!fresh) {
      console.warn(`orphan in catalog with no SKILL.md: ${s.name}`);
      skills.push(s);
      continue;
    }
    if (s.description !== fresh.description || s.content !== fresh.content) {
      s.description = fresh.description;
      s.content = fresh.content;
      updated++;
    }
    skills.push(s);
  }
  const known = new Set(canonical.skills.map((s) => s.name));
  for (const [name, fresh] of skillMap) {
    if (known.has(name)) continue;
    console.warn(`NEW skill on disk not in catalog: ${name} — appending with minimal metadata`);
    skills.push({
      name,
      description: fresh.description,
      category: "uncategorized",
      features: [],
      useCases: [],
      version: "1.0.0",
      color: "888888",
      platforms: ["openclaw", "claude-code", "cursor", "codex"],
      installs: 0,
      content: fresh.content,
    });
    added++;
  }

  // Per-skill revision dates. A single catalog-wide stamp relabelled all 87
  // pages, and published the same wrong dateModified, whenever one skill
  // changed.
  const prints = new Map(skills.map((s) => [s.name, fingerprint(s)]));
  const needSeed = skills.some((s) => !s.rev || !s.revised);
  const seeds = needSeed ? seedFromCatalogHistory(prints) : new Map();

  let restamped = 0;
  let seeded = 0;
  for (const s of skills) {
    const fp = prints.get(s.name);
    if (!s.rev || !s.revised) {
      s.revised = seeds.get(s.name) || skillFileDate(s.name);
      seeded++;
    } else if (s.rev !== fp) {
      s.revised = TODAY;
      restamped++;
    }
    s.rev = fp;
  }

  // Catalog-level revision. The max of the surviving skills cannot see a
  // removal: dropping a skill rewrites both catalogs and every generated list
  // while leaving each remaining skill's own date alone, and dropping the
  // newest one would drag this value backwards. Any change to the membership
  // is a change to the catalog, and the value never regresses.
  const before = committedNames();
  const now = new Set(skills.map((s) => s.name));
  const membershipChanged =
    before !== null && (before.size !== now.size || [...now].some((n) => !before.has(n)));
  const newest = skills.reduce((max, s) => (s.revised > max ? s.revised : max), "");
  const previous = canonical.revised || "";
  const revised = membershipChanged ? TODAY : (newest > previous ? newest : previous);

  for (const catalogPath of COPIES) {
    const out = { ...canonical, version, revised, skills };
    await writeFile(join(ROOT, catalogPath), JSON.stringify(out, null, 2) + "\n", "utf8");
    console.log(`[${catalogPath}] version=${version} revised=${revised} updated=${updated} added=${added} restamped=${restamped} seeded=${seeded} total=${skills.length}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

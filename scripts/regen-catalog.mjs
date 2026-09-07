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

/** Last commit date touching a skill's SKILL.md. Seeds `revised` on the first
 *  run so 87 skills get their real history instead of one uniform stamp. */
function gitDate(name) {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cs", "--", `skills/${name}/SKILL.md`],
      { cwd: ROOT, encoding: "utf8" }).trim();
    return out || TODAY;
  } catch {
    return TODAY;
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
  let restamped = 0;
  for (const s of skills) {
    const fp = fingerprint(s);
    if (!s.rev) {
      s.revised = s.revised || gitDate(s.name);
    } else if (s.rev !== fp) {
      s.revised = TODAY;
      restamped++;
    }
    s.rev = fp;
  }

  const revised = skills.reduce((max, s) => (s.revised > max ? s.revised : max), "");

  for (const catalogPath of COPIES) {
    const out = { ...canonical, version, revised, skills };
    await writeFile(join(ROOT, catalogPath), JSON.stringify(out, null, 2) + "\n", "utf8");
    console.log(`[${catalogPath}] version=${version} revised=${revised} updated=${updated} added=${added} restamped=${restamped} total=${skills.length}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

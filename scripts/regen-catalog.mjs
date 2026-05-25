#!/usr/bin/env node
// Regenerate skills.json + public/skills.json from skills/<name>/SKILL.md.
// Preserves category, features, useCases, version, color, platforms, installs.
// Updates description (from frontmatter) and content (from body).
// Bumps top-level version from package.json.

import { readFile, writeFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SKILLS_DIR = join(ROOT, "skills");

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

  // Update both catalogs.
  for (const catalogPath of ["skills.json", "public/skills.json"]) {
    const full = join(ROOT, catalogPath);
    const cat = JSON.parse(await readFile(full, "utf8"));
    cat.version = version;
    let updated = 0;
    let added = 0;
    const known = new Set(cat.skills.map((s) => s.name));
    for (const s of cat.skills) {
      const fresh = skillMap.get(s.name);
      if (!fresh) {
        console.warn(`[${catalogPath}] orphan in catalog with no SKILL.md: ${s.name}`);
        continue;
      }
      if (s.description !== fresh.description || s.content !== fresh.content) {
        s.description = fresh.description;
        s.content = fresh.content;
        updated++;
      }
    }
    // Append any new skills present on disk but absent from catalog.
    for (const [name, fresh] of skillMap) {
      if (!known.has(name)) {
        console.warn(`[${catalogPath}] NEW skill on disk not in catalog: ${name} — appending with minimal metadata`);
        cat.skills.push({
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
    }
    await writeFile(full, JSON.stringify(cat, null, 2) + "\n", "utf8");
    console.log(`[${catalogPath}] version=${version} updated=${updated} added=${added} total=${cat.skills.length}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

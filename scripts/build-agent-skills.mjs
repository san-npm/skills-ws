#!/usr/bin/env node
// Generate the /.well-known/agent-skills/ tree from skills/<name>/SKILL.md:
//   - index.json  (agentskills.io discovery schema 0.2.0)
//   - <name>/SKILL.md  (copy of the canonical skill file)
// Runs before `next build`. The output lands under public/ so Next.js copies
// it verbatim into the static-export `out/` directory.

import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SKILLS_DIR = path.join(ROOT, 'skills');
const SKILLS_JSON = path.join(ROOT, 'public', 'skills.json');
const OUT_DIR = path.join(ROOT, 'public', '.well-known', 'agent-skills');

async function main() {
  const raw = await fs.readFile(SKILLS_JSON, 'utf-8');
  const registry = JSON.parse(raw);
  const byName = new Map(registry.skills.map((s) => [s.name, s]));

  const names = (await fs.readdir(SKILLS_DIR, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  await fs.rm(OUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUT_DIR, { recursive: true });

  const indexSkills = [];

  for (const name of names) {
    const src = path.join(SKILLS_DIR, name, 'SKILL.md');
    let md;
    try {
      md = await fs.readFile(src, 'utf-8');
    } catch {
      continue;
    }

    const destDir = path.join(OUT_DIR, name);
    await fs.mkdir(destDir, { recursive: true });
    await fs.writeFile(path.join(destDir, 'SKILL.md'), md);

    const digest = 'sha256:' + createHash('sha256').update(md).digest('hex');
    const meta = byName.get(name) || {};

    indexSkills.push({
      name,
      type: 'skill-md',
      description: meta.description || `Agent skill: ${name}`,
      url: `/.well-known/agent-skills/${name}/SKILL.md`,
      digest,
      ...(meta.category ? { category: meta.category } : {}),
      ...(meta.version ? { version: meta.version } : {}),
    });
  }

  const index = {
    $schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
    name: 'skills.ws',
    description: `${indexSkills.length} agent skills for AI coding assistants. Marketing, growth, web3, dev, design & operations.`,
    skills: indexSkills,
  };

  await fs.writeFile(
    path.join(OUT_DIR, 'index.json'),
    JSON.stringify(index, null, 2) + '\n',
  );

  console.log(`[agent-skills] wrote index with ${indexSkills.length} skills`);
}

main().catch((err) => {
  console.error('[agent-skills] failed:', err);
  process.exit(1);
});

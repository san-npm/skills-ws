#!/usr/bin/env node
// Generate public/llms.txt and public/llms-full.txt from skills.json so the
// LLM-facing indexes can never drift from the real catalog again.
// Runs as part of prebuild (see package.json).

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SITE = 'https://www.skills.ws';

const { skills } = JSON.parse(await fs.readFile(path.join(ROOT, 'skills.json'), 'utf-8'));
const sorted = [...skills].sort((a, b) => a.name.localeCompare(b.name));
const today = new Date().toISOString().slice(0, 10);

// ── llms.txt ─────────────────────────────────────────────────
const short = [];
short.push('# skills.ws', '');
short.push(`> ${sorted.length} agent skills for AI coding assistants. Marketing, growth, web3, dev, design, security, ops, and EU compliance.`, '');
short.push('Skills work with OpenClaw, Claude Code, Cursor, Codex, GitHub Copilot, and any agent that supports the SKILL.md standard. Install with: `npx skills-ws install all` (or `npx skills-ws install <name>` for one skill).', '');
short.push(`Last updated: ${today}`, '');
short.push('## Skills', '');
for (const s of sorted) {
  short.push(`- [${s.name}](${SITE}/skills/${s.name}): ${s.description}`);
}
short.push('', '## Optional', '');
short.push(`- [llms-full.txt](${SITE}/llms-full.txt): Full content of every skill.`);
short.push(`- [skills.json](${SITE}/skills.json): Machine-readable catalog.`);
short.push(`- [sitemap.xml](${SITE}/sitemap.xml): All indexable URLs.`);
short.push('');
await fs.writeFile(path.join(ROOT, 'public', 'llms.txt'), short.join('\n'));

// ── llms-full.txt ────────────────────────────────────────────
const full = [];
full.push('# skills.ws — Full Skill Index', '');
full.push(`> ${sorted.length} agent skills for AI coding assistants.`, '');
for (const s of sorted) {
  full.push(`## ${s.name}`);
  full.push(`Category: ${s.category}`);
  full.push(`Description: ${s.description}`);
  if (s.features?.length) {
    full.push('Features:');
    for (const f of s.features) full.push(`  - ${f}`);
  }
  if (s.useCases?.length) {
    full.push('Use Cases:');
    for (const u of s.useCases) full.push(`  - ${u}`);
  }
  full.push('');
  if (s.content) full.push(s.content.trim(), '');
  full.push('---', '');
}
await fs.writeFile(path.join(ROOT, 'public', 'llms-full.txt'), full.join('\n'));

console.log(`llms.txt + llms-full.txt regenerated for ${sorted.length} skills`);

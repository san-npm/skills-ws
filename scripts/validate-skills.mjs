#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const skillsDir = path.join(root, "skills");
const errors = [];
const warnings = [];
const now = new Date();

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const skillDir = path.join(skillsDir, entry.name);
  const skillPath = path.join(skillDir, "SKILL.md");
  if (!fs.existsSync(skillPath)) {
    errors.push(`${entry.name}: missing SKILL.md`);
    continue;
  }
  const source = fs.readFileSync(skillPath, "utf8");
  const match = source.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    errors.push(`${entry.name}: malformed frontmatter`);
    continue;
  }
  const fields = [...match[1].matchAll(/^([a-zA-Z0-9_-]+):/gm)].map((item) => item[1]);
  if (fields.join(",") !== "name,description") errors.push(`${entry.name}: frontmatter must contain only name and description`);
  const name = match[1].match(/^name:\s*(.+)$/m)?.[1]?.replace(/^['"]|['"]$/g, "");
  const description = match[1].match(/^description:\s*(.+)$/m)?.[1];
  if (name !== entry.name) errors.push(`${entry.name}: frontmatter name mismatch`);
  if (!description || !/Use when|Use for|Use to|Trigger/i.test(description)) warnings.push(`${entry.name}: description may not define triggers`);
  if (source.split("\n").length > 500) errors.push(`${entry.name}: SKILL.md exceeds 500 lines`);
  if ((source.match(/^```/gm) ?? []).length % 2) errors.push(`${entry.name}: unbalanced code fences`);
  if (!fs.existsSync(path.join(skillDir, "agents", "openai.yaml"))) errors.push(`${entry.name}: missing agents/openai.yaml`);

  for (const link of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = link[1].split("#")[0];
    if (!target || /^(https?:|mailto:)/.test(target) || target.includes("${")) continue;
    if (!fs.existsSync(path.resolve(skillDir, decodeURIComponent(target)))) errors.push(`${entry.name}: missing linked resource ${target}`);
  }
  if (/NEXT_PUBLIC_[A-Z0-9_]*BOT_TOKEN/.test(source)) errors.push(`${entry.name}: client-exposed bot-token pattern`);

  for (const dateMatch of source.matchAll(/(?:as of|verified (?:on|in))\s+(?:(\d{1,2})\s+)?(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(20\d{2})/gi)) {
    const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    const checked = new Date(Number(dateMatch[3]), months[dateMatch[2].slice(0, 3).toLowerCase()], Number(dateMatch[1] || 1));
    if ((now - checked) / 86_400_000 > 180) warnings.push(`${entry.name}: refresh dated guidance '${dateMatch[0]}'`);
  }
}

for (const file of walk(skillsDir).filter((candidate) => /\.(md|mjs|js|ts|tsx|sh)$/.test(candidate))) {
  const source = fs.readFileSync(file, "utf8");
  if (/(?:curl|wget)[^\n]*\|\s*(?:sudo\s+)?(?:bash|sh)\b/.test(source)) {
    errors.push(`${path.relative(root, file)}: pipes a remote download into a shell`);
  }
  if (/NEXT_PUBLIC_[A-Z0-9_]*BOT_TOKEN/.test(source)) {
    errors.push(`${path.relative(root, file)}: client-exposed bot-token pattern`);
  }
}

for (const message of warnings) console.warn(`warning: ${message}`);
if (errors.length) {
  for (const message of errors) console.error(`error: ${message}`);
  process.exit(1);
}
console.log(`Validated ${fs.readdirSync(skillsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).length} skills.`);

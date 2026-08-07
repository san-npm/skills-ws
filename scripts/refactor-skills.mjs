#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const skillsDir = path.join(root, "skills");

function yamlString(value) {
  return JSON.stringify(value.replace(/\s+/g, " ").trim());
}

function slug(value, fallback) {
  const result = value
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/`/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
  return result || fallback;
}

function addToc(markdown) {
  const headings = [...markdown.matchAll(/^#{2,4}\s+(.+?)(?:\s+<a\b[^>]*>)?\s*$/gm)]
    .map((match) => match[1].replace(/[`*_]/g, "").trim());
  if (headings.length < 2) return markdown;
  return `## Contents\n\n${headings.map((heading) => `- ${heading}`).join("\n")}\n\n${markdown}`;
}

function splitSkill(name, source) {
  const frontmatter = source.match(/^---\n([\s\S]*?)\n---\n/);
  if (!frontmatter) throw new Error(`${name}: invalid frontmatter`);
  const body = source.slice(frontmatter[0].length);
  const firstH2 = body.search(/^##\s+/m);
  if (firstH2 < 0) return;

  const intro = body.slice(0, firstH2).trim();
  const sectionsText = body.slice(firstH2);
  const starts = [...sectionsText.matchAll(/^##\s+(.+)$/gm)];
  if (starts.length < 2) return;

  const referencesDir = path.join(skillsDir, name, "references");
  fs.mkdirSync(referencesDir, { recursive: true });
  const used = new Set();
  const entries = [];

  for (let index = 0; index < starts.length; index++) {
    const start = starts[index].index;
    const end = index + 1 < starts.length ? starts[index + 1].index : sectionsText.length;
    const section = sectionsText.slice(start, end).trim() + "\n";
    const title = starts[index][1].replace(/\s+<a\b[^>]*>.*$/, "").trim();
    let fileSlug = slug(title, `section-${index + 1}`);
    let suffix = 2;
    while (used.has(fileSlug)) fileSlug = `${slug(title, `section-${index + 1}`)}-${suffix++}`;
    used.add(fileSlug);
    const filename = `${fileSlug}.md`;
    fs.writeFileSync(path.join(referencesDir, filename), addToc(section));
    entries.push({ title, filename });
  }

  const safety = /security|auth|deploy|billing|contract|wallet|legal|tax|pentest|cloud|cicd|ci-cd/.test(name)
    ? "\n## Safety gate\n\nBefore executing commands or changing external systems, confirm scope, credentials, target environment, rollback, and required approval. Pin and verify third-party artifacts; never expose secrets to client code or logs.\n"
    : "";
  const router = `${frontmatter[0]}${intro}\n${safety}\n## Reference guide\n\nRead only the references needed for the current request:\n\n${entries
    .map(({ title, filename }) => `- **${title}**: [references/${filename}](references/${filename})`)
    .join("\n")}\n`;
  fs.writeFileSync(path.join(skillsDir, name, "SKILL.md"), router);
}

for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const skillPath = path.join(skillsDir, entry.name, "SKILL.md");
  if (!fs.existsSync(skillPath)) continue;
  const source = fs.readFileSync(skillPath, "utf8");
  if (source.split("\n").length > 500 && !source.includes("## Reference guide")) {
    splitSkill(entry.name, source);
  }

  const updated = fs.readFileSync(skillPath, "utf8");
  const description = updated.match(/^description:\s*["']?(.+?)["']?\s*$/m)?.[1] ?? entry.name;
  const displayName = entry.name.split("-").map((word) => word === "ai" || word === "api" || word === "aws" || word === "crm" || word === "seo" || word === "mcp" || word === "ui" || word === "ux" ? word.toUpperCase() : word[0].toUpperCase() + word.slice(1)).join(" ");
  const shortDescription = description.replace(/^"|"$/g, "").split(/[.—]/)[0].trim().slice(0, 64).replace(/[,:;\s]+$/, "");
  const agentsDir = path.join(skillsDir, entry.name, "agents");
  fs.mkdirSync(agentsDir, { recursive: true });
  fs.writeFileSync(path.join(agentsDir, "openai.yaml"), `interface:\n  display_name: ${yamlString(displayName)}\n  short_description: ${yamlString(shortDescription.length >= 25 ? shortDescription : `${shortDescription} workflows and guidance`)}\n  default_prompt: ${yamlString(`Use $${entry.name} to help with this request.`)}\n`);
}

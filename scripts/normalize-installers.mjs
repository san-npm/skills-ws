#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const skillsDir = path.join(root, "skills");

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

for (const file of walk(skillsDir).filter((candidate) => candidate.endsWith(".md"))) {
  const source = fs.readFileSync(file, "utf8");
  let index = 0;
  const updated = source.replace(
    /^(\s*)curl\s+([^\n|]+?)\s*\|\s*(bash|sh)(\s+-)?(\s*&&[^\n]*)?(\s+#.*)?$/gm,
    (_, indent, curlArgs, shell, dash = "", remainder = "", comment = "") => {
      index += 1;
      const variable = `installer_${index}`;
      return [
        `${indent}${variable}="$(mktemp)"`,
        `${indent}curl ${curlArgs.trim()} -o "$${variable}"`,
        `${indent}less "$${variable}"  # Review before execution; verify the release checksum/signature when published.`,
        `${indent}${shell} "$${variable}"${dash}${remainder}${comment}`,
        `${indent}rm -f "$${variable}"`,
      ].join("\n");
    },
  );
  if (updated !== source) fs.writeFileSync(file, updated);
}

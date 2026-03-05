#!/usr/bin/env node

/**
 * Smoke tests for skills-ws CLI
 * Run: node test/cli.test.mjs
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CLI = join(ROOT, "bin", "cli.mjs");
const SKILLS_DIR = join(ROOT, "skills");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${message}`);
  } else {
    failed++;
    console.log(`  \x1b[31m✗\x1b[0m ${message}`);
  }
}

console.log("\nskills-ws CLI tests\n");

// ── Test 1: Skills directory exists and has skills ─────────
console.log("Skills directory:");
try {
  const entries = await readdir(SKILLS_DIR, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory());
  assert(dirs.length > 0, `skills/ contains ${dirs.length} skill directories`);
  assert(dirs.length >= 80, `at least 80 skills present (found ${dirs.length})`);
} catch (err) {
  assert(false, `skills/ directory readable: ${err.message}`);
}

// ── Test 2: Every skill has a SKILL.md ─────────────────────
console.log("\nSkill integrity:");
const entries = await readdir(SKILLS_DIR, { withFileTypes: true });
const skillDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
let allHaveSkillMd = true;
let allHaveFrontmatter = true;

for (const name of skillDirs) {
  const mdPath = join(SKILLS_DIR, name, "SKILL.md");
  try {
    const content = await readFile(mdPath, "utf8");
    if (!content.startsWith("---")) allHaveFrontmatter = false;
  } catch {
    allHaveSkillMd = false;
  }
}
assert(allHaveSkillMd, "every skill directory has a SKILL.md");
assert(allHaveFrontmatter, "every SKILL.md has YAML frontmatter");

// ── Test 3: CLI bin exists and is valid JS ─────────────────
console.log("\nCLI binary:");
try {
  await stat(CLI);
  assert(true, "bin/cli.mjs exists");
  const content = await readFile(CLI, "utf8");
  assert(content.startsWith("#!/usr/bin/env node"), "has node shebang");
  assert(content.includes("import"), "uses ESM imports");
  assert(!content.includes("eval("), "no eval() usage");
  assert(!content.includes("exec(") || content.includes("execFile"), "no dangerous exec patterns");
} catch (err) {
  assert(false, `CLI binary check: ${err.message}`);
}

// ── Test 4: CLI --help runs without error ──────────────────
console.log("\nCLI execution:");
try {
  const { stdout } = await exec("node", [CLI, "help"], {
    env: { ...process.env, NO_COLOR: "1" },
    timeout: 10000,
  });
  assert(stdout.includes("npx skills-ws"), "help output contains usage info");
  assert(stdout.includes("install"), "help mentions install command");
} catch (err) {
  assert(false, `CLI help: ${err.message}`);
}

// ── Test 5: CLI list runs without error ────────────────────
try {
  const { stdout } = await exec("node", [CLI, "list"], {
    env: { ...process.env, NO_COLOR: "1" },
    timeout: 10000,
  });
  assert(stdout.includes("skills"), "list output mentions skills");
  assert(stdout.split("\n").length > 10, "list output has multiple lines");
} catch (err) {
  assert(false, `CLI list: ${err.message}`);
}

// ── Test 6: --dir rejects path traversal ───────────────────
console.log("\nSecurity:");
try {
  await exec("node", [CLI, "install", "seo-geo", "--dir", "../../etc"], {
    env: { ...process.env, NO_COLOR: "1" },
    timeout: 10000,
  });
  assert(false, "--dir with '..' should fail");
} catch (err) {
  assert(
    err.stderr?.includes("relative path") || err.code === 1,
    "--dir rejects path traversal (..)"
  );
}

try {
  await exec("node", [CLI, "install", "seo-geo", "--dir", "/tmp/evil"], {
    env: { ...process.env, NO_COLOR: "1" },
    timeout: 10000,
  });
  assert(false, "--dir with absolute path should fail");
} catch (err) {
  assert(
    err.stderr?.includes("relative path") || err.code === 1,
    "--dir rejects absolute paths"
  );
}

// ── Test 7: No self-replication language in metadata ───────
console.log("\nContent safety:");
const skillMd = await readFile(
  join(SKILLS_DIR, "aleph-cloud-self-deployment", "SKILL.md"),
  "utf8"
);
const frontmatter = skillMd.split("---")[1] || "";
assert(
  !frontmatter.toLowerCase().includes("self-replic"),
  'frontmatter does not contain "self-replic" language'
);

// ── Summary ────────────────────────────────────────────────
console.log(`\n${"─".repeat(40)}`);
console.log(
  `${passed} passed, ${failed} failed, ${passed + failed} total\n`
);

process.exit(failed > 0 ? 1 : 0);

#!/usr/bin/env node

import { readdir, readFile, copyFile, mkdir, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import readline from "node:readline";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, "..", "skills");

const R = "\x1b[0m";
const B = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const WHITE = "\x1b[37m";
const GRAY = "\x1b[90m";
const BG = "\x1b[48;5;233m";

// ── Banner ───────────────────────────────────────────────────

const LOGO = [
  "███████╗██╗  ██╗██╗██╗     ██╗     ███████╗ ██╗    ██╗███████╗",
  "██╔════╝██║ ██╔╝██║██║     ██║     ██╔════╝ ██║    ██║██╔════╝",
  "███████╗█████╔╝ ██║██║     ██║     ███████╗ ██║ █╗ ██║███████╗",
  "╚════██║██╔═██╗ ██║██║     ██║     ╚════██║ ██║███╗██║╚════██║",
  "███████║██║  ██╗██║███████╗███████╗███████║ ╚███╔███╔╝███████║",
  "╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚══════╝  ╚══╝╚══╝ ╚══════╝",
];

// Color roles (ANSI) — semantic, not literal
const C_BLOCK = "\x1b[36m";      // cyan — filled blocks ███
const C_SHADOW = "\x1b[90m";     // gray — shadow characters ╔═╗║╚╝
const C_DOT = "\x1b[32m";        // green — the dot in .ws
const C_ACCENT = "\x1b[35m";     // magenta — highlight pulse

function isShadowChar(ch) {
  return "╔═╗║╚╝╝╗╝".includes(ch) || ch === "╝";
}

function colorizeLine(line) {
  let out = "";
  for (const ch of line) {
    if (ch === "█") {
      out += C_BLOCK + ch;
    } else if (ch === " " || ch === "\n") {
      out += R + ch;
    } else {
      out += C_SHADOW + ch;
    }
  }
  return out + R;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function hideCursor() { process.stdout.write("\x1b[?25l"); }
function showCursor() { process.stdout.write("\x1b[?25h"); }

function moveTo(row, col) {
  process.stdout.write(`\x1b[${row};${col}H`);
}

function clearScreen() {
  process.stdout.write("\x1b[2J\x1b[H");
}

async function playBanner() {
  if (!process.stdout.isTTY || process.env.NO_COLOR) {
    const pad = "  ";
    process.stdout.write("\n");
    for (const line of LOGO) {
      process.stdout.write(pad + colorizeLine(line) + "\n");
    }
    process.stdout.write(`\n${pad}${DIM}agent skills for AI${R}\n\n`);
    return;
  }

  hideCursor();
  clearScreen();

  const cols = process.stdout.columns || 80;
  const rows = process.stdout.rows || 24;
  const logoWidth = Math.max(...LOGO.map(l => [...l].length));
  const padLeft = Math.max(2, Math.floor((cols - logoWidth) / 2));
  const padTop = Math.max(1, Math.floor((rows - LOGO.length - 4) / 2));
  const pad = " ".repeat(padLeft);

  // Phase 1: Scanline reveal — draw line by line, char by char in groups
  for (let row = 0; row < LOGO.length; row++) {
    const line = LOGO[row];
    const chars = [...line];
    moveTo(padTop + row, 1);

    // Reveal in chunks of ~8 chars for speed
    const chunkSize = 6;
    for (let i = 0; i < chars.length; i += chunkSize) {
      const chunk = chars.slice(i, i + chunkSize).join("");
      process.stdout.write(i === 0 ? pad : "");

      // First pass: bright white flash
      process.stdout.write(`${B}${WHITE}${chunk}${R}`);
      await sleep(8);

      // Overwrite with final color
      const colPos = padLeft + i + 1;
      moveTo(padTop + row, colPos);
      process.stdout.write(colorizeLine(chunk));
    }
    await sleep(30);
  }

  await sleep(150);

  // Phase 2: Pulse effect — flash blocks bright then back
  for (let pulse = 0; pulse < 2; pulse++) {
    // Flash bright
    for (let row = 0; row < LOGO.length; row++) {
      moveTo(padTop + row, 1);
      process.stdout.write(pad);
      for (const ch of LOGO[row]) {
        if (ch === "█") {
          process.stdout.write(`${B}${WHITE}${ch}${R}`);
        } else if (ch === " ") {
          process.stdout.write(" ");
        } else {
          process.stdout.write(`${C_SHADOW}${ch}${R}`);
        }
      }
    }
    await sleep(60);

    // Back to normal
    for (let row = 0; row < LOGO.length; row++) {
      moveTo(padTop + row, 1);
      process.stdout.write(pad + colorizeLine(LOGO[row]));
    }
    await sleep(80);
  }

  // Phase 3: Tagline fade-in
  const tagline = "agent skills for AI";
  const tagPad = " ".repeat(Math.max(2, Math.floor((cols - tagline.length) / 2)));
  const tagRow = padTop + LOGO.length + 1;

  // Char by char
  for (let i = 0; i < tagline.length; i++) {
    moveTo(tagRow, tagPad.length + i + 1);
    process.stdout.write(`${GREEN}${tagline[i]}${R}`);
    await sleep(25);
  }

  // Underline
  const underline = "─".repeat(tagline.length);
  moveTo(tagRow + 1, tagPad.length + 1);
  for (let i = 0; i < underline.length; i++) {
    process.stdout.write(`${GRAY}─${R}`);
    await sleep(10);
  }

  await sleep(400);

  // Phase 4: Settle — clear and redraw static final version
  clearScreen();
  process.stdout.write("\n");
  for (const line of LOGO) {
    process.stdout.write(pad + colorizeLine(line) + "\n");
  }
  process.stdout.write(`\n${tagPad}${DIM}${tagline}${R}\n\n`);

  showCursor();
}

// ── Install Animation ────────────────────────────────────────

const PROGRESS_CHARS = "━";
const PROGRESS_EMPTY = "╌";
const PROGRESS_WIDTH = 30;

async function playInstallProgress(skillCount) {
  if (!process.stdout.isTTY || process.env.NO_COLOR) {
    process.stdout.write(`  ${GREEN}${skillCount} skill${skillCount !== 1 ? "s" : ""} installed${R}\n`);
    return;
  }

  hideCursor();
  const labels = [
    "reading manifests",
    "resolving skills",
    "copying files",
    "writing to disk",
    "verifying",
  ];

  for (let i = 0; i <= PROGRESS_WIDTH; i++) {
    const filled = PROGRESS_CHARS.repeat(i);
    const empty = PROGRESS_EMPTY.repeat(PROGRESS_WIDTH - i);
    const pct = Math.round((i / PROGRESS_WIDTH) * 100);
    const label = labels[Math.min(Math.floor((i / PROGRESS_WIDTH) * labels.length), labels.length - 1)];

    readline.cursorTo(process.stdout, 0);
    readline.clearLine(process.stdout, 0);
    process.stdout.write(
      `  ${CYAN}${filled}${GRAY}${empty}${R} ${DIM}${String(pct).padStart(3)}%${R} ${DIM}${label}${R}`
    );
    await sleep(25);
  }

  readline.cursorTo(process.stdout, 0);
  readline.clearLine(process.stdout, 0);
  process.stdout.write(
    `  ${GREEN}${"━".repeat(PROGRESS_WIDTH)}${R} ${B}${skillCount} skill${skillCount !== 1 ? "s" : ""} installed${R}\n`
  );

  showCursor();
}

// ── Skill Operations ─────────────────────────────────────────

async function getSkills() {
  const entries = await readdir(SKILLS_DIR, { withFileTypes: true });
  const skills = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const skillDir = join(SKILLS_DIR, e.name);
    const skillMd = join(skillDir, "SKILL.md");
    try {
      await stat(skillMd);
      const content = await readFile(skillMd, "utf8");
      const descMatch = content.match(/^description:\s*["']?(.+?)["']?\s*$/m);
      const desc = descMatch ? descMatch[1] : "";
      skills.push({ name: e.name, desc, dir: skillDir });
    } catch {}
  }
  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

async function copyDir(src, dest) {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const srcPath = join(src, e.name);
    const destPath = join(dest, e.name);
    if (e.isDirectory()) await copyDir(srcPath, destPath);
    else await copyFile(srcPath, destPath);
  }
}

async function detectTarget() {
  const candidates = [
    join(process.cwd(), ".claude", "skills"),
    join(process.cwd(), "skills"),
    join(process.env.HOME || "~", "openclaw", "skills"),
    join(process.env.HOME || "~", ".claude", "skills"),
  ];
  for (const c of candidates) {
    try { await stat(c); return c; } catch {}
  }
  // Default: create ~/.claude/skills if nothing found
  const defaultTarget = join(process.env.HOME || "~", ".claude", "skills");
  await mkdir(defaultTarget, { recursive: true });
  return defaultTarget;
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const skills = await getSkills();

  await playBanner();

  if (args[0] === "list" || args[0] === "ls") {
    for (const s of skills) {
      process.stdout.write(`  ${GREEN}${s.name.padEnd(24)}${R}${DIM}${s.desc.slice(0, 55)}${R}\n`);
    }
    process.stdout.write(`\n  ${DIM}${skills.length} skills | npx skills-ws install <name>${R}\n\n`);
    return;
  }

  if (args[0] === "install" || args[0] === "add") {
    const names = args.slice(1);

    if (names.length === 0) {
      for (let i = 0; i < skills.length; i++) {
        process.stdout.write(
          `  ${GRAY}${String(i + 1).padStart(2)}${R} ${GREEN}${skills[i].name.padEnd(24)}${R}${DIM}${skills[i].desc.slice(0, 50)}${R}\n`
        );
      }
      process.stdout.write(`\n  ${YELLOW}Enter numbers or names (comma-separated), or 'all':${R}\n`);

      const rl = createInterface({ input: process.stdin, output: process.stdout });
      const answer = await new Promise((resolve) => rl.question(`  ${CYAN}> ${R}`, resolve));
      rl.close();

      if (answer.trim().toLowerCase() === "all") {
        names.push(...skills.map((s) => s.name));
      } else {
        for (const part of answer.split(",").map((s) => s.trim()).filter(Boolean)) {
          const num = parseInt(part);
          if (!isNaN(num) && num >= 1 && num <= skills.length) names.push(skills[num - 1].name);
          else names.push(part);
        }
      }
    }

    if (names.length === 0) {
      process.stdout.write(`  ${DIM}Nothing selected.${R}\n`);
      return;
    }

    const target = await detectTarget();
    process.stdout.write(`\n  ${DIM}${target}${R}\n\n`);

    let installed = 0;
    for (const name of names) {
      const skill = skills.find((s) => s.name === name);
      if (!skill) {
        process.stdout.write(`  ${YELLOW}skip${R} ${name} ${DIM}(not found)${R}\n`);
        continue;
      }
      await copyDir(skill.dir, join(target, name));
      installed++;
    }

    await playInstallProgress(installed);
    process.stdout.write("\n");

    for (const name of names) {
      if (skills.find((s) => s.name === name)) {
        process.stdout.write(`  ${GREEN}+${R} ${name}\n`);
      }
    }
    process.stdout.write(`\n  ${DIM}skills.ws${R}\n\n`);
    return;
  }

  // No args = interactive install (same as `install`)
  if (!args[0] || args[0] === "help" || args[0] === "-h" || args[0] === "--help") {
    if (args[0] === "help" || args[0] === "-h" || args[0] === "--help") {
      process.stdout.write(`  ${B}Usage:${R}\n\n`);
      process.stdout.write(`    ${CYAN}npx skills-ws${R}                    Interactive picker\n`);
      process.stdout.write(`    ${CYAN}npx skills-ws list${R}              List all skills\n`);
      process.stdout.write(`    ${CYAN}npx skills-ws install <name>${R}     Install specific skill(s)\n`);
      process.stdout.write(`    ${CYAN}npx skills-ws install all${R}        Install everything\n`);
      process.stdout.write(`\n  ${DIM}${skills.length} skills | skills.ws${R}\n\n`);
      return;
    }

    // Interactive picker
    for (let i = 0; i < skills.length; i++) {
      process.stdout.write(
        `  ${GRAY}${String(i + 1).padStart(2)}${R} ${GREEN}${skills[i].name.padEnd(24)}${R}${DIM}${skills[i].desc.slice(0, 50)}${R}\n`
      );
    }
    process.stdout.write(`\n  ${YELLOW}Enter numbers or names (comma-separated), or 'all':${R}\n`);

    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise((resolve) => rl.question(`  ${CYAN}> ${R}`, resolve));
    rl.close();

    const names = [];
    if (answer.trim().toLowerCase() === "all") {
      names.push(...skills.map((s) => s.name));
    } else {
      for (const part of answer.split(",").map((s) => s.trim()).filter(Boolean)) {
        const num = parseInt(part);
        if (!isNaN(num) && num >= 1 && num <= skills.length) names.push(skills[num - 1].name);
        else names.push(part);
      }
    }

    if (names.length === 0) {
      process.stdout.write(`  ${DIM}Nothing selected.${R}\n`);
      return;
    }

    const target = await detectTarget();
    process.stdout.write(`\n  ${DIM}${target}${R}\n\n`);

    let installed = 0;
    for (const name of names) {
      const skill = skills.find((s) => s.name === name);
      if (!skill) {
        process.stdout.write(`  ${YELLOW}skip${R} ${name} ${DIM}(not found)${R}\n`);
        continue;
      }
      await copyDir(skill.dir, join(target, name));
      installed++;
    }

    await playInstallProgress(installed);
    process.stdout.write("\n");

    for (const name of names) {
      if (skills.find((s) => s.name === name)) {
        process.stdout.write(`  ${GREEN}+${R} ${name}\n`);
      }
    }
    process.stdout.write(`\n  ${DIM}skills.ws${R}\n\n`);
    return;
  }
}

process.on("SIGINT", () => { showCursor(); process.exit(0); });
process.on("exit", () => { showCursor(); });

main().catch((err) => { showCursor(); console.error(err); process.exit(1); });

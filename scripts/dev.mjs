#!/usr/bin/env node

import { watch } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BUILD_AGENT_SKILLS = path.join(ROOT, 'scripts', 'build-agent-skills.mjs');
const NEXT_BIN = path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');
const WATCH_TARGETS = [
  path.join(ROOT, 'skills'),
  path.join(ROOT, 'public', 'skills.json'),
];

function generateAgentSkills() {
  const result = spawnSync(process.execPath, [BUILD_AGENT_SKILLS], {
    cwd: ROOT,
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Agent skill generation failed with exit code ${result.status}`);
  }
}

generateAgentSkills();

let rebuildTimer;
let rebuilding = false;
let rebuildPending = false;

function rebuild() {
  if (rebuilding) {
    rebuildPending = true;
    return;
  }

  rebuilding = true;
  rebuildPending = false;
  console.log('[agent-skills] source changed; regenerating development assets');

  const child = spawn(process.execPath, [BUILD_AGENT_SKILLS], {
    cwd: ROOT,
    stdio: 'inherit',
  });

  child.on('error', (error) => {
    console.error('[agent-skills] rebuild failed:', error);
  });
  child.on('close', () => {
    rebuilding = false;
    if (rebuildPending) rebuild();
  });
}

const watchers = WATCH_TARGETS.map((target) =>
  watch(target, { recursive: target.endsWith('skills') }, () => {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(rebuild, 100);
  }),
);

const next = spawn(process.execPath, [NEXT_BIN, 'dev', ...process.argv.slice(2)], {
  cwd: ROOT,
  stdio: 'inherit',
});

function closeWatchers() {
  clearTimeout(rebuildTimer);
  for (const watcher of watchers) watcher.close();
}

next.on('error', (error) => {
  closeWatchers();
  console.error('[dev] failed to start Next.js:', error);
  process.exitCode = 1;
});

next.on('close', (code, signal) => {
  closeWatchers();
  process.exitCode = code ?? (signal ? 1 : 0);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    closeWatchers();
    next.kill(signal);
  });
}

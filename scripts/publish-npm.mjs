#!/usr/bin/env node
// Publish the npm package from a staging directory instead of swapping
// package.json in place. The old prepublishOnly/postpublish swap left the
// repo broken (CLI manifest as package.json) whenever a publish failed;
// this approach never mutates the repo.
//
// Usage: node scripts/publish-npm.mjs [--dry-run]

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const STAGE = path.join(ROOT, 'dist-npm');
const dryRun = process.argv.includes('--dry-run');

const repoPkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
const npmPkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'npm-package.json'), 'utf-8'));
if (repoPkg.version !== npmPkg.version) {
  console.error(`Version mismatch: package.json is ${repoPkg.version} but npm-package.json is ${npmPkg.version}. Bump both.`);
  process.exit(1);
}

fs.rmSync(STAGE, { recursive: true, force: true });
fs.mkdirSync(STAGE, { recursive: true });

for (const entry of ['bin', 'skills', 'README.md', 'LICENSE', 'SECURITY.md']) {
  fs.cpSync(path.join(ROOT, entry), path.join(STAGE, entry), { recursive: true });
}
fs.cpSync(path.join(ROOT, 'test'), path.join(STAGE, 'test'), { recursive: true });
fs.writeFileSync(path.join(STAGE, 'package.json'), JSON.stringify(npmPkg, null, 2) + '\n');

const args = ['publish', '--access', 'public'];
if (dryRun) args.push('--dry-run');
console.log(`Publishing skills-ws@${npmPkg.version} from ${STAGE}${dryRun ? ' (dry run)' : ''}`);
execFileSync('npm', args, { cwd: STAGE, stdio: 'inherit' });

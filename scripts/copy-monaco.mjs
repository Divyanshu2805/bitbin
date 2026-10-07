// Copies the Monaco editor's runtime files into public/monaco so the app serves them itself.
//
// Serving the editor from our own origin, rather than a public CDN, keeps third-party script out of
// every signed-in page: the Content Security Policy can say `script-src 'self'`, and the version in
// use is the one pinned in package.json.
//
// Runs before `next dev` and `next build` (the `predev` / `prebuild` scripts). public/monaco is
// generated and git-ignored.

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'node_modules', 'monaco-editor', 'min', 'vs');
const target = join(root, 'public', 'monaco', 'vs');
const marker = join(root, 'public', 'monaco', '.version');

if (!existsSync(source)) {
  console.error('monaco-editor is not installed. Run `npm install` first.');
  process.exit(1);
}

const { version } = JSON.parse(readFileSync(join(root, 'node_modules', 'monaco-editor', 'package.json'), 'utf8'));

// Already copied for this version: nothing to do
if (existsSync(marker) && existsSync(target) && readFileSync(marker, 'utf8').trim() === version) {
  process.exit(0);
}

rmSync(join(root, 'public', 'monaco'), { recursive: true, force: true });
mkdirSync(dirname(target), { recursive: true });
cpSync(source, target, { recursive: true });
writeFileSync(marker, `${version}\n`);
console.log(`Copied monaco-editor ${version} to public/monaco`);

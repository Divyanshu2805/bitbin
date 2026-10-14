// Copies the PDF reader's runtime files into public/pdfjs so the app serves them itself.
//
// The file cards draw the first page of a PDF in the browser with pdf.js. Its worker, fonts and
// character maps are loaded at run time from this site (the Content Security Policy allows no other
// origin), and the version is the one pinned in package.json.
//
// Runs before `next dev` and `next build` (the `predev` / `prebuild` scripts). public/pdfjs is
// generated and git-ignored.

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'node_modules', 'pdfjs-dist');
const target = join(root, 'public', 'pdfjs');
const marker = join(target, '.version');

if (!existsSync(source)) {
  console.error('pdfjs-dist is not installed. Run `npm install` first.');
  process.exit(1);
}

const { version } = JSON.parse(readFileSync(join(source, 'package.json'), 'utf8'));

// Already copied for this version: nothing to do
if (existsSync(marker) && readFileSync(marker, 'utf8').trim() === version) {
  process.exit(0);
}

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(join(source, 'build', 'pdf.worker.min.mjs'), join(target, 'pdf.worker.min.mjs'));
for (const folder of ['standard_fonts', 'cmaps', 'wasm', 'iccs']) {
  if (existsSync(join(source, folder))) cpSync(join(source, folder), join(target, folder), { recursive: true });
}
writeFileSync(marker, `${version}\n`);
console.log(`Copied pdfjs-dist ${version} to public/pdfjs`);

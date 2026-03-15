import { promises as fs } from 'fs';
import path from 'path';
import { PassThrough } from 'stream';
import archiver from 'archiver';

/**
 * Packages the browser extension (`extension/`) as a ZIP for the download
 * button in Settings. Users unzip it and load it unpacked until the extension
 * is on the Chrome Web Store.
 */

export const EXTENSION_DIR = path.join(process.cwd(), 'extension');

/** Files in `extension/` that are for developers, not the packaged extension. */
const EXCLUDED_FILES = new Set(['README.md']);

const LOCALHOST_ORIGIN = 'http://localhost:3000';

/**
 * Adjust a file for the package. Production packages drop the localhost host
 * permission and the "Local development" site option.
 */
export function prepareExtensionFile(
  name: string,
  content: Buffer,
  { includeLocalhost }: { includeLocalhost: boolean }
): Buffer {
  if (includeLocalhost) return content;

  if (name === 'manifest.json') {
    const manifest = JSON.parse(content.toString('utf8'));
    manifest.host_permissions = (manifest.host_permissions ?? []).filter(
      (origin: string) => !origin.startsWith(LOCALHOST_ORIGIN)
    );
    return Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
  }

  if (name === 'lib.js') {
    const lines = content.toString('utf8').split('\n');
    return Buffer.from(lines.filter((line) => !line.includes(`'${LOCALHOST_ORIGIN}'`)).join('\n'));
  }

  return content;
}

async function listFiles(dir: string, prefix = ''): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...(await listFiles(path.join(dir, entry.name), relative)));
    } else if (!EXCLUDED_FILES.has(relative)) {
      files.push(relative);
    }
  }
  return files.sort();
}

export async function getExtensionVersion(): Promise<string> {
  const manifest = JSON.parse(await fs.readFile(path.join(EXTENSION_DIR, 'manifest.json'), 'utf8'));
  return manifest.version;
}

// The files only change on deploy, so each process builds each variant once.
const cache = new Map<boolean, Promise<Uint8Array>>();

export function buildExtensionZip(options: { includeLocalhost: boolean }): Promise<Uint8Array> {
  const cached = cache.get(options.includeLocalhost);
  if (cached) return cached;

  const promise = zipExtension(options);
  cache.set(options.includeLocalhost, promise);
  // Don't keep a failed build around
  promise.catch(() => cache.delete(options.includeLocalhost));
  return promise;
}

async function zipExtension(options: { includeLocalhost: boolean }): Promise<Uint8Array> {
  const archive = archiver('zip', { zlib: { level: 9 } });
  const chunks: Uint8Array[] = [];

  const done = new Promise<Uint8Array>((resolve, reject) => {
    const passthrough = new PassThrough();
    archive.pipe(passthrough);
    passthrough.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    passthrough.on('end', () => resolve(Buffer.concat(chunks)));
    passthrough.on('error', reject);
    archive.on('error', reject);
  });

  for (const name of await listFiles(EXTENSION_DIR)) {
    const content = await fs.readFile(path.join(EXTENSION_DIR, name));
    // Top-level folder so unzipping gives one "bitbin-extension" folder to load
    archive.append(prepareExtensionFile(name, content, options), { name: `bitbin-extension/${name}` });
  }

  await archive.finalize();
  return done;
}

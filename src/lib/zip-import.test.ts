import { describe, it, expect } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { MAX_ZIP_FILES, looksLikeZip, readImportZip } from './zip-import';

const manifest = { version: 1, items: [], collections: [] };

function zipOf(entries: Record<string, Uint8Array>) {
  return zipSync(entries);
}

describe('looksLikeZip', () => {
  it('accepts the ZIP signature and nothing else', () => {
    expect(looksLikeZip(zipOf({ 'a.txt': strToU8('hi') }))).toBe(true);
    expect(looksLikeZip(strToU8('{"version":1}'))).toBe(false);
    expect(looksLikeZip(new Uint8Array([0x50, 0x4b]))).toBe(false);
  });
});

describe('readImportZip', () => {
  it('reads the manifest and the stored files, ignoring everything else', () => {
    const result = readImportZip(
      zipOf({
        'bitbin-export.json': strToU8(JSON.stringify(manifest)),
        'files/a.txt': strToU8('hello'),
        'snippets/x.ts': strToU8('const x = 1'),
        'links.md': strToU8('# Links'),
      })
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.manifest).toEqual(manifest);
    expect([...result.files.keys()]).toEqual(['files/a.txt']);
    expect(new TextDecoder().decode(result.files.get('files/a.txt'))).toBe('hello');
  });

  it('refuses something that is not a ZIP', () => {
    const result = readImportZip(strToU8(JSON.stringify(manifest)));
    expect(result).toEqual({ ok: false, error: 'This is not a ZIP file' });
  });

  it('refuses a ZIP without the manifest', () => {
    const result = readImportZip(zipOf({ 'files/a.txt': strToU8('hello') }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('bitbin-export.json');
  });

  it('refuses a manifest that is not JSON', () => {
    const result = readImportZip(zipOf({ 'bitbin-export.json': strToU8('not json') }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('not valid JSON');
  });

  it('stops a file that inflates past the per-file cap (a ZIP bomb is tiny until it is read)', () => {
    const bomb = zipOf({
      'bitbin-export.json': strToU8(JSON.stringify(manifest)),
      'files/bomb.txt': new Uint8Array(11 * 1024 * 1024),
    });
    // Eleven megabytes of zeros compress to a few kilobytes
    expect(bomb.length).toBeLessThan(100 * 1024);

    const result = readImportZip(bomb);

    expect(result).toEqual({ ok: false, error: 'A file in this ZIP is too large' });
  });

  it('stops an oversized manifest', () => {
    const result = readImportZip(zipOf({ 'bitbin-export.json': new Uint8Array(9 * 1024 * 1024) }));
    expect(result).toEqual({ ok: false, error: 'The export manifest is too large' });
  });

  it('refuses more files than one ZIP may restore', () => {
    const entries: Record<string, Uint8Array> = { 'bitbin-export.json': strToU8(JSON.stringify(manifest)) };
    for (let i = 0; i <= MAX_ZIP_FILES; i++) entries[`files/f${i}.txt`] = strToU8('x');

    const result = readImportZip(zipOf(entries));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(`at most ${MAX_ZIP_FILES}`);
  });

  it('ignores folder entries and does not follow paths out of files/', () => {
    const result = readImportZip(
      zipOf({
        'bitbin-export.json': strToU8(JSON.stringify(manifest)),
        'files/../escape.txt': strToU8('x'),
        'files/ok.txt': strToU8('y'),
      })
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Names are only ever used as map keys, never as file system paths
    expect(result.files.get('files/ok.txt')).toBeDefined();
  });
});

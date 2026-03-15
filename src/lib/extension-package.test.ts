import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { buildExtensionZip, EXTENSION_DIR, getExtensionVersion, prepareExtensionFile } from './extension-package';

async function read(name: string) {
  return fs.readFile(path.join(EXTENSION_DIR, name));
}

describe('prepareExtensionFile', () => {
  it('leaves files untouched when localhost is kept', async () => {
    const manifest = await read('manifest.json');
    expect(prepareExtensionFile('manifest.json', manifest, { includeLocalhost: true })).toBe(manifest);
  });

  it('drops the localhost host permission from the production manifest', async () => {
    const original = JSON.parse((await read('manifest.json')).toString('utf8'));
    expect(original.host_permissions).toContain('http://localhost:3000/*');

    const prepared = JSON.parse(
      prepareExtensionFile('manifest.json', await read('manifest.json'), { includeLocalhost: false }).toString('utf8')
    );

    expect(prepared.host_permissions).toEqual(['https://bitbin.divyanshuagrahari.dev/*']);
    expect(prepared.commands).toEqual(original.commands);
  });

  it('drops the local development site option from the production lib.js', async () => {
    const original = (await read('lib.js')).toString('utf8');
    expect(original).toContain("'http://localhost:3000'");

    const prepared = prepareExtensionFile('lib.js', await read('lib.js'), { includeLocalhost: false }).toString('utf8');

    expect(prepared).not.toContain("'http://localhost:3000'");
    expect(prepared).toContain("'https://bitbin.divyanshuagrahari.dev'");
    expect(prepared.split('\n').length).toBe(original.split('\n').length - 1);
  });

  it('passes other files through', () => {
    const content = Buffer.from('body { color: red; }');
    expect(prepareExtensionFile('styles.css', content, { includeLocalhost: false })).toBe(content);
  });
});

describe('buildExtensionZip', () => {
  it('zips the extension under one folder, without the README', async () => {
    const zip = Buffer.from(await buildExtensionZip({ includeLocalhost: false }));
    const listing = zip.toString('latin1');

    expect(zip.subarray(0, 2).toString()).toBe('PK');
    for (const name of ['manifest.json', 'popup.html', 'popup.js', 'options.js', 'background.js', 'lib.js', 'icons/icon-128.png']) {
      expect(listing).toContain(`bitbin-extension/${name}`);
    }
    expect(listing).not.toContain('bitbin-extension/README.md');
  });

  it('reuses the built zip', async () => {
    const a = await buildExtensionZip({ includeLocalhost: true });
    const b = await buildExtensionZip({ includeLocalhost: true });
    expect(a).toBe(b);
  });
});

describe('getExtensionVersion', () => {
  it('reads the manifest version', async () => {
    expect(await getExtensionVersion()).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

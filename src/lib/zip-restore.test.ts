import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({ prisma: {} }));
const { mockIngest, mockIdentities } = vi.hoisted(() => ({ mockIngest: vi.fn(), mockIdentities: vi.fn() }));
vi.mock('@/lib/file-ingest', () => ({ ingestFile: mockIngest }));
vi.mock('@/lib/db/import', () => ({ getItemIdentities: mockIdentities }));

import { restoreZipFiles } from './zip-restore';
import { parseImportData, type ImportData } from './import-schema';

function manifest(items: Record<string, unknown>[]): ImportData {
  const parsed = parseImportData({ version: 1, items, collections: [] });
  if (!parsed.ok) throw new Error('fixture should parse');
  return parsed.data;
}

const fileItem = (over: Record<string, unknown> = {}) => ({
  title: 'Spec',
  type: 'file',
  fileName: 'spec.txt',
  zipPath: 'files/spec.txt',
  ...over,
});

const bytes = (text: string) => new TextEncoder().encode(text);

describe('restoreZipFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIdentities.mockResolvedValue([]);
    mockIngest.mockImplementation(async ({ fileName, bytes }: { fileName: string; bytes: Buffer }) => ({
      ok: true,
      fileUrl: `https://r2.example/user-1/1-${fileName}`,
      fileName,
      fileSize: bytes.length,
    }));
  });

  it('stores each file under the importing user and points its item at the new URL', async () => {
    const data = manifest([fileItem({ fileUrl: 'https://r2.example/someone-else/old.txt' })]);

    const result = await restoreZipFiles('user-1', data, new Map([['files/spec.txt', bytes('hello')]]), true);

    expect(mockIngest).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1', itemType: 'file', fileName: 'spec.txt' }));
    expect(result.data.items[0].fileUrl).toBe('https://r2.example/user-1/1-spec.txt');
    expect(result.data.items[0].fileSize).toBe(5);
    expect(result.uploadedUrls).toEqual(['https://r2.example/user-1/1-spec.txt']);
    expect(result.dropped).toBe(0);
  });

  it('finds the file by name in an older export that has no recorded path', async () => {
    const data = manifest([fileItem({ zipPath: undefined })]);

    const result = await restoreZipFiles('user-1', data, new Map([['files/spec.txt', bytes('x')]]), true);

    expect(result.dropped).toBe(0);
    expect(result.data.items).toHaveLength(1);
  });

  it('leaves out a file item whose bytes are not in the ZIP', async () => {
    const data = manifest([fileItem()]);

    const result = await restoreZipFiles('user-1', data, new Map(), true);

    expect(result.data.items).toEqual([]);
    expect(result.dropped).toBe(1);
    expect(result.firstError).toContain('not in this ZIP');
    expect(mockIngest).not.toHaveBeenCalled();
  });

  it('leaves out a file the upload checks refuse, and says why', async () => {
    mockIngest.mockResolvedValue({ ok: false, error: 'File contents do not match its extension' });
    const data = manifest([fileItem(), { title: 'Todo', type: 'note', content: 'x' }]);

    const result = await restoreZipFiles('user-1', data, new Map([['files/spec.txt', bytes('x')]]), true);

    expect(result.data.items.map((i) => i.title)).toEqual(['Todo']);
    expect(result.dropped).toBe(1);
    expect(result.firstError).toContain('do not match');
    expect(result.uploadedUrls).toEqual([]);
  });

  it('stores nothing for an item the import will skip as a duplicate', async () => {
    mockIdentities.mockResolvedValue([{ title: 'Spec', type: 'file', content: null, url: null, fileName: 'spec.txt' }]);
    const data = manifest([fileItem()]);

    const result = await restoreZipFiles('user-1', data, new Map([['files/spec.txt', bytes('x')]]), true);

    expect(mockIngest).not.toHaveBeenCalled();
    expect(result.uploadedUrls).toEqual([]);
  });

  it('restores a duplicate when duplicates are not being skipped', async () => {
    const data = manifest([fileItem()]);

    await restoreZipFiles('user-1', data, new Map([['files/spec.txt', bytes('x')]]), false);

    expect(mockIdentities).not.toHaveBeenCalled();
    expect(mockIngest).toHaveBeenCalledTimes(1);
  });
});

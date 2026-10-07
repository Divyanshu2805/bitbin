import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({ prisma: {} }));

const { mockGetFromR2 } = vi.hoisted(() => ({ mockGetFromR2: vi.fn() }));
vi.mock('@/lib/r2', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/r2')>()),
  getFromR2: mockGetFromR2,
}));

import { buildExportZip } from './export-zip';
import { readImportZip } from './zip-import';
import { parseImportData } from './import-schema';
import type { ExportData, ExportItem } from '@/lib/db/export';

const fileItem = (n: number, name: string): ExportItem => ({
  title: `File ${n}`,
  type: 'file',
  content: null,
  language: null,
  description: null,
  url: null,
  fileName: name,
  fileSize: 3,
  fileUrl: `https://pub-test.r2.dev/user-1/${n}-${name}`,
  tags: [],
  collections: [],
  isFavorite: false,
  isPinned: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('buildExportZip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('R2_PUBLIC_URL', 'https://pub-test.r2.dev');
  });

  it('gives two files with the same name their own entries and records where each one is', async () => {
    mockGetFromR2.mockImplementation(async (key: string) => ({
      body: new TextEncoder().encode(`bytes of ${key}`),
      contentType: 'text/plain',
    }));
    const data: ExportData = {
      version: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      items: [fileItem(1, 'notes.txt'), fileItem(2, 'Notes.txt')],
      collections: [],
    };

    const zip = await buildExportZip('user-1', data);
    const read = readImportZip(zip);

    expect(read.ok).toBe(true);
    if (!read.ok) return;
    const parsed = parseImportData(read.manifest);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const paths = parsed.data.items.map((i) => i.zipPath);
    expect(paths).toEqual(['files/notes.txt', 'files/Notes-2.txt']);
    // Each item's entry holds its own object's bytes
    expect(new TextDecoder().decode(read.files.get(paths[0]!))).toBe('bytes of user-1/1-notes.txt');
    expect(new TextDecoder().decode(read.files.get(paths[1]!))).toBe('bytes of user-1/2-Notes.txt');
  });

  it('records no path for a file that is missing from storage, and never reads another user\'s object', async () => {
    mockGetFromR2.mockResolvedValue(null);
    const foreign = { ...fileItem(3, 'theirs.txt'), fileUrl: 'https://pub-test.r2.dev/user-2/3-theirs.txt' };
    const data: ExportData = {
      version: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      items: [fileItem(1, 'gone.txt'), foreign],
      collections: [],
    };

    const read = readImportZip(await buildExportZip('user-1', data));

    expect(read.ok).toBe(true);
    if (!read.ok) return;
    const parsed = parseImportData(read.manifest);
    if (!parsed.ok) throw new Error('manifest should parse');
    expect(parsed.data.items[0].zipPath).toBeNull();
    expect(mockGetFromR2).toHaveBeenCalledTimes(1);
    expect(mockGetFromR2).toHaveBeenCalledWith('user-1/1-gone.txt');
  });
});

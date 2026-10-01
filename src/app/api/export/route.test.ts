import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { NextRequest } from 'next/server';
import type { Session } from 'next-auth';

vi.mock('@/auth', () => ({ auth: vi.fn() }));

const { mockExportData, mockGetFromR2 } = vi.hoisted(() => ({
  mockExportData: vi.fn(),
  mockGetFromR2: vi.fn(),
}));
vi.mock('@/lib/db/export', () => ({ getUserExportData: mockExportData }));
vi.mock('@/lib/r2', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/r2')>()),
  getFromR2: mockGetFromR2,
}));

import { GET } from './route';
import { auth } from '@/auth';

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;

function exportRequest(format: string) {
  return new Request(`http://localhost/api/export?format=${format}`) as unknown as NextRequest & {
    nextUrl: URL;
  };
}

function get(format: string) {
  const request = exportRequest(format);
  Object.defineProperty(request, 'nextUrl', { value: new URL(request.url) });
  return GET(request);
}

const item = (type: string, fileUrl: string | null, fileName: string) => ({
  title: fileName,
  type,
  content: null,
  language: null,
  description: null,
  url: null,
  fileName,
  fileSize: 10,
  fileUrl,
  tags: [],
  collections: [],
  isFavorite: false,
  isPinned: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('GET /api/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('R2_PUBLIC_URL', 'https://pub-test.r2.dev');
    mockAuth.mockResolvedValue({ user: { id: 'user-1', isPro: true }, expires: new Date().toISOString() });
  });

  it('returns 401 without a session', async () => {
    mockAuth.mockResolvedValue(null);
    expect((await get('json')).status).toBe(401);
  });

  it('keeps ZIP export Pro-only', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', isPro: false }, expires: new Date().toISOString() });
    expect((await get('zip')).status).toBe(403);
    expect(mockExportData).not.toHaveBeenCalled();
  });

  it('reads only the caller\'s own files, by key, from the private bucket', async () => {
    mockExportData.mockResolvedValue({
      version: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      items: [
        item('image', 'https://pub-test.r2.dev/user-1/1-mine.png', 'mine.png'),
        item('image', 'https://pub-test.r2.dev/user-2/1-theirs.png', 'theirs.png'),
        item('file', 'http://169.254.169.254/latest/meta-data', 'metadata.txt'),
      ],
      collections: [],
    });
    mockGetFromR2.mockResolvedValue({ body: new Uint8Array([1, 2, 3]), contentType: 'image/png' });
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('the export must not fetch URLs'));

    const res = await get('zip');

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/zip');
    expect(mockGetFromR2).toHaveBeenCalledTimes(1);
    expect(mockGetFromR2).toHaveBeenCalledWith('user-1/1-mine.png');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('still produces the ZIP when a file is missing from storage', async () => {
    mockExportData.mockResolvedValue({
      version: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      items: [item('image', 'https://pub-test.r2.dev/user-1/1-gone.png', 'gone.png')],
      collections: [],
    });
    mockGetFromR2.mockResolvedValue(null);

    expect((await get('zip')).status).toBe(200);
  });
});

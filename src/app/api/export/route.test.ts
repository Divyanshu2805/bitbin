import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

const { mockCheckRateLimit } = vi.hoisted(() => ({
  mockCheckRateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 10, reset: 0, retryAfter: 0 }),
}));
vi.mock('@/lib/rate-limit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/rate-limit')>()),
  checkRateLimit: mockCheckRateLimit,
}));
const overLimit = { success: false, remaining: 0, reset: 0, retryAfter: 180 };
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

  it('puts snippets, prompts, commands, notes and links in the ZIP as files, next to the JSON', async () => {
    mockExportData.mockResolvedValue({
      version: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      items: [
        { ...item('snippet', null, 'x'), title: 'Debounce', language: 'typescript', content: 'export const x = 1' },
        { ...item('prompt', null, 'x'), title: 'Review', content: 'You are a reviewer' },
        { ...item('command', null, 'x'), title: 'Reset', content: 'git reset --hard' },
        { ...item('note', null, 'x'), title: 'Todo', content: '- milk' },
        { ...item('link', null, 'x'), title: 'Docs', url: 'https://docs.example.com' },
      ],
      collections: [],
    });

    const res = await get('zip');
    // File names are stored uncompressed in a ZIP's headers
    const names = Buffer.from(await res.arrayBuffer()).toString('latin1');

    for (const name of ['bitbin-export.json', 'snippets/Debounce.ts', 'prompts/Review.md', 'commands/Reset.sh', 'notes/Todo.md', 'links.md']) {
      expect(names).toContain(name);
    }
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

describe('GET /api/export rate limit', () => {
  it('answers 429 with Retry-After and reads nothing when over the limit', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', isPro: true }, expires: new Date().toISOString() });
    mockCheckRateLimit.mockResolvedValueOnce(overLimit);
    mockExportData.mockClear();

    const res = await get('json');

    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('180');
    expect(mockCheckRateLimit).toHaveBeenCalledWith('export', 'user-1');
    expect(mockExportData).not.toHaveBeenCalled();
  });
});

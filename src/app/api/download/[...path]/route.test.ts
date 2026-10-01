import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Session } from 'next-auth';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

const mockGetFromR2 = vi.hoisted(() => vi.fn());
vi.mock('@/lib/r2', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/r2')>()),
  getFromR2: mockGetFromR2,
}));

import { GET } from './route';
import { auth } from '@/auth';

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;

function signIn(id = 'user-1') {
  mockAuth.mockResolvedValue({ user: { id, isPro: true }, expires: new Date().toISOString() });
}

function get(path: string[], query = '') {
  return GET(new Request(`http://localhost/api/download/${path.join('/')}${query}`), {
    params: Promise.resolve({ path }),
  });
}

function stored(contentType: string | undefined, body: string | Uint8Array = 'hello') {
  mockGetFromR2.mockResolvedValue({
    body: typeof body === 'string' ? new TextEncoder().encode(body) : body,
    contentType,
  });
}

describe('GET /api/download/[...path]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without a session', async () => {
    mockAuth.mockResolvedValue(null);
    const res = await get(['user-1', '1-a.txt']);
    expect(res.status).toBe(401);
    expect(mockGetFromR2).not.toHaveBeenCalled();
  });

  it("returns 403 for another user's file", async () => {
    signIn('user-1');
    const res = await get(['user-2', '1-a.txt']);
    expect(res.status).toBe(403);
    expect(mockGetFromR2).not.toHaveBeenCalled();
  });

  it('returns 403 for a look-alike user id prefix', async () => {
    signIn('user-1');
    const res = await get(['user-10', '1-a.txt']);
    expect(res.status).toBe(403);
    expect(mockGetFromR2).not.toHaveBeenCalled();
  });

  it('returns 403 for a key that climbs out of the folder', async () => {
    signIn('user-1');

    for (const path of [
      ['user-1', '..', 'user-2', '1-a.txt'],
      ['user-1', '../user-2/1-a.txt'],
      ['user-1', '%2e%2e', 'user-2', '1-a.txt'],
      ['user-1', '.'],
    ]) {
      const res = await get(path);
      expect(res.status).toBe(403);
    }
    expect(mockGetFromR2).not.toHaveBeenCalled();
  });

  it('reads the object by its key with the server credentials', async () => {
    signIn();
    stored('application/json');
    await get(['user-1', '1700000000-data.json']);
    expect(mockGetFromR2).toHaveBeenCalledWith('user-1/1700000000-data.json');
  });

  it('returns 404 when the object does not exist', async () => {
    signIn();
    mockGetFromR2.mockResolvedValue(null);
    const res = await get(['user-1', '1-gone.txt']);
    expect(res.status).toBe(404);
  });

  it('returns 500 without leaking the storage error', async () => {
    signIn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGetFromR2.mockRejectedValue(new Error('secret bucket details'));
    const res = await get(['user-1', '1-a.txt']);
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('secret');
  });

  it('downloads as an attachment with the stored type by default', async () => {
    signIn();
    stored('application/json');
    const res = await get(['user-1', '1700000000-data.json']);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/json');
    expect(res.headers.get('content-disposition')).toBe('attachment; filename="data.json"');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('cache-control')).toContain('private');
  });

  it('serves a PDF inline as a PDF for the preview', async () => {
    signIn();
    stored('application/pdf');
    const res = await get(['user-1', '1-Resume.pdf'], '?inline=1');
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-disposition')).toBe('inline; filename="Resume.pdf"');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('serves an image inline as an image, sandboxed, by its extension', async () => {
    signIn();
    // Whatever type was stored, the extension decides what is served
    stored('text/html', new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
    const res = await get(['user-1', '1-photo.png'], '?inline=1');
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('content-security-policy')).toContain('sandbox');
  });

  it('serves an SVG inline without letting it run script', async () => {
    signIn();
    stored('image/svg+xml', '<svg xmlns="http://www.w3.org/2000/svg"/>');
    const res = await get(['user-1', '1-logo.svg'], '?inline=1');
    expect(res.headers.get('content-type')).toBe('image/svg+xml');
    expect(res.headers.get('content-security-policy')).toContain('sandbox');
  });

  it('serves anything else inline as sandboxed plain text', async () => {
    signIn();
    stored('application/xml', '<html xmlns="http://www.w3.org/1999/xhtml"><script>alert(1)</script></html>');
    const res = await get(['user-1', '1-page.xml'], '?inline=1');
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('content-security-policy')).toContain('sandbox');
  });

  it('does not treat a non-image extension as an image', async () => {
    signIn();
    stored('image/png', 'not really');
    const res = await get(['user-1', '1-notes.txt'], '?inline=1');
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8');
  });
});

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import type { Session } from 'next-auth';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

import { GET } from './route';
import { auth } from '@/auth';

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;
const fetchMock = vi.fn();

function signIn(id = 'user-1') {
  mockAuth.mockResolvedValue({ user: { id, isPro: true }, expires: new Date().toISOString() });
}

function get(path: string[], query = '') {
  return GET(new Request(`http://localhost/api/download/${path.join('/')}${query}`), {
    params: Promise.resolve({ path }),
  });
}

function stored(contentType: string, body = 'hello') {
  fetchMock.mockResolvedValue(new Response(body, { headers: { 'content-type': contentType } }));
}

describe('GET /api/download/[...path]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('R2_PUBLIC_URL', 'https://pub-test.r2.dev');
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('returns 401 without a session', async () => {
    mockAuth.mockResolvedValue(null);
    const res = await get(['user-1', '1-a.txt']);
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 403 for another user's file", async () => {
    signIn('user-1');
    const res = await get(['user-2', '1-a.txt']);
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('downloads as an attachment with the stored type by default', async () => {
    signIn();
    stored('application/json');
    const res = await get(['user-1', '1700000000-data.json']);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/json');
    expect(res.headers.get('content-disposition')).toBe('attachment; filename="data.json"');
  });

  it('serves a PDF inline as a PDF for the preview', async () => {
    signIn();
    stored('application/pdf');
    const res = await get(['user-1', '1-Resume.pdf'], '?inline=1');
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-disposition')).toBe('inline; filename="Resume.pdf"');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('serves anything else inline as sandboxed plain text', async () => {
    signIn();
    stored('application/xml', '<html xmlns="http://www.w3.org/1999/xhtml"><script>alert(1)</script></html>');
    const res = await get(['user-1', '1-page.xml'], '?inline=1');
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('content-security-policy')).toContain('sandbox');
  });
});

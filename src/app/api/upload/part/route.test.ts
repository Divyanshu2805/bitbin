import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Session } from 'next-auth';

vi.mock('@/auth', () => ({ auth: vi.fn() }));
const { findUnique, put, checkRateLimit } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  put: vi.fn(),
  checkRateLimit: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique } } }));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit,
  rateLimitResponse: () => new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 }),
}));
vi.mock('@/lib/r2', () => ({ putR2Object: put }));

import { PUT } from './route';
import { auth } from '@/auth';
import { UPLOAD_PART_BYTES } from '@/lib/upload-parts';

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;
const session: Session = { user: { id: 'user-1', email: 'u@example.com', isPro: true }, expires: '' };
const UPLOAD_ID = '0f8b7c1e-2d3a-4b5c-8d9e-0a1b2c3d4e5f';

function putPart(query: string, body: BodyInit = new Uint8Array([1, 2, 3]), headers: Record<string, string> = {}) {
  return PUT(new Request(`http://localhost/api/upload/part?${query}`, { method: 'PUT', body, headers }));
}

describe('PUT /api/upload/part', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(session);
    findUnique.mockResolvedValue({ isPro: true });
    checkRateLimit.mockResolvedValue({ success: true });
    put.mockResolvedValue(undefined);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('stores the part inside the caller\'s own folder', async () => {
    const res = await putPart(`uploadId=${UPLOAD_ID}&index=1`);

    expect(res.status).toBe(200);
    expect(put).toHaveBeenCalledWith(`user-1/parts/${UPLOAD_ID}/1`, new Uint8Array([1, 2, 3]), 'application/octet-stream');
    expect(checkRateLimit).toHaveBeenCalledWith('uploadPart', 'user-1');
  });

  it('returns 401 without a session and 403 for a Free user', async () => {
    mockAuth.mockResolvedValueOnce(null);
    expect((await putPart(`uploadId=${UPLOAD_ID}&index=0`)).status).toBe(401);

    findUnique.mockResolvedValueOnce({ isPro: false });
    expect((await putPart(`uploadId=${UPLOAD_ID}&index=0`)).status).toBe(403);
    expect(put).not.toHaveBeenCalled();
  });

  it.each([
    ['a path in the upload id', 'uploadId=../user-2&index=0'],
    ['no upload id', 'index=0'],
    ['a negative index', `uploadId=${UPLOAD_ID}&index=-1`],
    ['an index past the last part', `uploadId=${UPLOAD_ID}&index=3`],
    ['a fractional index', `uploadId=${UPLOAD_ID}&index=0.5`],
  ])('rejects %s', async (_name, query) => {
    expect((await putPart(query)).status).toBe(400);
    expect(put).not.toHaveBeenCalled();
  });

  it('rejects an empty part', async () => {
    expect((await putPart(`uploadId=${UPLOAD_ID}&index=0`, new Uint8Array(0))).status).toBe(400);
    expect(put).not.toHaveBeenCalled();
  });

  it('refuses a part larger than the part size, declared or actual', async () => {
    const declared = await putPart(`uploadId=${UPLOAD_ID}&index=0`, new Uint8Array(1), {
      'content-length': String(UPLOAD_PART_BYTES + 1),
    });
    expect(declared.status).toBe(413);

    const actual = await putPart(`uploadId=${UPLOAD_ID}&index=0`, new Uint8Array(UPLOAD_PART_BYTES + 1));
    expect([400, 413]).toContain(actual.status);
    expect(put).not.toHaveBeenCalled();
  });

  it('answers 429 over the part limit', async () => {
    checkRateLimit.mockResolvedValue({ success: false, retryAfter: 60 });
    expect((await putPart(`uploadId=${UPLOAD_ID}&index=0`)).status).toBe(429);
    expect(put).not.toHaveBeenCalled();
  });

  it('refuses a request from another site', async () => {
    const res = await putPart(`uploadId=${UPLOAD_ID}&index=0`, new Uint8Array([1]), { 'sec-fetch-site': 'cross-site' });
    expect(res.status).toBe(403);
    expect(mockAuth).not.toHaveBeenCalled();
  });

  it('returns a generic 500 when storage fails', async () => {
    put.mockRejectedValue(new Error('R2 key AKIA123 denied'));
    const res = await putPart(`uploadId=${UPLOAD_ID}&index=0`);
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('AKIA123');
  });
});

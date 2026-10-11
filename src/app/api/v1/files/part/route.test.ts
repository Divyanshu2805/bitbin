import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('@/lib/api-auth', async () => {
  const { NextResponse } = await import('next/server');
  return {
    authenticateApiRequest: vi.fn(),
    apiError: (error: string, status: number, headers?: HeadersInit) => NextResponse.json({ error }, { status, headers }),
  };
});
const { put, checkRateLimit } = vi.hoisted(() => ({ put: vi.fn(), checkRateLimit: vi.fn() }));
vi.mock('@/lib/r2', () => ({ putR2Object: put }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit, formatRetryTime: (s: number) => `${s} seconds` }));

import { PUT } from './route';
import { authenticateApiRequest } from '@/lib/api-auth';

const mockAuthenticate = vi.mocked(authenticateApiRequest);
const apiUser = { id: 'user-1', email: 'a@b.dev', name: 'A', isPro: true as const, scopes: ['files:write' as const] };
const UPLOAD_ID = '0f8b7c1e-2d3a-4b5c-8d9e-0a1b2c3d4e5f';

const putPart = (query: string, body: BodyInit = new Uint8Array([1, 2, 3])) =>
  PUT(new Request(`http://localhost/api/v1/files/part?${query}`, { method: 'PUT', headers: { authorization: 'Bearer bb_x' }, body }));

describe('PUT /api/v1/files/part', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticate.mockResolvedValue({ user: apiUser, tokenId: 'token-1' });
    checkRateLimit.mockResolvedValue({ success: true });
    put.mockResolvedValue(undefined);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('needs the files:write scope and stores the part in the token owner\'s folder', async () => {
    const res = await putPart(`uploadId=${UPLOAD_ID}&index=0`);

    expect(res.status).toBe(200);
    expect(mockAuthenticate).toHaveBeenCalledWith(expect.anything(), 'files:write');
    expect(put).toHaveBeenCalledWith(`user-1/parts/${UPLOAD_ID}/0`, new Uint8Array([1, 2, 3]), 'application/octet-stream');
  });

  it('returns the auth failure as-is', async () => {
    mockAuthenticate.mockResolvedValue({ response: NextResponse.json({ error: 'nope' }, { status: 401 }) });
    expect((await putPart(`uploadId=${UPLOAD_ID}&index=0`)).status).toBe(401);
    expect(put).not.toHaveBeenCalled();
  });

  it('rejects a bad upload id or index', async () => {
    expect((await putPart('uploadId=../x&index=0')).status).toBe(400);
    expect((await putPart(`uploadId=${UPLOAD_ID}&index=9`)).status).toBe(400);
    expect(put).not.toHaveBeenCalled();
  });

  it('answers 429 over the part limit', async () => {
    checkRateLimit.mockResolvedValue({ success: false, retryAfter: 30 });
    const res = await putPart(`uploadId=${UPLOAD_ID}&index=0`);
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('30');
  });

  it('returns a generic 500 when storage fails', async () => {
    put.mockRejectedValue(new Error('secret detail'));
    const res = await putPart(`uploadId=${UPLOAD_ID}&index=0`);
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('secret');
  });
});

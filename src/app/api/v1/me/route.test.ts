import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/api-auth', async () => {
  const { NextResponse } = await import('next/server');
  return {
    authenticateApiRequest: vi.fn(),
    apiError: (error: string, status: number) => NextResponse.json({ error }, { status }),
  };
});

import { GET } from './route';
import { authenticateApiRequest } from '@/lib/api-auth';
import { NextResponse } from 'next/server';

const mockAuthenticate = vi.mocked(authenticateApiRequest);
const request = () => new Request('http://localhost/api/v1/me');

describe('GET /api/v1/me', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes through the authentication failure', async () => {
    mockAuthenticate.mockResolvedValue({ response: NextResponse.json({ error: 'Invalid or revoked API token' }, { status: 401 }) });

    const res = await GET(request());

    expect(res.status).toBe(401);
  });

  it('returns only the email, name and plan of the token owner', async () => {
    mockAuthenticate.mockResolvedValue({
      user: { id: 'user-1', email: 'a@b.dev', name: 'A', isPro: true },
      tokenId: 'token-1',
    });

    const res = await GET(request());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { email: 'a@b.dev', name: 'A', isPro: true } });
  });

  it('returns a generic 500 on an unexpected failure', async () => {
    mockAuthenticate.mockRejectedValue(new Error('db password is hunter2'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await GET(request());

    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('hunter2');
  });
});

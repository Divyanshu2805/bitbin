import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/api-auth', async () => {
  const { NextResponse } = await import('next/server');
  return {
    authenticateApiRequest: vi.fn(),
    apiError: (error: string, status: number) => NextResponse.json({ error }, { status }),
  };
});
vi.mock('@/lib/db/collections', () => ({ getUserCollections: vi.fn() }));

import { GET } from './route';
import { authenticateApiRequest } from '@/lib/api-auth';
import { getUserCollections } from '@/lib/db/collections';
import { NextResponse } from 'next/server';

const mockAuthenticate = vi.mocked(authenticateApiRequest);
const mockCollections = vi.mocked(getUserCollections);
const request = () => new Request('http://localhost/api/v1/collections');

describe('GET /api/v1/collections', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not touch the database when authentication fails', async () => {
    mockAuthenticate.mockResolvedValue({ response: NextResponse.json({ error: 'Missing or malformed API token' }, { status: 401 }) });

    const res = await GET(request());

    expect(res.status).toBe(401);
    expect(mockCollections).not.toHaveBeenCalled();
  });

  it("lists the token owner's collections only", async () => {
    mockAuthenticate.mockResolvedValue({
      user: { id: 'user-1', email: 'a@b.dev', name: 'A', isPro: true },
      tokenId: 'token-1',
    });
    mockCollections.mockResolvedValue([{ id: 'c1', name: 'DevOps' }] as never);

    const res = await GET(request());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: [{ id: 'c1', name: 'DevOps' }] });
    expect(mockCollections).toHaveBeenCalledWith('user-1');
  });

  it('returns a generic 500 when the query fails', async () => {
    mockAuthenticate.mockResolvedValue({
      user: { id: 'user-1', email: 'a@b.dev', name: 'A', isPro: true },
      tokenId: 'token-1',
    });
    mockCollections.mockRejectedValue(new Error('connection to 10.0.0.5 refused'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await GET(request());

    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('10.0.0.5');
  });
});

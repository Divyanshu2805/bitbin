import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/api-auth', async () => {
  const { NextResponse } = await import('next/server');
  return {
    authenticateApiRequest: vi.fn(),
    apiError: (error: string, status: number) => NextResponse.json({ error }, { status }),
  };
});
vi.mock('@/lib/db/collections', () => ({ getUserCollections: vi.fn(), createCollection: vi.fn() }));
vi.mock('@/lib/usage', () => ({ canCreateCollection: vi.fn(), MAX_COLLECTIONS: 3 }));
vi.mock('@/lib/collection-create', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/collection-create')>()),
  createCollectionForUser: vi.fn(),
}));

import { GET, POST } from './route';
import { createCollectionForUser, COLLECTION_LIMIT_MESSAGE } from '@/lib/collection-create';
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
      user: { id: 'user-1', email: 'a@b.dev', name: 'A', isPro: true, scopes: ['collections:read', 'items:write', 'ai'] as ('collections:read' | 'items:write' | 'ai')[] },
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
      user: { id: 'user-1', email: 'a@b.dev', name: 'A', isPro: true, scopes: ['collections:read', 'items:write', 'ai'] as ('collections:read' | 'items:write' | 'ai')[] },
      tokenId: 'token-1',
    });
    mockCollections.mockRejectedValue(new Error('connection to 10.0.0.5 refused'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await GET(request());

    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('10.0.0.5');
  });
});

describe('POST /api/v1/collections', () => {
  const mockCreate = vi.mocked(createCollectionForUser);
  const authed = () =>
    mockAuthenticate.mockResolvedValue({
      user: { id: 'user-1', email: 'a@b.dev', name: 'A', isPro: true, scopes: ['items:write'] },
      tokenId: 'token-1',
    });
  const post = (body: unknown) =>
    new Request('http://localhost/api/v1/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });

  beforeEach(() => vi.clearAllMocks());

  it('needs the items:write scope and creates nothing without it', async () => {
    mockAuthenticate.mockResolvedValue({ response: NextResponse.json({ error: 'nope' }, { status: 403 }) });

    const res = await POST(post({ name: 'DevOps' }));

    expect(res.status).toBe(403);
    expect(mockAuthenticate).toHaveBeenCalledWith(expect.anything(), 'items:write');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('creates the collection for the token owner', async () => {
    authed();
    mockCreate.mockResolvedValue({ success: true, data: { id: 'c9', name: 'DevOps' } as never });

    const res = await POST(post({ name: '  DevOps ', userId: 'someone-else' }));

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ data: { id: 'c9', name: 'DevOps' } });
    expect(mockCreate).toHaveBeenCalledWith('user-1', true, { name: 'DevOps', description: null });
  });

  it('rejects a bad body and an empty name', async () => {
    authed();

    expect((await POST(post('not json'))).status).toBe(400);
    expect((await POST(post([]))).status).toBe(400);
    const res = await POST(post({ name: '   ' }));
    expect(res.status).toBe(400);
    expect((await res.json()).fieldErrors.name).toEqual(['Name is required']);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('maps the plan limit to 403 and other failures to a generic 500', async () => {
    authed();
    mockCreate.mockResolvedValueOnce({ success: false, error: COLLECTION_LIMIT_MESSAGE });
    expect((await POST(post({ name: 'A' }))).status).toBe(403);

    mockCreate.mockResolvedValueOnce({ success: false, error: 'Failed to create collection' });
    expect((await POST(post({ name: 'A' }))).status).toBe(500);
  });

  it('returns a generic 500 when something throws', async () => {
    authed();
    mockCreate.mockRejectedValue(new Error('connection to 10.0.0.5 refused'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await POST(post({ name: 'A' }));

    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('10.0.0.5');
  });
});

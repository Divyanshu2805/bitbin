import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('@/lib/api-auth', async () => {
  const { NextResponse } = await import('next/server');
  return {
    authenticateApiRequest: vi.fn(),
    apiError: (error: string, status: number) => NextResponse.json({ error }, { status }),
  };
});
vi.mock('@/lib/db/items', () => ({ getItemById: vi.fn() }));
vi.mock('@/lib/db/search', () => ({ searchItems: vi.fn(), getRecentSearchableItems: vi.fn() }));

import { GET } from './route';
import { authenticateApiRequest } from '@/lib/api-auth';
import { getItemById, type ItemDetail } from '@/lib/db/items';

const mockAuthenticate = vi.mocked(authenticateApiRequest);
const mockGetItem = vi.mocked(getItemById);

const apiUser = { id: 'user-1', email: 'a@b.dev', name: 'A', isPro: true as const, scopes: ['items:read' as const] };
const request = () => new Request('http://localhost/api/v1/items/item-1', { headers: { authorization: 'Bearer bb_x' } });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

const detail: ItemDetail = {
  id: 'item-1',
  title: 'architecture.png',
  description: 'The system diagram',
  content: null,
  url: null,
  language: null,
  contentType: 'FILE',
  fileUrl: 'https://files.example/user-1/abc.png',
  fileName: 'architecture.png',
  fileSize: 1840,
  isFavorite: true,
  isPinned: false,
  itemType: { name: 'image', icon: 'Image', color: '#ec4899' },
  tags: ['diagram'],
  collections: [{ id: 'c1', name: 'Infra' }],
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-02T00:00:00Z'),
};

describe('GET /api/v1/items/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticate.mockResolvedValue({ user: apiUser, tokenId: 'token-1' });
  });

  it('asks for the read permission and stops when authentication fails', async () => {
    mockAuthenticate.mockResolvedValue({ response: NextResponse.json({ error: 'nope' }, { status: 403 }) });
    const req = request();

    const res = await GET(req, params('item-1'));

    expect(res.status).toBe(403);
    expect(mockAuthenticate).toHaveBeenCalledWith(req, 'items:read');
    expect(mockGetItem).not.toHaveBeenCalled();
  });

  it("returns the token owner's item, with its file's name and size but not its address", async () => {
    mockGetItem.mockResolvedValue(detail);

    const res = await GET(request(), params('item-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockGetItem).toHaveBeenCalledWith('user-1', 'item-1');
    expect(body.data).toEqual({
      id: 'item-1',
      title: 'architecture.png',
      typeName: 'image',
      description: 'The system diagram',
      content: null,
      url: null,
      language: null,
      tags: ['diagram'],
      collections: [{ id: 'c1', name: 'Infra' }],
      fileName: 'architecture.png',
      fileSize: 1840,
      isFavorite: true,
      isPinned: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
    expect(JSON.stringify(body)).not.toContain('files.example');
  });

  it("answers 404 for someone else's item or one that doesn't exist", async () => {
    mockGetItem.mockResolvedValue(null);

    const res = await GET(request(), params('other'));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Item not found' });
  });

  it('returns a generic 500 when the query fails', async () => {
    mockGetItem.mockRejectedValue(new Error('connection to 10.0.0.5 refused'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await GET(request(), params('item-1'));

    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('10.0.0.5');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('@/lib/api-auth', async () => {
  const { NextResponse } = await import('next/server');
  return {
    authenticateApiRequest: vi.fn(),
    apiError: (error: string, status: number) => NextResponse.json({ error }, { status }),
  };
});

vi.mock('@/lib/db/items', () => ({
  createItem: vi.fn(),
  VALID_ITEM_TYPES: ['snippet', 'prompt', 'command', 'note', 'file', 'image', 'link'] as const,
}));

vi.mock('@/lib/usage', () => ({
  canCreateItem: vi.fn(),
}));

vi.mock('@/lib/db/search', () => ({
  searchItems: vi.fn(),
  getRecentSearchableItems: vi.fn(),
  MAX_SEARCH_LENGTH: 100,
}));

import { GET, POST } from './route';
import { authenticateApiRequest } from '@/lib/api-auth';
import { createItem as createItemQuery, type ItemDetail } from '@/lib/db/items';
import { canCreateItem } from '@/lib/usage';
import { getRecentSearchableItems, searchItems } from '@/lib/db/search';

const mockAuthenticate = vi.mocked(authenticateApiRequest);
const mockCreateItemQuery = vi.mocked(createItemQuery);
const mockCanCreateItem = vi.mocked(canCreateItem);

const apiUser = { id: 'user-1', email: 'a@b.dev', name: 'A', isPro: true as const, scopes: ['collections:read', 'items:write', 'ai'] as ('collections:read' | 'items:write' | 'ai')[] };

function post(body: unknown) {
  return new Request('http://localhost/api/v1/items', {
    method: 'POST',
    headers: { authorization: 'Bearer bb_x', 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /api/v1/items', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticate.mockResolvedValue({ user: apiUser, tokenId: 'token-1' });
    mockCanCreateItem.mockResolvedValue(true);
    mockCreateItemQuery.mockResolvedValue({
      id: 'item-1',
      title: 'Hello',
      itemType: { name: 'note' },
    } as ItemDetail);
  });

  it('returns the auth failure as-is', async () => {
    mockAuthenticate.mockResolvedValue({
      response: NextResponse.json({ error: 'Invalid or revoked API token' }, { status: 401 }),
    });

    const res = await POST(post({ typeName: 'note', title: 'Hello' }));

    expect(res.status).toBe(401);
    expect(mockCreateItemQuery).not.toHaveBeenCalled();
  });

  it('rejects a body that is not JSON', async () => {
    const res = await POST(post('not json'));
    expect(res.status).toBe(400);
  });

  it('rejects file and image types', async () => {
    const res = await POST(post({ typeName: 'image', title: 'x', fileUrl: 'https://x.r2.dev/a.png' }));

    expect(res.status).toBe(400);
    expect(mockCreateItemQuery).not.toHaveBeenCalled();
  });

  it('returns field errors for invalid input', async () => {
    const res = await POST(post({ typeName: 'note', title: '  ' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.fieldErrors.title).toBeDefined();
  });

  it('requires a url for links', async () => {
    const res = await POST(post({ typeName: 'link', title: 'Docs' }));
    expect(res.status).toBe(400);
  });

  it('rejects a javascript: url', async () => {
    const res = await POST(post({ typeName: 'link', title: 'x', url: 'javascript:alert(1)' }));
    expect(res.status).toBe(400);
  });

  it('creates the item for the token owner and drops file fields', async () => {
    const res = await POST(post({
      typeName: 'note',
      title: 'Hello',
      content: 'Selected text',
      url: 'https://example.com/page',
      tags: ['a', ' '],
      collectionIds: ['col-1'],
      fileUrl: 'https://someone-else.r2.dev/file.png',
    }));

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ data: { id: 'item-1', title: 'Hello', typeName: 'note' } });
    expect(mockCreateItemQuery).toHaveBeenCalledWith('user-1', expect.objectContaining({
      typeName: 'note',
      title: 'Hello',
      content: 'Selected text',
      url: 'https://example.com/page',
      tags: ['a'],
      collectionIds: ['col-1'],
      fileUrl: null,
    }));
  });

  it('defaults tags to an empty list', async () => {
    const res = await POST(post({ typeName: 'snippet', title: 'x', content: 'let a = 1' }));

    expect(res.status).toBe(201);
    expect(mockCreateItemQuery).toHaveBeenCalledWith('user-1', expect.objectContaining({ tags: [] }));
  });

  it('returns a generic 500 when the insert throws', async () => {
    mockCreateItemQuery.mockRejectedValue(new Error('db down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await POST(post({ typeName: 'note', title: 'Hello' }));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'An error occurred while saving the item' });
  });
});

describe('GET /api/v1/items', () => {
  const mockSearch = vi.mocked(searchItems);
  const mockRecent = vi.mocked(getRecentSearchableItems);
  const get = (query = '') => new Request(`http://localhost/api/v1/items${query}`, { headers: { authorization: 'Bearer bb_x' } });
  const found = { id: 'item-1', title: 'Tail pod logs', typeName: 'command', typeIcon: 'Terminal', typeColor: '#f97316', contentPreview: 'kubectl logs', tags: ['k8s'] };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticate.mockResolvedValue({ user: apiUser, tokenId: 'token-1' });
  });

  it('asks for the read permission and stops when authentication fails', async () => {
    mockAuthenticate.mockResolvedValue({ response: NextResponse.json({ error: 'nope' }, { status: 403 }) });
    const request = get('?q=kubectl');

    const res = await GET(request);

    expect(res.status).toBe(403);
    expect(mockAuthenticate).toHaveBeenCalledWith(request, 'items:read');
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it("searches the token owner's items and returns summaries", async () => {
    mockSearch.mockResolvedValue([found]);

    const res = await GET(get('?q=kubectl&limit=5'));

    expect(res.status).toBe(200);
    expect(mockSearch).toHaveBeenCalledWith('user-1', 'kubectl', 5);
    expect(await res.json()).toEqual({
      data: { items: [{ id: 'item-1', title: 'Tail pod logs', typeName: 'command', preview: 'kubectl logs', tags: ['k8s'] }] },
    });
  });

  it('lists the most recently edited items when nothing is asked for', async () => {
    mockRecent.mockResolvedValue([found]);

    const res = await GET(get());

    expect(res.status).toBe(200);
    expect(mockRecent).toHaveBeenCalledWith('user-1', 10);
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it.each([
    ['0', 1],
    ['999', 20],
    ['abc', 10],
    ['2.5', 10],
  ])('keeps limit=%s within bounds', async (limit, expected) => {
    mockSearch.mockResolvedValue([]);

    await GET(get(`?q=a&limit=${limit}`));

    expect(mockSearch).toHaveBeenCalledWith('user-1', 'a', expected);
  });

  it('refuses search text that is far too long', async () => {
    const res = await GET(get(`?q=${'a'.repeat(401)}`));

    expect(res.status).toBe(400);
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('returns a generic 500 when the search fails', async () => {
    mockSearch.mockRejectedValue(new Error('connection to 10.0.0.5 refused'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await GET(get('?q=a'));

    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('10.0.0.5');
  });
});

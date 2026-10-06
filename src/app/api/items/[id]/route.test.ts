import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Session } from 'next-auth';

vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/db/items', () => ({ getItemById: vi.fn() }));

import { GET } from './route';
import { auth } from '@/auth';
import { getItemById } from '@/lib/db/items';

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;
const mockGetItem = vi.mocked(getItemById);
const call = (id = 'item-1') =>
  GET(new Request(`http://localhost/api/items/${id}`), { params: Promise.resolve({ id }) });

describe('GET /api/items/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without a session and reads nothing', async () => {
    mockAuth.mockResolvedValue(null);

    expect((await call()).status).toBe(401);
    expect(mockGetItem).not.toHaveBeenCalled();
  });

  it("scopes the lookup to the session user and reports another user's item as not found", async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', isPro: false }, expires: '' } as Session);
    mockGetItem.mockResolvedValue(null);

    const res = await call('someone-elses-item');

    expect(res.status).toBe(404);
    expect(mockGetItem).toHaveBeenCalledWith('user-1', 'someone-elses-item');
  });

  it('returns the item', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', isPro: false }, expires: '' } as Session);
    mockGetItem.mockResolvedValue({ id: 'item-1', title: 'useDebounce' } as never);

    const res = await call();

    expect(res.status).toBe(200);
    expect((await res.json()).data.title).toBe('useDebounce');
  });

  it('returns a generic 500 when the query fails', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', isPro: false }, expires: '' } as Session);
    mockGetItem.mockRejectedValue(new Error('relation "items" does not exist'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await call();

    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('relation');
  });
});

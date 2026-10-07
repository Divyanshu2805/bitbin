import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Session } from 'next-auth';

vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/db/search', () => ({
  MAX_SEARCH_LENGTH: 100,
  searchItems: vi.fn(),
  searchCollections: vi.fn(),
  getRecentSearchableItems: vi.fn(),
  getRecentSearchableCollections: vi.fn(),
}));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 10, reset: 0, retryAfter: 0 }),
  formatRetryTime: (s: number) => `${s} seconds`,
}));

import { searchLibrary } from './search';
import { auth } from '@/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  getRecentSearchableCollections,
  getRecentSearchableItems,
  searchCollections,
  searchItems,
} from '@/lib/db/search';

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;
const session: Session = { user: { id: 'user-1', isPro: false }, expires: new Date().toISOString() };

const item = { id: 'i1', title: 'Debounce', typeName: 'snippet', typeIcon: 'Code', typeColor: '#3b82f6', contentPreview: 'x', tags: [] };
const collection = { id: 'c1', name: 'Hooks', itemCount: 2 };

describe('searchLibrary server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(session);
    vi.mocked(checkRateLimit).mockResolvedValue({ success: true, remaining: 10, reset: 0, retryAfter: 0 });
    vi.mocked(searchItems).mockResolvedValue([item]);
    vi.mocked(searchCollections).mockResolvedValue([collection]);
    vi.mocked(getRecentSearchableItems).mockResolvedValue([item]);
    vi.mocked(getRecentSearchableCollections).mockResolvedValue([collection]);
  });

  it('requires a session', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await searchLibrary('x');

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
    expect(searchItems).not.toHaveBeenCalled();
  });

  it('requires a user id on the session', async () => {
    mockAuth.mockResolvedValue({ user: { id: '', isPro: false }, expires: '' });
    expect((await searchLibrary('x')).error).toBe('Unauthorized');
  });

  it('searches for the session user only, never an id from the input', async () => {
    const result = await searchLibrary('debounce');

    expect(searchItems).toHaveBeenCalledWith('user-1', 'debounce');
    expect(searchCollections).toHaveBeenCalledWith('user-1', 'debounce');
    expect(getRecentSearchableItems).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, data: { items: [item], collections: [collection] } });
  });

  it('shows the recent items and collections when nothing (or only spaces) is typed', async () => {
    for (const text of ['', '   ']) {
      const result = await searchLibrary(text);
      expect(result.success).toBe(true);
    }

    expect(getRecentSearchableItems).toHaveBeenCalledTimes(2);
    expect(getRecentSearchableItems).toHaveBeenCalledWith('user-1');
    expect(searchItems).not.toHaveBeenCalled();
  });

  it('refuses absurdly long text before touching the database', async () => {
    const result = await searchLibrary('x'.repeat(1000));

    expect(result).toEqual({ success: false, error: 'Search text is too long' });
    expect(searchItems).not.toHaveBeenCalled();
  });

  it('is rate limited per user', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ success: false, remaining: 0, reset: 0, retryAfter: 20 });

    const result = await searchLibrary('x');

    expect(checkRateLimit).toHaveBeenCalledWith('search', 'user-1');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Too many searches');
    expect(searchItems).not.toHaveBeenCalled();
  });

  it('hides a database failure behind a generic message', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(searchItems).mockRejectedValue(new Error('connection refused to ep-secret.neon.tech'));

    const result = await searchLibrary('x');

    expect(result).toEqual({ success: false, error: 'Search failed' });
  });
});

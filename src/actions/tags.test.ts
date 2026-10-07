import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Session } from 'next-auth';

vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/db/tags', () => ({ renameUserTag: vi.fn(), deleteUserTag: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 1, reset: 0, retryAfter: 0 }),
  formatRetryTime: (s: number) => `${s} seconds`,
}));

import { deleteTag, renameTag } from './tags';
import { auth } from '@/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { deleteUserTag, renameUserTag } from '@/lib/db/tags';

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;
const mockRename = vi.mocked(renameUserTag);
const mockDelete = vi.mocked(deleteUserTag);
const session: Session = { user: { id: 'user-1', email: 'u@example.com', isPro: false }, expires: '' };

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue(session);
  vi.mocked(checkRateLimit).mockResolvedValue({ success: true, remaining: 1, reset: 0, retryAfter: 0 });
});

describe('renameTag', () => {
  it('requires a session', async () => {
    mockAuth.mockResolvedValue(null);
    expect((await renameTag({ from: 'a', to: 'b' })).error).toBe('Unauthorized');
    expect(mockRename).not.toHaveBeenCalled();
  });

  it('validates both names', async () => {
    const empty = await renameTag({ from: 'a', to: '   ' });
    expect(empty.success).toBe(false);
    expect(empty.fieldErrors?.to).toBeDefined();

    const long = await renameTag({ from: 'a', to: 'x'.repeat(51) });
    expect(long.success).toBe(false);
    expect(mockRename).not.toHaveBeenCalled();
  });

  it('refuses a rename to the same name', async () => {
    expect(await renameTag({ from: 'react', to: ' react ' })).toEqual({ success: false, error: 'Choose a different name' });
  });

  it('is rate limited', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ success: false, remaining: 0, reset: 0, retryAfter: 30 });
    const result = await renameTag({ from: 'a', to: 'b' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Too many');
    expect(mockRename).not.toHaveBeenCalled();
  });

  it('renames for the session user only, trimming the names', async () => {
    mockRename.mockResolvedValue(3);

    const result = await renameTag({ from: ' js ', to: ' javascript ' });

    expect(mockRename).toHaveBeenCalledWith('user-1', 'js', 'javascript');
    expect(result).toEqual({ success: true, data: { itemsChanged: 3 } });
  });

  it('says so when the user has no such tag', async () => {
    mockRename.mockResolvedValue(null);
    expect(await renameTag({ from: 'nope', to: 'b' })).toEqual({ success: false, error: 'Tag not found' });
  });
});

describe('deleteTag', () => {
  it('requires a session', async () => {
    mockAuth.mockResolvedValue(null);
    expect((await deleteTag({ name: 'a' })).error).toBe('Unauthorized');
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('rejects an empty name', async () => {
    expect((await deleteTag({ name: ' ' })).success).toBe(false);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('removes the tag from the session user\'s items', async () => {
    mockDelete.mockResolvedValue(2);

    const result = await deleteTag({ name: 'old' });

    expect(mockDelete).toHaveBeenCalledWith('user-1', 'old');
    expect(result).toEqual({ success: true, data: { itemsChanged: 2 } });
  });

  it('says so when the user has no such tag', async () => {
    mockDelete.mockResolvedValue(null);
    expect(await deleteTag({ name: 'nope' })).toEqual({ success: false, error: 'Tag not found' });
  });
});

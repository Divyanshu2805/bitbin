import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/api-tokens', () => ({
  findApiTokenByHash: vi.fn(),
  touchApiToken: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(),
  formatRetryTime: vi.fn((s: number) => `${s} seconds`),
}));

import { authenticateApiRequest } from './api-auth';
import { hashApiToken } from './api-tokens';
import { findApiTokenByHash, touchApiToken } from '@/lib/db/api-tokens';
import { checkRateLimit } from '@/lib/rate-limit';

const mockFind = vi.mocked(findApiTokenByHash);
const mockTouch = vi.mocked(touchApiToken);
const mockRateLimit = vi.mocked(checkRateLimit);

const TOKEN = 'bb_test-token';

function request(authorization?: string) {
  return new Request('http://localhost/api/v1/me', {
    headers: authorization ? { authorization } : {},
  });
}

function owner(isPro: boolean, lastUsedAt: Date | null = null) {
  return {
    tokenId: 'token-1',
    lastUsedAt,
    user: { id: 'user-1', email: 'a@b.dev', name: 'A', isPro },
  };
}

describe('authenticateApiRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockResolvedValue({ success: true, remaining: 59, reset: 0, retryAfter: 0 });
    mockTouch.mockResolvedValue();
  });

  it('returns 401 without a bearer token', async () => {
    const { response } = await authenticateApiRequest(request());
    expect(response?.status).toBe(401);
    expect(mockFind).not.toHaveBeenCalled();
  });

  it('returns 401 for an unknown token, looking it up by hash', async () => {
    mockFind.mockResolvedValue(null);

    const { response } = await authenticateApiRequest(request(`Bearer ${TOKEN}`));

    expect(response?.status).toBe(401);
    expect(mockFind).toHaveBeenCalledWith(hashApiToken(TOKEN));
  });

  it('returns 403 when the owner is no longer Pro', async () => {
    mockFind.mockResolvedValue(owner(false));

    const { response } = await authenticateApiRequest(request(`Bearer ${TOKEN}`));

    expect(response?.status).toBe(403);
    expect(await response?.json()).toEqual({ error: 'The BitBin extension requires a Pro subscription' });
  });

  it('returns 429 with Retry-After when rate limited', async () => {
    mockFind.mockResolvedValue(owner(true));
    mockRateLimit.mockResolvedValue({ success: false, remaining: 0, reset: 0, retryAfter: 30 });

    const { response } = await authenticateApiRequest(request(`Bearer ${TOKEN}`));

    expect(response?.status).toBe(429);
    expect(response?.headers.get('Retry-After')).toBe('30');
    expect(mockRateLimit).toHaveBeenCalledWith('api', 'user-1');
  });

  it('returns the user for a valid Pro token and records its use', async () => {
    mockFind.mockResolvedValue(owner(true));

    const result = await authenticateApiRequest(request(`Bearer ${TOKEN}`));

    expect(result.response).toBeUndefined();
    expect(result.user).toEqual({ id: 'user-1', email: 'a@b.dev', name: 'A', isPro: true });
    expect(mockTouch).toHaveBeenCalledWith('token-1');
  });

  it('skips the lastUsedAt write when it was updated recently', async () => {
    mockFind.mockResolvedValue(owner(true, new Date()));

    await authenticateApiRequest(request(`Bearer ${TOKEN}`));

    expect(mockTouch).not.toHaveBeenCalled();
  });

  it('still authenticates when the lastUsedAt write fails', async () => {
    mockFind.mockResolvedValue(owner(true));
    mockTouch.mockRejectedValue(new Error('db down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await authenticateApiRequest(request(`Bearer ${TOKEN}`));

    expect(result.user?.id).toBe('user-1');
  });
});

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

const ALL_SCOPES = ['collections:read', 'items:write', 'ai'] as ('collections:read' | 'items:write' | 'ai')[];

function owner(
  isPro: boolean,
  lastUsedAt: Date | null = null,
  expiresAt: Date | null = null,
  scopes = ALL_SCOPES
) {
  return {
    tokenId: 'token-1',
    lastUsedAt,
    expiresAt,
    scopes,
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

  it('returns 401 for an expired token, before looking at the plan', async () => {
    mockFind.mockResolvedValue(owner(true, null, new Date(Date.now() - 1000)));

    const { response } = await authenticateApiRequest(request(`Bearer ${TOKEN}`));

    expect(response?.status).toBe(401);
    expect((await response?.json()).error).toContain('expired');
    expect(mockRateLimit).not.toHaveBeenCalled();
    expect(mockTouch).not.toHaveBeenCalled();
  });

  it('accepts a token that has not expired yet, and one that never expires', async () => {
    mockFind.mockResolvedValue(owner(true, null, new Date(Date.now() + 60_000)));
    expect((await authenticateApiRequest(request(`Bearer ${TOKEN}`))).user).toBeDefined();

    mockFind.mockResolvedValue(owner(true, null, null));
    expect((await authenticateApiRequest(request(`Bearer ${TOKEN}`))).user).toBeDefined();
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
    expect(result.user).toEqual({ id: 'user-1', email: 'a@b.dev', name: 'A', isPro: true, scopes: ALL_SCOPES });
    expect(mockTouch).toHaveBeenCalledWith('token-1');
  });

  describe('scopes', () => {
    it('lets a token through an endpoint it has the scope for', async () => {
      mockFind.mockResolvedValue(owner(true, null, null, ['items:write']));

      const result = await authenticateApiRequest(request(`Bearer ${TOKEN}`), 'items:write');

      expect(result.response).toBeUndefined();
      expect(result.user?.scopes).toEqual(['items:write']);
    });

    it('returns 403 for an endpoint the token lacks the scope for, before the rate limit and the touch', async () => {
      mockFind.mockResolvedValue(owner(true, null, null, ['items:write']));

      const { response } = await authenticateApiRequest(request(`Bearer ${TOKEN}`), 'ai');

      expect(response?.status).toBe(403);
      expect((await response?.json()).error).toContain('AI suggestions');
      expect(mockRateLimit).not.toHaveBeenCalled();
      expect(mockTouch).not.toHaveBeenCalled();
    });

    it('treats a token with no scopes as able to do nothing that needs one', async () => {
      mockFind.mockResolvedValue(owner(true, null, null, []));

      expect((await authenticateApiRequest(request(`Bearer ${TOKEN}`), 'collections:read')).response?.status).toBe(403);
    });

    it('asks for no scope on an endpoint that needs none (checking a token)', async () => {
      mockFind.mockResolvedValue(owner(true, null, null, []));

      expect((await authenticateApiRequest(request(`Bearer ${TOKEN}`))).user).toBeDefined();
    });

    it('still reports an expired or non-Pro token before the scope', async () => {
      mockFind.mockResolvedValue(owner(false, null, null, []));

      expect((await authenticateApiRequest(request(`Bearer ${TOKEN}`), 'ai')).response?.status).toBe(403);
      mockFind.mockResolvedValue(owner(true, null, new Date(Date.now() - 1000), ALL_SCOPES));
      expect((await authenticateApiRequest(request(`Bearer ${TOKEN}`), 'ai')).response?.status).toBe(401);
    });
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

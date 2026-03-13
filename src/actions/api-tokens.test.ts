import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Session } from 'next-auth';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db/api-tokens', () => ({
  countApiTokens: vi.fn(),
  createApiToken: vi.fn(),
  deleteApiToken: vi.fn(),
  MAX_API_TOKENS: 10,
}));

import { createApiToken, revokeApiToken } from './api-tokens';
import { auth } from '@/auth';
import { hashApiToken } from '@/lib/api-tokens';
import {
  countApiTokens,
  createApiToken as createApiTokenQuery,
  deleteApiToken as deleteApiTokenQuery,
} from '@/lib/db/api-tokens';

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;
const mockCount = vi.mocked(countApiTokens);
const mockCreate = vi.mocked(createApiTokenQuery);
const mockDelete = vi.mocked(deleteApiTokenQuery);

function signIn(isPro: boolean) {
  mockAuth.mockResolvedValue({
    user: { id: 'user-123', isPro },
    expires: new Date().toISOString(),
  });
}

const summary = {
  id: 'token-1',
  name: 'Chrome',
  prefix: 'bb_abcdefg',
  lastUsedAt: null,
  createdAt: new Date(),
};

describe('createApiToken server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCount.mockResolvedValue(0);
    mockCreate.mockResolvedValue(summary);
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await createApiToken({ name: 'Chrome' });

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('requires Pro', async () => {
    signIn(false);

    const result = await createApiToken({ name: 'Chrome' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('The browser extension requires a Pro subscription');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('validates the name', async () => {
    signIn(true);

    const result = await createApiToken({ name: '   ' });

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.name).toBeDefined();
  });

  it('refuses beyond the token limit', async () => {
    signIn(true);
    mockCount.mockResolvedValue(10);

    const result = await createApiToken({ name: 'Chrome' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('up to 10 tokens');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('stores only the hash and returns the plain token once', async () => {
    signIn(true);

    const result = await createApiToken({ name: '  Chrome  ' });

    expect(result.success).toBe(true);
    const token = result.data!.token;
    expect(token.startsWith('bb_')).toBe(true);
    expect(mockCreate).toHaveBeenCalledWith('user-123', {
      name: 'Chrome',
      tokenHash: hashApiToken(token),
      prefix: token.slice(0, 10),
    });
    expect(JSON.stringify(mockCreate.mock.calls[0])).not.toContain(token);
  });
});

describe('revokeApiToken server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await revokeApiToken('token-1');

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('works on the Free plan, scoped to the caller', async () => {
    signIn(false);
    mockDelete.mockResolvedValue(true);

    const result = await revokeApiToken('token-1');

    expect(result.success).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith('user-123', 'token-1');
  });

  it('reports a missing or foreign token as not found', async () => {
    signIn(true);
    mockDelete.mockResolvedValue(false);

    const result = await revokeApiToken('token-x');

    expect(result).toEqual({ success: false, error: 'Token not found or access denied' });
  });

  it('rejects an empty id', async () => {
    signIn(true);

    const result = await revokeApiToken(' ');

    expect(result.success).toBe(false);
    expect(mockDelete).not.toHaveBeenCalled();
  });
});

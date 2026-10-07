import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { findUnique, compare, checkRateLimit } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  compare: vi.fn(),
  checkRateLimit: vi.fn(),
}));
// next-auth can't be loaded by Vitest's Node resolver; only the error base class is needed here
vi.mock('next-auth', () => ({ CredentialsSignin: class extends Error {} }));
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique } } }));
vi.mock('bcryptjs', () => ({ default: { compare } }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit }));

import { authorizeCredentials, RateLimitedSignin } from './credentials';

const baseUser = {
  id: 'user-1',
  email: 'ada@example.com',
  name: 'Ada',
  image: null,
  password: 'stored-hash',
  emailVerified: new Date(),
};

const creds = (extra: Record<string, unknown> = {}) => ({ email: 'ada@example.com', password: 'password123', ...extra });

describe('authorizeCredentials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('SKIP_EMAIL_VERIFICATION', 'false');
    checkRateLimit.mockResolvedValue({ success: true });
    compare.mockResolvedValue(true);
    findUnique.mockResolvedValue(baseUser);
  });
  afterEach(() => vi.unstubAllEnvs());

  it('signs in a verified account with the right password', async () => {
    expect(await authorizeCredentials(creds())).toEqual({
      id: 'user-1',
      email: 'ada@example.com',
      name: 'Ada',
      image: null,
    });
  });

  it('returns null for missing fields without touching the limiter or the database', async () => {
    expect(await authorizeCredentials(undefined)).toBeNull();
    expect(await authorizeCredentials({ email: 'a@b.com' })).toBeNull();
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('enforces the login limit first, per address', async () => {
    checkRateLimit.mockResolvedValue({ success: false });

    await expect(authorizeCredentials(creds({ email: 'Ada@Example.com' }))).rejects.toBeInstanceOf(RateLimitedSignin);
    expect(checkRateLimit).toHaveBeenCalledWith('login', 'ada@example.com');
    expect(findUnique).not.toHaveBeenCalled();
  });

  it.each([
    ['an unknown account', null],
    ['a GitHub-only account', { ...baseUser, password: null }],
  ])('returns null for %s, the same as a wrong password', async (_name, user) => {
    findUnique.mockResolvedValue(user);
    expect(await authorizeCredentials(creds())).toBeNull();
  });

  it('returns null for a wrong password', async () => {
    compare.mockResolvedValue(false);
    expect(await authorizeCredentials(creds())).toBeNull();
  });

  it('refuses an unverified email, unless verification is skipped (development)', async () => {
    findUnique.mockResolvedValue({ ...baseUser, emailVerified: null });
    await expect(authorizeCredentials(creds())).rejects.toThrow('EmailNotVerified');

    vi.stubEnv('SKIP_EMAIL_VERIFICATION', 'true');
    expect(await authorizeCredentials(creds())).not.toBeNull();
  });
});

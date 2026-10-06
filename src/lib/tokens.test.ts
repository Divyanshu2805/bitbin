import { createHash } from 'crypto';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { create, deleteMany, findUnique } = vi.hoisted(() => ({
  create: vi.fn(),
  deleteMany: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock('./prisma', () => ({ prisma: { verificationToken: { create, deleteMany, findUnique } } }));

import {
  consumePasswordResetToken,
  consumeVerificationToken,
  generatePasswordResetToken,
  generateVerificationToken,
  hashToken,
} from './tokens';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const inFuture = () => new Date(Date.now() + 60_000);
const inPast = () => new Date(Date.now() - 60_000);

beforeEach(() => {
  vi.clearAllMocks();
  create.mockResolvedValue({});
  deleteMany.mockResolvedValue({ count: 1 });
});

describe('hashToken', () => {
  it('is the SHA-256 of the token, in hex', () => {
    expect(hashToken('abc')).toBe(sha256('abc'));
    expect(hashToken('abc')).toHaveLength(64);
  });
});

describe('generating tokens', () => {
  it('returns a random raw token and stores only its hash', async () => {
    const token = await generateVerificationToken('a@b.dev');

    expect(token).toMatch(/^[0-9a-f]{64}$/);
    const stored = create.mock.calls[0][0].data;
    expect(stored.token).toBe(sha256(token));
    expect(stored.token).not.toBe(token);
    expect(JSON.stringify(create.mock.calls)).not.toContain(token);
    expect(stored.identifier).toBe('a@b.dev');
  });

  it('gives each call a different token', async () => {
    const a = await generateVerificationToken('a@b.dev');
    const b = await generateVerificationToken('a@b.dev');
    expect(a).not.toBe(b);
  });

  it('replaces any earlier token for the same email', async () => {
    await generateVerificationToken('a@b.dev');
    expect(deleteMany).toHaveBeenCalledWith({ where: { identifier: 'a@b.dev' } });
  });

  it('stores a reset token under a prefixed identifier, hashed, valid for an hour', async () => {
    const token = await generatePasswordResetToken('a@b.dev');

    const stored = create.mock.calls[0][0].data;
    expect(stored.identifier).toBe('password-reset:a@b.dev');
    expect(stored.token).toBe(sha256(token));
    const lifetime = stored.expires.getTime() - Date.now();
    expect(lifetime).toBeGreaterThan(59 * 60_000);
    expect(lifetime).toBeLessThanOrEqual(60 * 60_000);
  });
});

describe('consumeVerificationToken', () => {
  it('looks the token up by its hash and returns the email', async () => {
    findUnique.mockResolvedValue({ identifier: 'a@b.dev', token: sha256('raw'), expires: inFuture() });

    expect(await consumeVerificationToken('raw')).toEqual({ email: 'a@b.dev' });
    expect(findUnique).toHaveBeenCalledWith({ where: { token: sha256('raw') } });
    expect(deleteMany).toHaveBeenCalledWith({ where: { token: sha256('raw') } });
  });

  it('refuses an unknown token', async () => {
    findUnique.mockResolvedValue(null);
    expect(await consumeVerificationToken('raw')).toBeNull();
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('refuses a stored hash given as if it were the token', async () => {
    findUnique.mockResolvedValue(null);
    expect(await consumeVerificationToken(sha256('raw'))).toBeNull();
    expect(findUnique).toHaveBeenCalledWith({ where: { token: sha256(sha256('raw')) } });
  });

  it('refuses a password reset token', async () => {
    findUnique.mockResolvedValue({ identifier: 'password-reset:a@b.dev', expires: inFuture() });
    expect(await consumeVerificationToken('raw')).toBeNull();
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('refuses an expired token, and deletes it', async () => {
    findUnique.mockResolvedValue({ identifier: 'a@b.dev', expires: inPast() });
    expect(await consumeVerificationToken('raw')).toBeNull();
    expect(deleteMany).toHaveBeenCalledTimes(1);
  });

  it('works only once when two requests arrive together', async () => {
    findUnique.mockResolvedValue({ identifier: 'a@b.dev', expires: inFuture() });
    // The first delete removes the row, the second finds nothing left
    deleteMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });

    const results = await Promise.all([consumeVerificationToken('raw'), consumeVerificationToken('raw')]);

    expect(results.filter(Boolean)).toHaveLength(1);
  });
});

describe('consumePasswordResetToken', () => {
  it('returns the email without the prefix', async () => {
    findUnique.mockResolvedValue({ identifier: 'password-reset:a@b.dev', expires: inFuture() });
    expect(await consumePasswordResetToken('raw')).toEqual({ email: 'a@b.dev' });
  });

  it('refuses an email verification token', async () => {
    findUnique.mockResolvedValue({ identifier: 'a@b.dev', expires: inFuture() });
    expect(await consumePasswordResetToken('raw')).toBeNull();
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('refuses an unknown or an expired token', async () => {
    findUnique.mockResolvedValue(null);
    expect(await consumePasswordResetToken('raw')).toBeNull();

    findUnique.mockResolvedValue({ identifier: 'password-reset:a@b.dev', expires: inPast() });
    expect(await consumePasswordResetToken('raw')).toBeNull();
  });

  it('works only once when two requests arrive together', async () => {
    findUnique.mockResolvedValue({ identifier: 'password-reset:a@b.dev', expires: inFuture() });
    deleteMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });

    const results = await Promise.all([consumePasswordResetToken('raw'), consumePasswordResetToken('raw')]);

    expect(results.filter(Boolean)).toHaveLength(1);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { findUnique, sendEmail } = vi.hoisted(() => ({ findUnique: vi.fn(), sendEmail: vi.fn() }));

vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique } } }));
vi.mock('@/lib/email', () => ({ sendVerificationEmail: sendEmail }));
vi.mock('@/lib/tokens', () => ({ generateVerificationToken: vi.fn().mockResolvedValue('token') }));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

import { POST } from './route';

const post = (email: unknown) =>
  POST(new Request('http://localhost/x', { method: 'POST', body: JSON.stringify({ email }) }));

describe('POST /api/auth/resend-verification', () => {
  beforeEach(() => vi.clearAllMocks());

  it('gives the same answer for unknown, verified and unverified addresses', async () => {
    findUnique.mockResolvedValueOnce(null);
    const unknown = await (await post('a@b.com')).json();
    findUnique.mockResolvedValueOnce({ emailVerified: new Date() });
    const verified = await (await post('a@b.com')).json();
    findUnique.mockResolvedValueOnce({ emailVerified: null });
    const unverified = await (await post('a@b.com')).json();

    expect(verified).toEqual(unknown);
    expect(unverified).toEqual(unknown);
  });

  it('only sends mail to an unverified account', async () => {
    findUnique.mockResolvedValueOnce({ emailVerified: new Date() });
    await post('a@b.com');
    expect(sendEmail).not.toHaveBeenCalled();

    findUnique.mockResolvedValueOnce({ emailVerified: null });
    await post('a@b.com');
    expect(sendEmail).toHaveBeenCalledWith('a@b.com', 'token');
  });

  it('rejects a missing or non-string email', async () => {
    expect((await post(undefined)).status).toBe(400);
    expect((await post({ $ne: '' })).status).toBe(400);
  });
});

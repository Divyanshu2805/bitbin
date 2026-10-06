import { describe, it, expect, vi, beforeEach } from 'vitest';

const { findUnique, sendEmail } = vi.hoisted(() => ({ findUnique: vi.fn(), sendEmail: vi.fn() }));

vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique } } }));
vi.mock('@/lib/email', () => ({ sendVerificationEmail: sendEmail }));
vi.mock('@/lib/tokens', () => ({ generateVerificationToken: vi.fn().mockResolvedValue('token') }));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(() => new Response(JSON.stringify({ error: 'Too many attempts' }), { status: 429 })),
}));

import { POST } from './route';
import { checkRateLimit } from '@/lib/rate-limit';

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

  it('also limits resends per address, whatever the IP', async () => {
    findUnique.mockResolvedValue({ emailVerified: null });
    await post('Victim@B.com');
    expect(checkRateLimit).toHaveBeenCalledWith('resendVerificationEmail', 'victim@b.com', { ignoreIp: true });

    vi.mocked(checkRateLimit).mockImplementation(async (type) =>
      type === 'resendVerificationEmail' ? { success: false, remaining: 0, reset: 0, retryAfter: 900 } : { success: true, remaining: 1, reset: 0, retryAfter: 0 }
    );
    sendEmail.mockClear();
    const res = await post('victim@b.com');

    expect(res.status).toBe(429);
    expect(sendEmail).not.toHaveBeenCalled();
    vi.mocked(checkRateLimit).mockResolvedValue({ success: true, remaining: 1, reset: 0, retryAfter: 0 });
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

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { findUnique, generateToken, sendEmail, checkRateLimit } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  generateToken: vi.fn(),
  sendEmail: vi.fn(),
  checkRateLimit: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique } } }));
vi.mock('@/lib/tokens', () => ({ generatePasswordResetToken: generateToken }));
vi.mock('@/lib/email', () => ({ sendPasswordResetEmail: sendEmail }));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit,
  rateLimitResponse: () => new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 }),
}));

import { POST } from './route';

const post = (body: unknown) =>
  POST(new Request('http://localhost/api/auth/forgot-password', { method: 'POST', body: JSON.stringify(body) }));

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkRateLimit.mockResolvedValue({ success: true });
    generateToken.mockResolvedValue('raw-token');
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('returns 429 when rate limited, before touching the database', async () => {
    checkRateLimit.mockResolvedValue({ success: false, retryAfter: 60 });
    expect((await post({ email: 'a@b.com' })).status).toBe(429);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('requires an email', async () => {
    expect((await post({})).status).toBe(400);
  });

  it('sends a reset link to a password account', async () => {
    findUnique.mockResolvedValue({ password: 'hash' });

    const res = await post({ email: 'user@example.com' });

    expect(res.status).toBe(200);
    expect(generateToken).toHaveBeenCalledWith('user@example.com');
    expect(sendEmail).toHaveBeenCalledWith('user@example.com', 'raw-token');
  });

  it('answers identically for an unknown address and sends nothing', async () => {
    findUnique.mockResolvedValue({ password: 'hash' });
    const known = await (await post({ email: 'user@example.com' })).json();
    sendEmail.mockClear();
    findUnique.mockResolvedValue(null);

    const res = await post({ email: 'nobody@example.com' });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(known);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('answers the same and sends nothing for an OAuth-only account', async () => {
    findUnique.mockResolvedValue({ password: null });

    const res = await post({ email: 'oauth@example.com' });

    expect(res.status).toBe(200);
    expect(generateToken).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('answers the same for the demo account and never looks it up', async () => {
    const res = await post({ email: 'Demo@BitBin.dev' });

    expect(res.status).toBe(200);
    expect(findUnique).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('returns a generic 500 when sending fails', async () => {
    findUnique.mockResolvedValue({ password: 'hash' });
    sendEmail.mockRejectedValue(new Error('resend 403 key re_secret'));

    const res = await post({ email: 'user@example.com' });

    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('re_secret');
  });
});

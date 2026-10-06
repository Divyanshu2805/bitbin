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
  getClientIP: vi.fn().mockResolvedValue('203.0.113.7'),
  rateLimitResponse: () => new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 }),
}));
vi.mock('@/lib/turnstile', () => ({ isTurnstileEnabled: vi.fn().mockReturnValue(false), verifyTurnstile: vi.fn() }));

import { POST } from './route';
import { isTurnstileEnabled, verifyTurnstile } from '@/lib/turnstile';

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

  it('limits reset mail per address, whatever the IP', async () => {
    findUnique.mockResolvedValue({ password: 'hash' });
    await post({ email: 'Victim@B.com' });
    expect(checkRateLimit).toHaveBeenCalledWith('forgotPasswordEmail', 'victim@b.com', { ignoreIp: true });

    checkRateLimit.mockImplementation(async (type: string) =>
      type === 'forgotPasswordEmail' ? { success: false, retryAfter: 900 } : { success: true }
    );
    sendEmail.mockClear();
    const res = await post({ email: 'victim@b.com' });

    expect(res.status).toBe(429);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('refuses a request whose Turnstile token fails, when configured', async () => {
    vi.mocked(isTurnstileEnabled).mockReturnValue(true);
    vi.mocked(verifyTurnstile).mockResolvedValue({ ok: false, message: 'Please complete the verification check and try again.' });

    const res = await post({ email: 'user@example.com', turnstileToken: 'bad' });

    expect(res.status).toBe(400);
    expect(findUnique).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
    vi.mocked(isTurnstileEnabled).mockReturnValue(false);
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

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { findUnique, create, update, del, sendEmail, makeToken } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  del: vi.fn(),
  sendEmail: vi.fn(),
  makeToken: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique, create, update, delete: del } } }));
vi.mock('@/lib/email', () => ({ sendVerificationEmail: sendEmail }));
vi.mock('@/lib/tokens', () => ({ generateVerificationToken: makeToken }));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(() => new Response(JSON.stringify({ error: 'Too many attempts' }), { status: 429 })),
}));
vi.mock('bcryptjs', () => ({ default: { hash: vi.fn().mockResolvedValue('hashed') } }));

import { POST } from './route';
import { checkRateLimit } from '@/lib/rate-limit';

const post = (body: Record<string, unknown>) =>
  POST(
    new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Ada', password: 'password123', confirmPassword: 'password123', ...body }),
    })
  );

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('SKIP_EMAIL_VERIFICATION', 'false');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    makeToken.mockResolvedValue('token');
    create.mockResolvedValue({ id: 'u1' });
  });

  it('creates an account and sends the verification email', async () => {
    findUnique.mockResolvedValue(null);
    const res = await post({ email: 'a@b.com' });

    expect(res.status).toBe(201);
    expect(create).toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledWith('a@b.com', 'token');
  });

  it('answers a verified address exactly like a new one, and sends nothing', async () => {
    findUnique.mockResolvedValueOnce(null);
    const fresh = await (await post({ email: 'new@b.com' })).json();

    vi.clearAllMocks();
    findUnique.mockResolvedValue({ id: 'u1', emailVerified: new Date(), password: 'x' });
    const taken = await post({ email: 'a@b.com' });

    expect(taken.status).toBe(201);
    expect(await taken.json()).toEqual(fresh);
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('leaves a GitHub-only account alone', async () => {
    findUnique.mockResolvedValue({ id: 'u1', emailVerified: new Date(), password: null });
    const res = await post({ email: 'a@b.com' });

    expect(res.status).toBe(201);
    expect(update).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('replaces the password on an unverified account and resends the email', async () => {
    findUnique.mockResolvedValue({ id: 'u1', emailVerified: null, password: 'attacker-hash' });
    const res = await post({ email: 'a@b.com' });

    expect(res.status).toBe(201);
    expect(update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { name: 'Ada', password: 'hashed' },
    });
    expect(sendEmail).toHaveBeenCalledWith('a@b.com', 'token');
  });

  it('deletes the new account when the email cannot be sent', async () => {
    findUnique.mockResolvedValue(null);
    sendEmail.mockRejectedValue(new Error('resend down'));
    del.mockResolvedValue({});
    const res = await post({ email: 'a@b.com' });

    expect(res.status).toBe(500);
    expect(del).toHaveBeenCalledWith({ where: { id: 'u1' } });
  });

  it('limits mail to one address by the address alone, whatever the IP', async () => {
    findUnique.mockResolvedValue(null);
    await post({ email: 'Victim@B.com' });

    expect(checkRateLimit).toHaveBeenCalledWith('registerEmail', 'victim@b.com', { ignoreIp: true });
  });

  it('refuses with 429 and sends nothing once an address has had its mails', async () => {
    vi.mocked(checkRateLimit).mockImplementation(async (type) =>
      type === 'registerEmail' ? { success: false, remaining: 0, reset: 0, retryAfter: 600 } : { success: true, remaining: 1, reset: 0, retryAfter: 0 }
    );

    const res = await post({ email: 'victim@b.com' });

    expect(res.status).toBe(429);
    expect(findUnique).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
    vi.mocked(checkRateLimit).mockResolvedValue({ success: true, remaining: 1, reset: 0, retryAfter: 0 });
  });

  it('rejects a bad email, a long password and a long name', async () => {
    expect((await post({ email: 'nope' })).status).toBe(400);
    expect((await post({ email: 'a@b.com', password: 'x'.repeat(129), confirmPassword: 'x'.repeat(129) })).status).toBe(400);
    expect((await post({ email: 'a@b.com', name: 'n'.repeat(51) })).status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });
});

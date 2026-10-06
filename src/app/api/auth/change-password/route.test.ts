import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Session } from 'next-auth';

vi.mock('@/auth', () => ({ auth: vi.fn() }));
const { findUnique, update, compare, hash, checkRateLimit } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  compare: vi.fn(),
  hash: vi.fn(),
  checkRateLimit: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique, update } } }));
vi.mock('bcryptjs', () => ({ default: { compare, hash } }));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit,
  rateLimitResponse: () => new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 }),
}));

import { POST } from './route';
import { auth } from '@/auth';

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;
const session = (email = 'user@example.com'): Session => ({
  user: { id: 'user-1', email, isPro: false },
  expires: new Date().toISOString(),
});
const post = (body: unknown = { currentPassword: 'password123', newPassword: 'another-password' }) =>
  POST(
    new Request('http://localhost/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  );

describe('POST /api/auth/change-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkRateLimit.mockResolvedValue({ success: true });
    findUnique.mockResolvedValue({ id: 'user-1', password: 'stored-hash' });
    compare.mockResolvedValue(true);
    hash.mockResolvedValue('new-hash');
  });

  it('returns 401 without a session', async () => {
    mockAuth.mockResolvedValue(null);
    expect((await post()).status).toBe(401);
  });

  it("won't change the public demo account's password", async () => {
    mockAuth.mockResolvedValue(session('demo@bitbin.dev'));

    const res = await post();

    expect(res.status).toBe(403);
    expect((await res.json()).error).toContain('demo account');
    expect(findUnique).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('returns 429 when rate limited, before reading the password', async () => {
    mockAuth.mockResolvedValue(session());
    checkRateLimit.mockResolvedValue({ success: false, retryAfter: 60 });

    expect((await post()).status).toBe(429);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it.each([
    ['a missing current password', { newPassword: 'another-password' }],
    ['a missing new password', { currentPassword: 'password123' }],
    ['non-string values', { currentPassword: 1, newPassword: 2 }],
  ])('rejects %s with 400', async (_name, body) => {
    mockAuth.mockResolvedValue(session());
    expect((await post(body)).status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects a new password shorter than 8 characters', async () => {
    mockAuth.mockResolvedValue(session());
    const res = await post({ currentPassword: 'password123', newPassword: 'short' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('at least 8');
  });

  it('rejects a new password longer than the cap', async () => {
    mockAuth.mockResolvedValue(session());
    const res = await post({ currentPassword: 'password123', newPassword: 'x'.repeat(129) });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('at most');
  });

  it('refuses an OAuth-only account (no stored password)', async () => {
    mockAuth.mockResolvedValue(session());
    findUnique.mockResolvedValue({ id: 'user-1', password: null });

    const res = await post();

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('OAuth');
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects a wrong current password and changes nothing', async () => {
    mockAuth.mockResolvedValue(session());
    compare.mockResolvedValue(false);

    const res = await post();

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('incorrect');
    expect(update).not.toHaveBeenCalled();
  });

  it('stores a cost-12 hash and bumps sessionVersion on success', async () => {
    mockAuth.mockResolvedValue(session());

    const res = await post();

    expect(res.status).toBe(200);
    expect(hash).toHaveBeenCalledWith('another-password', 12);
    expect(update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { password: 'new-hash', sessionVersion: { increment: 1 } },
    });
  });

  it('looks the user up by the session id only', async () => {
    mockAuth.mockResolvedValue(session());
    await post({ currentPassword: 'password123', newPassword: 'another-password', id: 'someone-else' });
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'user-1' } }));
  });

  it('returns a generic 500 when the database fails', async () => {
    mockAuth.mockResolvedValue(session());
    findUnique.mockRejectedValue(new Error('connection refused at 10.0.0.1'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await post();

    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('10.0.0.1');
  });
});

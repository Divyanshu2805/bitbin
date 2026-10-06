import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Session } from 'next-auth';

vi.mock('@/auth', () => ({ auth: vi.fn() }));
const { findUnique, update } = vi.hoisted(() => ({ findUnique: vi.fn(), update: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique, update } } }));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

import { POST } from './route';
import { auth } from '@/auth';

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;
const post = () =>
  POST(
    new Request('http://localhost/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword: 'password123', newPassword: 'another-password' }),
    })
  );

describe('POST /api/auth/change-password', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without a session', async () => {
    mockAuth.mockResolvedValue(null);
    expect((await post()).status).toBe(401);
  });

  it("won't change the public demo account's password", async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'demo-1', email: 'demo@bitbin.dev', isPro: false },
      expires: new Date().toISOString(),
    });

    const res = await post();

    expect(res.status).toBe(403);
    expect((await res.json()).error).toContain('demo account');
    expect(findUnique).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });
});

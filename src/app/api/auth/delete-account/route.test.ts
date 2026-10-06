import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Session } from 'next-auth';

vi.mock('@/auth', () => ({ auth: vi.fn() }));
const { findUnique, del } = vi.hoisted(() => ({ findUnique: vi.fn(), del: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique, delete: del } } }));
vi.mock('@/lib/stripe', () => ({ stripe: { subscriptions: { cancel: vi.fn() } } }));
vi.mock('@/lib/r2', () => ({ deleteUserFilesFromR2: vi.fn() }));

import { DELETE } from './route';
import { auth } from '@/auth';

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;
const call = () => DELETE(new Request('http://localhost/api/auth/delete-account', { method: 'DELETE' }));

describe('DELETE /api/auth/delete-account', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without a session', async () => {
    mockAuth.mockResolvedValue(null);
    expect((await call()).status).toBe(401);
  });

  it("won't delete the public demo account", async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'demo-1', email: 'demo@bitbin.dev', isPro: false },
      expires: new Date().toISOString(),
    });

    const res = await call();

    expect(res.status).toBe(403);
    expect(findUnique).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });
});

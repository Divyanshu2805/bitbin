import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Session } from 'next-auth';

vi.mock('@/auth', () => ({ auth: vi.fn() }));
const { findUnique, del, compare, cancel, deleteFiles } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  del: vi.fn(),
  compare: vi.fn(),
  cancel: vi.fn(),
  deleteFiles: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique, delete: del } } }));
vi.mock('bcryptjs', () => ({ default: { compare } }));
vi.mock('@/lib/stripe', () => ({ stripe: { subscriptions: { cancel } } }));
vi.mock('@/lib/r2', () => ({ deleteUserFilesFromR2: deleteFiles }));

import { DELETE } from './route';
import { auth } from '@/auth';

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;
const session = (email = 'user@example.com'): Session => ({
  user: { id: 'user-1', email, isPro: false },
  expires: new Date().toISOString(),
});
const call = (body?: unknown) =>
  DELETE(
    new Request('http://localhost/api/auth/delete-account', {
      method: 'DELETE',
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  );

describe('DELETE /api/auth/delete-account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findUnique.mockResolvedValue({ password: 'stored-hash', stripeSubscriptionId: null });
    compare.mockResolvedValue(true);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('returns 401 without a session', async () => {
    mockAuth.mockResolvedValue(null);
    expect((await call()).status).toBe(401);
  });

  it("won't delete the public demo account", async () => {
    mockAuth.mockResolvedValue(session('demo@bitbin.dev'));

    const res = await call();

    expect(res.status).toBe(403);
    expect(findUnique).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });

  it('returns 404 when the account no longer exists', async () => {
    mockAuth.mockResolvedValue(session());
    findUnique.mockResolvedValue(null);
    expect((await call({ password: 'x' })).status).toBe(404);
    expect(del).not.toHaveBeenCalled();
  });

  it('requires the password for a password account', async () => {
    mockAuth.mockResolvedValue(session());

    const res = await call();

    expect(res.status).toBe(400);
    expect(del).not.toHaveBeenCalled();
  });

  it('rejects a wrong password and deletes nothing', async () => {
    mockAuth.mockResolvedValue(session());
    compare.mockResolvedValue(false);

    const res = await call({ password: 'wrong' });

    expect(res.status).toBe(400);
    expect(deleteFiles).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });

  it('deletes files then the user, scoped to the session id', async () => {
    mockAuth.mockResolvedValue(session());

    const res = await call({ password: 'password123' });

    expect(res.status).toBe(200);
    expect(deleteFiles).toHaveBeenCalledWith('user-1');
    expect(del).toHaveBeenCalledWith({ where: { id: 'user-1' } });
  });

  it('lets an OAuth-only account delete without a password', async () => {
    mockAuth.mockResolvedValue(session());
    findUnique.mockResolvedValue({ password: null, stripeSubscriptionId: null });

    expect((await call()).status).toBe(200);
    expect(compare).not.toHaveBeenCalled();
    expect(del).toHaveBeenCalled();
  });

  it('cancels the subscription before deleting', async () => {
    mockAuth.mockResolvedValue(session());
    findUnique.mockResolvedValue({ password: 'stored-hash', stripeSubscriptionId: 'sub_1' });
    cancel.mockResolvedValue({});

    expect((await call({ password: 'password123' })).status).toBe(200);
    expect(cancel).toHaveBeenCalledWith('sub_1');
    expect(cancel.mock.invocationCallOrder[0]).toBeLessThan(del.mock.invocationCallOrder[0]);
  });

  it('keeps the account when the subscription cannot be cancelled', async () => {
    mockAuth.mockResolvedValue(session());
    findUnique.mockResolvedValue({ password: 'stored-hash', stripeSubscriptionId: 'sub_1' });
    cancel.mockRejectedValue(Object.assign(new Error('stripe down'), { code: 'api_error' }));

    const res = await call({ password: 'password123' });

    expect(res.status).toBe(500);
    expect(del).not.toHaveBeenCalled();
  });

  it('carries on when Stripe no longer has the subscription', async () => {
    mockAuth.mockResolvedValue(session());
    findUnique.mockResolvedValue({ password: 'stored-hash', stripeSubscriptionId: 'sub_1' });
    cancel.mockRejectedValue(Object.assign(new Error('gone'), { code: 'resource_missing' }));

    expect((await call({ password: 'password123' })).status).toBe(200);
    expect(del).toHaveBeenCalled();
  });

  it('still deletes the account when removing files from storage fails', async () => {
    mockAuth.mockResolvedValue(session());
    deleteFiles.mockRejectedValue(new Error('r2 down'));

    expect((await call({ password: 'password123' })).status).toBe(200);
    expect(del).toHaveBeenCalled();
  });
});

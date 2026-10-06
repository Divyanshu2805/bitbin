import { describe, it, expect, vi, beforeEach } from 'vitest';

const { findUnique, transaction, resetContent, userUpdate } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  transaction: vi.fn(),
  resetContent: vi.fn(),
  userUpdate: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique }, $transaction: transaction } }));
vi.mock('../../../../../prisma/demo-content', () => ({ resetDemoContent: resetContent }));

import { GET } from './route';

const call = (authorization?: string) =>
  GET(new Request('http://localhost/api/cron/reset-demo', { headers: authorization ? { authorization } : {} }));

describe('GET /api/cron/reset-demo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('CRON_SECRET', 'top-secret-value');
    findUnique.mockResolvedValue({ id: 'demo-1' });
    resetContent.mockResolvedValue(undefined);
    userUpdate.mockResolvedValue({});
    transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn({ user: { update: userUpdate } }));
  });

  it('refuses everyone when CRON_SECRET is not set', async () => {
    vi.stubEnv('CRON_SECRET', '');
    const res = await call('Bearer ');

    expect(res.status).toBe(500);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects a missing, wrong or look-alike token', async () => {
    for (const header of [undefined, 'Bearer wrong', 'top-secret-value', 'bearer top-secret-value']) {
      expect((await call(header)).status).toBe(401);
    }
    expect(findUnique).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it('resets the demo account when the token is right', async () => {
    const res = await call('Bearer top-secret-value');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(findUnique).toHaveBeenCalledWith({ where: { email: 'demo@bitbin.dev' }, select: { id: true } });
    expect(resetContent).toHaveBeenCalledWith(expect.anything(), 'demo-1');
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 'demo-1' },
      data: { name: 'Demo User', isPro: false, stripeCustomerId: null, stripeSubscriptionId: null },
    });
  });

  it('does nothing when there is no demo account', async () => {
    findUnique.mockResolvedValue(null);
    const res = await call('Bearer top-secret-value');

    expect(await res.json()).toEqual({ success: true, skipped: true });
    expect(transaction).not.toHaveBeenCalled();
  });

  it('answers 500 without leaking the error when the reset fails', async () => {
    resetContent.mockRejectedValue(new Error('secret db detail'));
    const res = await call('Bearer top-secret-value');

    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('secret db detail');
  });
});

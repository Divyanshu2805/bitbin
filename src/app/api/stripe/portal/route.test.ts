import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Session } from 'next-auth';

vi.mock('@/auth', () => ({ auth: vi.fn() }));
const { findUnique, portalCreate, mockCheckRateLimit } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  portalCreate: vi.fn(),
  mockCheckRateLimit: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique } } }));
vi.mock('@/lib/stripe', () => ({ stripe: { billingPortal: { sessions: { create: portalCreate } } } }));
vi.mock('@/lib/rate-limit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/rate-limit')>()),
  checkRateLimit: mockCheckRateLimit,
}));

import { POST } from './route';
import { auth } from '@/auth';

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;

describe('POST /api/stripe/portal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 10, reset: 0, retryAfter: 0 });
    mockAuth.mockResolvedValue({ user: { id: 'user-1', isPro: true }, expires: new Date().toISOString() });
    findUnique.mockResolvedValue({ stripeCustomerId: 'cus_1' });
    portalCreate.mockResolvedValue({ url: 'https://billing.stripe.test/session' });
  });

  it('returns 401 without a session', async () => {
    mockAuth.mockResolvedValue(null);
    expect((await POST()).status).toBe(401);
  });

  it('opens the portal for the signed-in user\'s own customer', async () => {
    const res = await POST();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: 'https://billing.stripe.test/session' });
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' }, select: { stripeCustomerId: true } });
    expect(portalCreate).toHaveBeenCalledWith(expect.objectContaining({ customer: 'cus_1' }));
  });

  it('answers 400 when the user has no billing account', async () => {
    findUnique.mockResolvedValue({ stripeCustomerId: null });
    expect((await POST()).status).toBe(400);
    expect(portalCreate).not.toHaveBeenCalled();
  });

  it('answers 429 and calls Stripe not at all when over the limit', async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ success: false, remaining: 0, reset: 0, retryAfter: 180 });

    const res = await POST();

    expect(res.status).toBe(429);
    expect(mockCheckRateLimit).toHaveBeenCalledWith('portal', 'user-1');
    expect(portalCreate).not.toHaveBeenCalled();
  });

  it('answers 500 without leaking the Stripe error', async () => {
    portalCreate.mockRejectedValue(new Error('stripe secret detail'));
    const res = await POST();

    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('secret');
  });
});

describe('POST /api/stripe/portal from another site', () => {
  beforeEach(() => vi.clearAllMocks());

  it('is refused before a portal session is created', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', isPro: true }, expires: '' } as Session);

    const res = await POST(
      new Request('http://localhost/api/stripe/portal', { method: 'POST', headers: { origin: 'https://evil.example' } })
    );

    expect(res.status).toBe(403);
    expect(portalCreate).not.toHaveBeenCalled();
  });
});

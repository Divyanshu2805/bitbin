import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

const { mockCheckRateLimit } = vi.hoisted(() => ({
  mockCheckRateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 10, reset: 0, retryAfter: 0 }),
}));
vi.mock('@/lib/rate-limit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/rate-limit')>()),
  checkRateLimit: mockCheckRateLimit,
}));
const overLimit = { success: false, remaining: 0, reset: 0, retryAfter: 180 };
import type { Session } from 'next-auth';

// The route reads its price ids when it is first imported, so set them before that
vi.hoisted(() => {
  process.env.STRIPE_PRICE_ID_MONTHLY = 'price_monthly';
});

vi.mock('@/auth', () => ({ auth: vi.fn() }));
const { findUnique, customersCreate, sessionsCreate } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  customersCreate: vi.fn(),
  sessionsCreate: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique, update: vi.fn() } } }));
vi.mock('@/lib/stripe', () => ({
  STRIPE_APP_TAG: 'bitbin',
  stripe: { customers: { create: customersCreate }, checkout: { sessions: { create: sessionsCreate } } },
}));

import { POST } from './route';
import { auth } from '@/auth';

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;
const post = () =>
  POST(new Request('http://localhost/api/stripe/checkout', { method: 'POST', body: JSON.stringify({ plan: 'monthly' }) }));

describe('POST /api/stripe/checkout', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without a session', async () => {
    mockAuth.mockResolvedValue(null);
    expect((await post()).status).toBe(401);
  });

  it("won't start a subscription for the public demo account", async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'demo-1', email: 'demo@bitbin.dev', isPro: false },
      expires: new Date().toISOString(),
    });

    const res = await post();

    expect(res.status).toBe(403);
    expect(customersCreate).not.toHaveBeenCalled();
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it('refuses a user who is already Pro, so they are not billed twice', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'a@b.dev', isPro: true },
      expires: new Date().toISOString(),
    });
    findUnique.mockResolvedValue({ stripeCustomerId: 'cus_1', email: 'a@b.dev', isPro: true });

    expect((await post()).status).toBe(409);
    expect(sessionsCreate).not.toHaveBeenCalled();
  });
});

describe('POST /api/stripe/checkout rate limit', () => {
  it('answers 429 and creates nothing in Stripe when over the limit', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'a@b.dev', isPro: false },
      expires: new Date().toISOString(),
    });
    mockCheckRateLimit.mockResolvedValueOnce(overLimit);

    const res = await post();

    expect(res.status).toBe(429);
    expect(mockCheckRateLimit).toHaveBeenCalledWith('checkout', 'user-1');
    expect(customersCreate).not.toHaveBeenCalled();
    expect(sessionsCreate).not.toHaveBeenCalled();
  });
});

describe('POST /api/stripe/checkout from another site', () => {
  beforeEach(() => vi.clearAllMocks());

  it('is refused before a Stripe session is created', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', email: 'u@example.com', isPro: false }, expires: '' } as Session);

    const res = await POST(
      new Request('http://localhost/api/stripe/checkout', {
        method: 'POST',
        headers: { 'sec-fetch-site': 'cross-site' },
        body: JSON.stringify({ plan: 'monthly' }),
      })
    );

    expect(res.status).toBe(403);
    expect(sessionsCreate).not.toHaveBeenCalled();
  });
});

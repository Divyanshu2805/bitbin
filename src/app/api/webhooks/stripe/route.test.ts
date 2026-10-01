import { describe, it, expect, vi, beforeEach } from 'vitest';

const { constructEvent, listSubscriptions, updateMany } = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  listSubscriptions: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock('@/lib/stripe', () => ({
  STRIPE_APP_TAG: 'bitbin',
  stripe: {
    webhooks: { constructEvent },
    subscriptions: { list: listSubscriptions },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma: { user: { updateMany } } }));

import { POST } from './route';

function send(event: unknown, signature: string | null = 'sig') {
  constructEvent.mockReturnValue(event);
  return POST(
    new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: signature ? { 'stripe-signature': signature } : {},
      body: '{}',
    })
  );
}

const sub = (status: string, id = 'sub_1') => ({ id, status });

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateMany.mockResolvedValue({ count: 1 });
  });

  it('rejects a request without a signature', async () => {
    const res = await send({}, null);
    expect(res.status).toBe(400);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('rejects a bad signature', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    constructEvent.mockImplementation(() => {
      throw new Error('bad signature');
    });
    const res = await POST(
      new Request('http://localhost/x', { method: 'POST', headers: { 'stripe-signature': 'bad' }, body: '{}' })
    );
    expect(res.status).toBe(400);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('ignores checkouts that are not tagged for BitBin', async () => {
    const res = await send({
      type: 'checkout.session.completed',
      data: { object: { metadata: { app: 'other', userId: 'u1' }, customer: 'cus_1' } },
    });
    expect(res.status).toBe(200);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('grants Pro after checkout when the subscription is active', async () => {
    listSubscriptions.mockResolvedValue({ data: [sub('active')] });
    await send({
      type: 'checkout.session.completed',
      data: { object: { metadata: { app: 'bitbin', userId: 'u1' }, customer: 'cus_1' } },
    });

    expect(updateMany).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { stripeCustomerId: 'cus_1' } });
    expect(updateMany).toHaveBeenCalledWith({
      where: { stripeCustomerId: 'cus_1' },
      data: { isPro: true, stripeSubscriptionId: 'sub_1' },
    });
  });

  it('a late invoice.paid cannot re-grant Pro after the subscription ended', async () => {
    listSubscriptions.mockResolvedValue({ data: [sub('canceled')] });
    const res = await send({ type: 'invoice.paid', data: { object: { customer: 'cus_1' } } });

    expect(res.status).toBe(200);
    expect(updateMany).toHaveBeenCalledWith({
      where: { stripeCustomerId: 'cus_1' },
      data: { isPro: false, stripeSubscriptionId: null },
    });
  });

  it('keeps Pro when one of several subscriptions is still active', async () => {
    listSubscriptions.mockResolvedValue({ data: [sub('canceled', 'sub_old'), sub('trialing', 'sub_new')] });
    await send({ type: 'customer.subscription.deleted', data: { object: { customer: 'cus_1' } } });

    expect(updateMany).toHaveBeenCalledWith({
      where: { stripeCustomerId: 'cus_1' },
      data: { isPro: true, stripeSubscriptionId: 'sub_new' },
    });
  });

  it('answers 500 so Stripe retries when the plan cannot be read', async () => {
    listSubscriptions.mockRejectedValue(new Error('stripe down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await send({ type: 'customer.subscription.updated', data: { object: { customer: 'cus_1' } } });
    expect(res.status).toBe(500);
  });
});

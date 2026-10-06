import { describe, it, expect, vi, beforeEach } from 'vitest';

const { findUnique, update, consume } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  consume: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique, update } } }));
vi.mock('@/lib/tokens', () => ({ consumePasswordResetToken: consume }));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));
vi.mock('bcryptjs', () => ({ default: { hash: vi.fn().mockResolvedValue('new-hash') } }));

import { POST } from './route';

const post = (body: Record<string, unknown>) =>
  POST(
    new Request('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: 'raw-token', password: 'new-password-1', confirmPassword: 'new-password-1', ...body }),
    })
  );

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    consume.mockResolvedValue({ email: 'a@b.dev' });
    findUnique.mockResolvedValue({ id: 'user-1' });
    update.mockResolvedValue({});
  });

  it('sets the new password, ends every session and uses the link up', async () => {
    const res = await post({});

    expect(res.status).toBe(200);
    expect(consume).toHaveBeenCalledWith('raw-token');
    expect(update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { password: 'new-hash', sessionVersion: { increment: 1 } },
    });
  });

  it('rejects an invalid, expired or already used link without changing anything', async () => {
    consume.mockResolvedValue(null);
    const res = await post({});

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('invalid, expired or already used');
    expect(update).not.toHaveBeenCalled();
  });

  it('checks the new password before it spends the link, so a typo does not burn it', async () => {
    for (const body of [
      { confirmPassword: 'different' },
      { password: 'short', confirmPassword: 'short' },
      { password: 'x'.repeat(129), confirmPassword: 'x'.repeat(129) },
      { token: '' },
      { token: { $ne: '' } },
    ]) {
      expect((await post(body)).status).toBe(400);
    }
    expect(consume).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('answers 404 when the account behind the link is gone', async () => {
    findUnique.mockResolvedValue(null);
    expect((await post({})).status).toBe(404);
    expect(update).not.toHaveBeenCalled();
  });
});

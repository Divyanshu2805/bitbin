import { describe, it, expect, vi, beforeEach } from 'vitest';

const { findUnique, update, consume } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  consume: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique, update } } }));
vi.mock('@/lib/tokens', () => ({ consumeVerificationToken: consume }));

import { GET } from './route';

const get = (query = '?token=raw-token') => GET(new Request(`http://localhost/api/auth/verify${query}`));

describe('GET /api/auth/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    consume.mockResolvedValue({ email: 'a@b.dev' });
    findUnique.mockResolvedValue({ id: 'user-1', emailVerified: null });
    update.mockResolvedValue({});
  });

  it('marks the email verified', async () => {
    const res = await get();

    expect(res.status).toBe(200);
    expect(consume).toHaveBeenCalledWith('raw-token');
    expect(findUnique).toHaveBeenCalledWith({ where: { email: 'a@b.dev' } });
    expect(update).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { emailVerified: expect.any(Date) } });
  });

  it('answers 400 without a token', async () => {
    expect((await get('')).status).toBe(400);
    expect(consume).not.toHaveBeenCalled();
  });

  it('rejects an invalid, expired or already used link', async () => {
    consume.mockResolvedValue(null);
    const res = await get();

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('invalid, expired or already used');
    expect(update).not.toHaveBeenCalled();
  });

  it('says so when the account was already verified, without changing it', async () => {
    findUnique.mockResolvedValue({ id: 'user-1', emailVerified: new Date() });
    const res = await get();

    expect(res.status).toBe(200);
    expect((await res.json()).message).toBe('Email already verified');
    expect(update).not.toHaveBeenCalled();
  });

  it('answers 404 when the account is gone', async () => {
    findUnique.mockResolvedValue(null);
    expect((await get()).status).toBe(404);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isTurnstileEnabled, verifyTurnstile } from './turnstile';

const fetchMock = vi.fn();

describe('isTurnstileEnabled', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('is off until both keys are set', () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', '');
    vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', '');
    expect(isTurnstileEnabled()).toBe(false);

    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret');
    expect(isTurnstileEnabled()).toBe(false);

    vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'site');
    expect(isTurnstileEnabled()).toBe(true);
  });

  it('treats .env.example placeholders as unset', () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'YOUR_TURNSTILE_SECRET_KEY');
    vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'YOUR_TURNSTILE_SITE_KEY');
    expect(isTurnstileEnabled()).toBe(false);
  });
});

describe('verifyTurnstile', () => {
  beforeEach(() => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each([[undefined], [''], [42], ['x'.repeat(3000)]])('rejects a missing or malformed token (%s) without calling Cloudflare', async (token) => {
    expect((await verifyTurnstile(token)).ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('accepts a token Cloudflare approves, sending the secret and the caller IP', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });

    expect(await verifyTurnstile('good-token', '203.0.113.7')).toEqual({ ok: true });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    const body = init.body as URLSearchParams;
    expect(body.get('secret')).toBe('secret');
    expect(body.get('response')).toBe('good-token');
    expect(body.get('remoteip')).toBe('203.0.113.7');
  });

  it('rejects a token Cloudflare refuses', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: false }) });
    expect((await verifyTurnstile('bad-token')).ok).toBe(false);
  });

  it('fails closed when Cloudflare errors or is unreachable', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    expect((await verifyTurnstile('t')).ok).toBe(false);

    fetchMock.mockRejectedValueOnce(new Error('network down'));
    expect((await verifyTurnstile('t')).ok).toBe(false);
  });
});

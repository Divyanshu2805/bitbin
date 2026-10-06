import { describe, it, expect } from 'vitest';
import { rejectCrossSite } from './same-origin';

const request = (headers: Record<string, string> = {}, url = 'https://bitbin.example/api/auth/change-password') =>
  new Request(url, { method: 'POST', headers });

describe('rejectCrossSite', () => {
  it('lets a request through when the browser says it came from this site', async () => {
    expect(rejectCrossSite(request({ 'sec-fetch-site': 'same-origin' }))).toBeNull();
    expect(rejectCrossSite(request({ 'sec-fetch-site': 'none' }))).toBeNull();
    expect(rejectCrossSite(request({ origin: 'https://bitbin.example' }))).toBeNull();
  });

  it('lets through a client that sends neither header (curl, a server)', () => {
    expect(rejectCrossSite(request())).toBeNull();
  });

  it.each(['cross-site', 'same-site'])('refuses Sec-Fetch-Site: %s', async (site) => {
    const res = rejectCrossSite(request({ 'sec-fetch-site': site }));
    expect(res?.status).toBe(403);
    expect(await res?.json()).toEqual({ error: 'Cross-site request blocked' });
  });

  it('refuses another origin, a sibling subdomain and a null origin', () => {
    expect(rejectCrossSite(request({ origin: 'https://evil.example' }))?.status).toBe(403);
    expect(rejectCrossSite(request({ origin: 'https://other.example' }))?.status).toBe(403);
    expect(rejectCrossSite(request({ origin: 'null' }))?.status).toBe(403);
  });

  it('compares hosts, so a proxy that rewrites the scheme or forwards the host still works', () => {
    expect(
      rejectCrossSite(
        request({ origin: 'https://bitbin.example', 'x-forwarded-host': 'bitbin.example' }, 'http://internal:3000/api/x')
      )
    ).toBeNull();
    expect(rejectCrossSite(request({ origin: 'http://localhost:3000' }, 'http://localhost:3000/api/x'))).toBeNull();
  });

  it('refuses when Sec-Fetch-Site says cross-site even if the Origin looks right', () => {
    expect(rejectCrossSite(request({ 'sec-fetch-site': 'cross-site', origin: 'https://bitbin.example' }))?.status).toBe(403);
  });
});

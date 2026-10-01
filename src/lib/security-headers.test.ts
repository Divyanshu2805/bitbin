import { describe, it, expect } from 'vitest';
import nextConfig from '../../next.config';

async function headersFor(source: string) {
  const rules = (await nextConfig.headers?.()) ?? [];
  const rule = rules.find((r) => r.source === source);
  return Object.fromEntries((rule?.headers ?? []).map((h) => [h.key.toLowerCase(), h.value]));
}

describe('security headers', () => {
  it('apply to every route', async () => {
    const headers = await headersFor('/:path*');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['strict-transport-security']).toContain('max-age=');
    expect(headers['referrer-policy']).toBeDefined();
  });

  it('let the app frame its own pages (the PDF preview is an iframe of /api/download) but no other site', async () => {
    const headers = await headersFor('/:path*');
    expect(headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(headers['content-security-policy']).toContain("frame-ancestors 'self'");
    expect(headers['content-security-policy']).not.toContain("frame-ancestors 'none'");
  });
});

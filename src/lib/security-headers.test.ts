import { describe, it, expect } from 'vitest';
import nextConfig from '../../next.config';

async function headersFor(source: string) {
  const rules = (await nextConfig.headers?.()) ?? [];
  const rule = rules.find((r) => r.source === source);
  return Object.fromEntries((rule?.headers ?? []).map((h) => [h.key.toLowerCase(), h.value]));
}

const PAGES = '/((?!api/download/).*)';
const DOWNLOADS = '/api/download/:path*';

describe('security headers', () => {
  it('apply to every route', async () => {
    const headers = await headersFor('/:path*');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['strict-transport-security']).toContain('max-age=');
    expect(headers['referrer-policy']).toBeDefined();
  });

  it('let the app frame its own pages (the PDF preview is an iframe of /api/download) but no other site', async () => {
    expect((await headersFor('/:path*'))['x-frame-options']).toBe('SAMEORIGIN');
    for (const source of [PAGES, DOWNLOADS]) {
      const csp = (await headersFor(source))['content-security-policy'];
      expect(csp).toContain("frame-ancestors 'self'");
      expect(csp).not.toContain("frame-ancestors 'none'");
    }
  });

  it('give pages the full policy, and downloads a minimal one so previews keep working', async () => {
    const pages = (await headersFor(PAGES))['content-security-policy'];
    const downloads = (await headersFor(DOWNLOADS))['content-security-policy'];

    expect(pages).toContain("default-src 'self'");
    expect(pages).toContain('script-src');
    expect(downloads).not.toContain('default-src');
    expect(downloads).toContain("object-src 'none'");
  });

  it('never send two policies for one path: the page rule leaves the download path out', async () => {
    const source = new RegExp(`^${PAGES}$`);
    // path-to-regexp style groups: the negative lookahead is what keeps /api/download/* out
    expect(source.test('/api/download/user-1/file.pdf')).toBe(false);
    expect(source.test('/dashboard')).toBe(true);
    expect(source.test('/api/export')).toBe(true);
  });
});

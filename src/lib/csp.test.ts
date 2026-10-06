import { describe, it, expect } from 'vitest';
import { buildContentSecurityPolicy } from './csp';

const directive = (policy: string, name: string) =>
  policy.split('; ').find((d) => d.startsWith(`${name} `) || d === name) ?? '';

describe('buildContentSecurityPolicy (production)', () => {
  const policy = buildContentSecurityPolicy();

  it('allows only this site by default', () => {
    expect(directive(policy, 'default-src')).toBe("default-src 'self'");
  });

  it('allows no third-party script, and no eval', () => {
    const script = directive(policy, 'script-src');
    expect(script).toBe("script-src 'self' 'unsafe-inline'");
    expect(script).not.toContain('unsafe-eval');
    expect(script).not.toContain('http');
  });

  it('cannot send data anywhere but this site, or be framed by another site', () => {
    expect(directive(policy, 'connect-src')).toBe("connect-src 'self'");
    expect(directive(policy, 'frame-ancestors')).toBe("frame-ancestors 'self'");
    expect(directive(policy, 'object-src')).toBe("object-src 'none'");
    expect(directive(policy, 'base-uri')).toBe("base-uri 'self'");
  });

  it('allows the code editor to run its web workers from this site', () => {
    expect(directive(policy, 'worker-src')).toBe("worker-src 'self' blob:");
  });

  it('allows GitHub avatars and nothing else remote for images', () => {
    expect(directive(policy, 'img-src')).toBe("img-src 'self' data: blob: https://avatars.githubusercontent.com");
  });

  it('names no CDN (the editor is served from this site)', () => {
    expect(policy).not.toContain('jsdelivr');
    expect(policy).not.toContain('cdn.');
  });

  it('does not open up Cloudflare unless Turnstile is on', () => {
    expect(policy).not.toContain('challenges.cloudflare.com');
  });
});

describe('with Turnstile', () => {
  const policy = buildContentSecurityPolicy({ turnstile: true });

  it('allows exactly the challenge origin for its script, frame and verification call', () => {
    for (const name of ['script-src', 'frame-src', 'connect-src']) {
      expect(directive(policy, name)).toContain('https://challenges.cloudflare.com');
    }
    expect(directive(policy, 'img-src')).not.toContain('cloudflare');
  });
});

describe('in development', () => {
  it('adds eval and websockets for hot reload, and only there', () => {
    const dev = buildContentSecurityPolicy({ dev: true });
    expect(directive(dev, 'script-src')).toContain("'unsafe-eval'");
    expect(directive(dev, 'connect-src')).toContain('ws:');
    expect(buildContentSecurityPolicy()).not.toContain('unsafe-eval');
  });
});

import { describe, it, expect } from 'vitest';
import { API_TOKEN_PREFIX, generateApiToken, hashApiToken, readBearerToken } from './api-tokens';

describe('generateApiToken', () => {
  it('returns a prefixed token, its SHA-256 hash and a display prefix', () => {
    const { token, tokenHash, prefix } = generateApiToken();

    expect(token.startsWith(API_TOKEN_PREFIX)).toBe(true);
    expect(token.length).toBeGreaterThan(40);
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenHash).toBe(hashApiToken(token));
    expect(token.startsWith(prefix)).toBe(true);
    expect(prefix.length).toBeLessThan(token.length);
  });

  it('never repeats a token', () => {
    const a = generateApiToken();
    const b = generateApiToken();
    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).not.toBe(b.tokenHash);
  });
});

describe('readBearerToken', () => {
  it('reads a bb_ bearer token', () => {
    expect(readBearerToken('Bearer bb_abc123')).toBe('bb_abc123');
    expect(readBearerToken('bearer bb_abc123')).toBe('bb_abc123');
  });

  it('rejects missing, malformed or foreign tokens', () => {
    expect(readBearerToken(null)).toBeNull();
    expect(readBearerToken('')).toBeNull();
    expect(readBearerToken('bb_abc123')).toBeNull();
    expect(readBearerToken('Basic bb_abc123')).toBeNull();
    expect(readBearerToken('Bearer sk_abc123')).toBeNull();
    expect(readBearerToken('Bearer bb_a bb_b')).toBeNull();
  });
});

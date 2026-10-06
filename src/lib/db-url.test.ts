import { describe, it, expect } from 'vitest';
import { normalizeDatabaseUrl } from './db-url';

const base = 'postgresql://user:p%40ss@ep-host-pooler.region.aws.neon.tech/neondb';

describe('normalizeDatabaseUrl', () => {
  it.each(['require', 'prefer', 'verify-ca'])('turns sslmode=%s into verify-full', (mode) => {
    expect(normalizeDatabaseUrl(`${base}?sslmode=${mode}`)).toBe(`${base}?sslmode=verify-full`);
  });

  it('keeps the other parameters, wherever sslmode is', () => {
    expect(normalizeDatabaseUrl(`${base}?sslmode=require&channel_binding=require`)).toBe(
      `${base}?sslmode=verify-full&channel_binding=require`
    );
    expect(normalizeDatabaseUrl(`${base}?connect_timeout=5&sslmode=require`)).toBe(
      `${base}?connect_timeout=5&sslmode=verify-full`
    );
  });

  it('leaves verify-full, disable and a URL with no sslmode alone', () => {
    expect(normalizeDatabaseUrl(`${base}?sslmode=verify-full`)).toBe(`${base}?sslmode=verify-full`);
    expect(normalizeDatabaseUrl(`${base}?sslmode=disable`)).toBe(`${base}?sslmode=disable`);
    expect(normalizeDatabaseUrl(base)).toBe(base);
  });

  it('does not touch a password or database name that contains the word', () => {
    const url = 'postgresql://user:sslmode=require@localhost/sslmode=require';
    expect(normalizeDatabaseUrl(url)).toBe(url);
  });

  it('respects a URL that asks for libpq behaviour', () => {
    const url = `${base}?sslmode=require&uselibpqcompat=true`;
    expect(normalizeDatabaseUrl(url)).toBe(url);
  });
});

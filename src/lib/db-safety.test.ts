import { describe, it, expect } from 'vitest';
import { assertSafeToRunDestructive, databaseHost, UnsafeDatabaseError } from './db-safety';

const URL_LIVE = 'postgresql://u:p@ep-live-pooler.region.aws.neon.tech/neondb?sslmode=require';
const HOST_LIVE = 'ep-live-pooler.region.aws.neon.tech';

describe('databaseHost', () => {
  it('reads the host, lower-cased', () => {
    expect(databaseHost(URL_LIVE)).toBe(HOST_LIVE);
    expect(databaseHost('postgresql://u:p@LOCALHOST:5432/db')).toBe('localhost');
  });

  it('is empty for something that is not a URL', () => {
    expect(databaseHost('not a url')).toBe('');
    expect(databaseHost('')).toBe('');
  });
});

describe('assertSafeToRunDestructive', () => {
  it('refuses a database nobody has said is safe, and says how to proceed', () => {
    expect(() => assertSafeToRunDestructive(URL_LIVE, 'delete users', {})).toThrow(UnsafeDatabaseError);
    expect(() => assertSafeToRunDestructive(URL_LIVE, 'delete users', {})).toThrow(
      new RegExp(`CONFIRM_DATABASE_HOST=${HOST_LIVE}`)
    );
  });

  it('allows a host listed in SAFE_DATABASE_HOSTS', () => {
    const env = { SAFE_DATABASE_HOSTS: `ep-other.neon.tech, ${HOST_LIVE.toUpperCase()}` };
    expect(assertSafeToRunDestructive(URL_LIVE, 'seed', env)).toBe(HOST_LIVE);
  });

  it('allows a one-off confirmation of exactly that host', () => {
    expect(assertSafeToRunDestructive(URL_LIVE, 'seed', { CONFIRM_DATABASE_HOST: HOST_LIVE })).toBe(HOST_LIVE);
  });

  it('does not accept a confirmation of a different host, a partial host or "yes"', () => {
    for (const value of ['ep-other.neon.tech', 'ep-live-pooler', 'yes', '1', '']) {
      expect(() => assertSafeToRunDestructive(URL_LIVE, 'seed', { CONFIRM_DATABASE_HOST: value })).toThrow(
        UnsafeDatabaseError
      );
    }
  });

  it('does not treat a safe list for another host as permission', () => {
    expect(() => assertSafeToRunDestructive(URL_LIVE, 'seed', { SAFE_DATABASE_HOSTS: 'localhost' })).toThrow(
      UnsafeDatabaseError
    );
  });

  it('refuses a missing or invalid DATABASE_URL', () => {
    expect(() => assertSafeToRunDestructive(undefined, 'seed', {})).toThrow(/DATABASE_URL/);
    expect(() => assertSafeToRunDestructive('nonsense', 'seed', {})).toThrow(/DATABASE_URL/);
  });
});

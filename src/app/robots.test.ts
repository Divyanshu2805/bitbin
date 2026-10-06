import { describe, it, expect } from 'vitest';
import robots from './robots';
import sitemap from './sitemap';
import { PRIVATE_PATHS, PUBLIC_PATHS } from '@/lib/site';

describe('robots.txt', () => {
  const result = robots();
  const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;

  it('lets crawlers read the site but not the API or anything behind a sign-in', () => {
    expect(rule.allow).toBe('/');
    expect(rule.disallow).toEqual([...PRIVATE_PATHS]);
    for (const path of ['/api/', '/dashboard', '/items', '/settings', '/reset-password']) {
      expect(rule.disallow).toContain(path);
    }
  });

  it('never blocks a public page', () => {
    for (const path of PUBLIC_PATHS.filter((p) => p !== '/')) {
      expect((rule.disallow as string[]).some((blocked) => path.startsWith(blocked))).toBe(false);
    }
  });

  it('points at the sitemap', () => {
    expect(result.sitemap).toMatch(/\/sitemap\.xml$/);
  });
});

describe('sitemap.xml', () => {
  const entries = sitemap();

  it('lists exactly the public pages, as absolute URLs', () => {
    expect(entries).toHaveLength(PUBLIC_PATHS.length);
    for (const entry of entries) expect(entry.url).toMatch(/^https?:\/\//);
  });

  it('has the homepage first, with the highest priority', () => {
    expect(entries[0].priority).toBe(1);
    expect(entries.slice(1).every((e) => (e.priority ?? 0) < 1)).toBe(true);
  });

  it('leaves out every private path', () => {
    for (const entry of entries) {
      expect(PRIVATE_PATHS.some((path) => new URL(entry.url).pathname.startsWith(path))).toBe(false);
    }
  });
});

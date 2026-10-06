import { describe, it, expect } from 'vitest';
import { safeCallbackPath, safeUrlSchema } from './validation';

describe('safeCallbackPath', () => {
  it('keeps a path on this site, with its query and hash', () => {
    expect(safeCallbackPath('/settings')).toBe('/settings');
    expect(safeCallbackPath('/items/snippets?page=2#top')).toBe('/items/snippets?page=2#top');
  });

  it('falls back when there is nothing to follow', () => {
    expect(safeCallbackPath(null)).toBe('/dashboard');
    expect(safeCallbackPath(undefined)).toBe('/dashboard');
    expect(safeCallbackPath('')).toBe('/dashboard');
  });

  it.each([
    ['an absolute URL', 'https://evil.example/phish'],
    ['a protocol-relative URL', '//evil.example'],
    ['a backslash variant', '/\\evil.example'],
    ['a javascript: URL', 'javascript:alert(1)'],
    ['a path with no leading slash', 'evil.example'],
    ['a tab that a browser would drop', '/\t/evil.example'],
    ['a newline that a browser would drop', '/\n/evil.example'],
  ])('refuses %s', (_name, value) => {
    expect(safeCallbackPath(value)).toBe('/dashboard');
  });

  it('uses the fallback it is given', () => {
    expect(safeCallbackPath('https://evil.example', '/')).toBe('/');
  });
});

describe('safeUrlSchema', () => {
  it('accepts http(s) links', () => {
    expect(safeUrlSchema.safeParse('https://example.com/a?b=1').success).toBe(true);
  });

  it('rejects script and data URLs', () => {
    expect(safeUrlSchema.safeParse('javascript:alert(1)').success).toBe(false);
    expect(safeUrlSchema.safeParse('data:text/html,<script>1</script>').success).toBe(false);
  });
});

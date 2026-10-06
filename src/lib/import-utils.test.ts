import { describe, it, expect } from 'vitest';
import { isDuplicateItem, parseExportDate, type ItemIdentity } from './import-utils';

const base: ItemIdentity = { title: 'Notes', type: 'note', content: 'first', url: null, fileName: null };
const same = (over: Partial<ItemIdentity>) => isDuplicateItem(base, { ...base, ...over });

describe('isDuplicateItem', () => {
  it('matches the same title, type and content', () => {
    expect(same({})).toBe(true);
  });

  it('does not match a note with the same title but different text', () => {
    expect(same({ content: 'second' })).toBe(false);
  });

  it('does not match a different title or type', () => {
    expect(same({ title: 'Other' })).toBe(false);
    expect(same({ type: 'snippet' })).toBe(false);
  });

  it('compares links by URL, not by text', () => {
    const link = { ...base, type: 'link', content: null, url: 'https://a.dev' };
    expect(isDuplicateItem(link, { ...link })).toBe(true);
    expect(isDuplicateItem(link, { ...link, url: 'https://b.dev' })).toBe(false);
  });

  it('compares files and images by file name', () => {
    const file = { ...base, type: 'file', content: null, fileName: 'a.pdf' };
    expect(isDuplicateItem(file, { ...file })).toBe(true);
    expect(isDuplicateItem(file, { ...file, fileName: 'b.pdf' })).toBe(false);
  });
});

describe('parseExportDate', () => {
  const now = new Date('2026-10-06T12:00:00Z');

  it('reads an ISO date', () => {
    expect(parseExportDate('2026-03-11T00:00:00.000Z', now)?.toISOString()).toBe('2026-03-11T00:00:00.000Z');
  });

  it('ignores a missing or unreadable date', () => {
    expect(parseExportDate(undefined, now)).toBeUndefined();
    expect(parseExportDate(null, now)).toBeUndefined();
    expect(parseExportDate('', now)).toBeUndefined();
    expect(parseExportDate('not a date', now)).toBeUndefined();
  });

  it('clamps a date in the future to now', () => {
    expect(parseExportDate('2099-01-01T00:00:00Z', now)).toEqual(now);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryRaw } = vi.hoisted(() => ({ queryRaw: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { $queryRaw: queryRaw } }));

import {
  containsPattern,
  getRecentSearchableCollections,
  getRecentSearchableItems,
  parseSearch,
  searchCollections,
  searchItems,
} from './search';

const BACKSLASH = String.fromCharCode(92);

const row = (over: Record<string, unknown> = {}) => ({
  id: 'i1',
  title: 'Debounce',
  description: null,
  url: null,
  snippet: null,
  typeName: 'snippet',
  typeIcon: 'Code',
  typeColor: '#3b82f6',
  tags: ['react'],
  ...over,
});

interface SqlLike {
  strings: readonly string[];
  values: unknown[];
}

const isSql = (value: unknown): value is SqlLike =>
  typeof value === 'object' && value !== null && 'strings' in value && 'values' in value;

/** Joins a template's strings, expanding nested `Prisma.sql` fragments, so the whole statement can be read */
function flatten(strings: readonly string[], values: unknown[]): { text: string; values: unknown[] } {
  let text = '';
  const bound: unknown[] = [];
  strings.forEach((part, i) => {
    text += part;
    if (i >= values.length) return;
    const value = values[i];
    if (isSql(value)) {
      const inner = flatten(value.strings, value.values);
      text += inner.text;
      bound.push(...inner.values);
    } else {
      text += '?';
      bound.push(value);
    }
  });
  return { text, values: bound };
}

/** The SQL text and bound values of the n-th $queryRaw call */
function sqlOf(call = 0) {
  const [strings, ...values] = queryRaw.mock.calls[call] as [readonly string[], ...unknown[]];
  return flatten(strings, values);
}

describe('containsPattern', () => {
  it('wraps the text so it matches anywhere', () => {
    expect(containsPattern('debounce')).toBe('%debounce%');
  });

  it('escapes the characters LIKE treats as wildcards, and its escape character', () => {
    expect(containsPattern('50%')).toBe(`%50${BACKSLASH}%%`);
    expect(containsPattern('snake_case')).toBe(`%snake${BACKSLASH}_case%`);
    expect(containsPattern(`a${BACKSLASH}b`)).toBe(`%a${BACKSLASH}${BACKSLASH}b%`);
  });
});

describe('parseSearch', () => {
  it('trims, and returns null for nothing', () => {
    expect(parseSearch('  hook ')).toEqual({ text: 'hook', tagsOnly: false });
    expect(parseSearch('   ')).toBeNull();
    expect(parseSearch('')).toBeNull();
  });

  it('reads #tag as a tag-only search', () => {
    expect(parseSearch('#react')).toEqual({ text: 'react', tagsOnly: true });
    expect(parseSearch('# react ')).toEqual({ text: 'react', tagsOnly: true });
    expect(parseSearch('#')).toBeNull();
  });

  it('cuts very long text', () => {
    expect(parseSearch('x'.repeat(500))?.text).toHaveLength(100);
  });
});

describe('searchItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryRaw.mockResolvedValue([row()]);
  });

  it('is scoped to the user and binds the text as a parameter, never into the SQL', async () => {
    await searchItems('user-1', "x'; DROP TABLE items; --");

    const { text, values } = sqlOf();
    expect(text).toContain('i."userId" =');
    expect(values).toContain('user-1');
    expect(text).not.toContain('DROP TABLE');
    expect(values).toContain("%x'; DROP TABLE items; --%");
  });

  it('matches the text fields and the tags, ranking title matches first', async () => {
    await searchItems('user-1', 'debounce');

    const { text } = sqlOf();
    for (const column of ['i.title ILIKE', 'i.content ILIKE', 'i.description ILIKE', 'i.url ILIKE', 'g.name ILIKE']) {
      expect(text).toContain(column);
    }
    expect(text).toContain('ORDER BY (i.title ILIKE');
  });

  it('looks only at tags for a #tag search', async () => {
    await searchItems('user-1', '#react');

    const { text, values } = sqlOf();
    expect(text).toContain('g.name ILIKE');
    expect(text).not.toContain('i.title ILIKE');
    expect(values).toContain('%react%');
  });

  it('does not query for an empty search', async () => {
    expect(await searchItems('user-1', '  ')).toEqual([]);
    expect(await searchItems('user-1', '#')).toEqual([]);
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it('asks for a limited number of rows', async () => {
    await searchItems('user-1', 'x', 7);
    expect(sqlOf().values).toContain(7);
  });

  it('previews the content, then the description, then the URL, and cuts a long one', async () => {
    queryRaw.mockResolvedValue([
      row({ id: 'a', snippet: 'const a = 1', description: 'desc', url: 'https://a.dev' }),
      row({ id: 'b', description: 'desc b', url: 'https://b.dev' }),
      row({ id: 'c', url: 'https://c.dev' }),
      row({ id: 'd' }),
      row({ id: 'e', snippet: 'x'.repeat(101) }),
      row({ id: 'f', snippet: 'y'.repeat(100) }),
    ]);

    const result = await searchItems('user-1', 'x');

    expect(result.map((r) => r.contentPreview)).toEqual([
      'const a = 1',
      'desc b',
      'https://c.dev',
      null,
      'x'.repeat(100) + '...',
      'y'.repeat(100),
    ]);
  });

  it('keeps the type and the tags', async () => {
    const [result] = await searchItems('user-1', 'x');

    expect(result).toMatchObject({ typeName: 'snippet', typeIcon: 'Code', typeColor: '#3b82f6', tags: ['react'] });
  });

  it("never selects an item's whole content, only its first 101 characters", async () => {
    await searchItems('user-1', 'x');
    expect(sqlOf().text).toContain('left(i.content, 101)');
  });
});

describe('searchCollections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryRaw.mockResolvedValue([{ id: 'c1', name: 'Hooks', itemCount: 2 }]);
  });

  it('is scoped to the user and matches the name', async () => {
    const result = await searchCollections('user-1', 'hoo');

    const { text, values } = sqlOf();
    expect(text).toContain('c."userId" =');
    expect(text).toContain('c.name ILIKE');
    expect(values).toContain('user-1');
    expect(values).toContain('%hoo%');
    expect(result).toEqual([{ id: 'c1', name: 'Hooks', itemCount: 2 }]);
  });

  it('leaves collections out of a #tag search and of an empty one', async () => {
    expect(await searchCollections('user-1', '#react')).toEqual([]);
    expect(await searchCollections('user-1', '')).toEqual([]);
    expect(queryRaw).not.toHaveBeenCalled();
  });
});

describe('recent lists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryRaw.mockResolvedValue([]);
  });

  it('are scoped to the user, newest first, and limited', async () => {
    await getRecentSearchableItems('user-1', 4);
    await getRecentSearchableCollections('user-1', 3);

    for (const [call, limit] of [[0, 4], [1, 3]] as const) {
      const { text, values } = sqlOf(call);
      expect(text).toContain('"userId" =');
      expect(text).toContain('ORDER BY');
      expect(text).toContain('"updatedAt" DESC');
      expect(values).toEqual(['user-1', limit]);
    }
  });
});

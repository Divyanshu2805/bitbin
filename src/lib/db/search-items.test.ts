import { describe, it, expect, vi, beforeEach } from 'vitest';

const { findMany, queryRaw } = vi.hoisted(() => ({ findMany: vi.fn(), queryRaw: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { item: { findMany }, $queryRaw: queryRaw } }));

import { getSearchableItems } from './items';

const type = { name: 'snippet', icon: 'Code', color: '#3b82f6' };
const item = (over: Record<string, unknown>) => ({
  id: 'i1',
  title: 'T',
  description: null,
  url: null,
  tags: [],
  itemType: type,
  ...over,
});

describe('getSearchableItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryRaw.mockResolvedValue([]);
  });

  it("scopes both queries to the user and never selects an item's full content", async () => {
    findMany.mockResolvedValue([]);

    await getSearchableItems('user-1');

    const args = findMany.mock.calls[0][0];
    expect(args.where).toEqual({ userId: 'user-1' });
    expect(args.select.content).toBeUndefined();
    // The raw query is parameterised by the user id and cuts the text in SQL
    const [strings, ...values] = queryRaw.mock.calls[0];
    expect(values).toEqual(['user-1']);
    expect(strings.join('?')).toContain('left(content, 101)');
  });

  it('previews the content, then the description, then the URL', async () => {
    findMany.mockResolvedValue([
      item({ id: 'a', description: 'desc a', url: 'https://a.dev' }),
      item({ id: 'b', description: 'desc b', url: 'https://b.dev' }),
      item({ id: 'c', url: 'https://c.dev' }),
      item({ id: 'd' }),
    ]);
    queryRaw.mockResolvedValue([{ id: 'a', snippet: 'const a = 1' }]);

    const result = await getSearchableItems('user-1');

    expect(result.map((r) => r.contentPreview)).toEqual(['const a = 1', 'desc b', 'https://c.dev', null]);
  });

  it('cuts a long preview at 100 characters and marks it', async () => {
    findMany.mockResolvedValue([item({ id: 'a' }), item({ id: 'b' })]);
    queryRaw.mockResolvedValue([
      { id: 'a', snippet: 'x'.repeat(101) },
      { id: 'b', snippet: 'y'.repeat(100) },
    ]);

    const [a, b] = await getSearchableItems('user-1');

    expect(a.contentPreview).toBe('x'.repeat(100) + '...');
    expect(b.contentPreview).toBe('y'.repeat(100));
  });

  it('keeps the tags and the type', async () => {
    findMany.mockResolvedValue([item({ tags: [{ name: 'react' }, { name: 'hooks' }] })]);

    const [result] = await getSearchableItems('user-1');

    expect(result.tags).toEqual(['react', 'hooks']);
    expect(result.typeName).toBe('snippet');
  });
});

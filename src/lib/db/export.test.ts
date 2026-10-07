import { describe, it, expect, vi, beforeEach } from 'vitest';

const { collectionFindFirst, collectionFindMany, itemFindMany } = vi.hoisted(() => ({
  collectionFindFirst: vi.fn(),
  collectionFindMany: vi.fn(),
  itemFindMany: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    collection: { findFirst: collectionFindFirst, findMany: collectionFindMany },
    item: { findMany: itemFindMany },
  },
}));

import { getCollectionExportData, getUserExportData } from './export';

const row = (title: string, collectionNames: string[]) => ({
  title,
  content: 'x',
  language: null,
  description: null,
  url: null,
  fileName: null,
  fileSize: null,
  fileUrl: null,
  isFavorite: false,
  isPinned: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  itemType: { name: 'snippet' },
  tags: [{ name: 'react' }],
  collections: collectionNames.map((name) => ({ collection: { name } })),
});

describe('getCollectionExportData', () => {
  beforeEach(() => vi.clearAllMocks());

  it('is null when the collection is not the caller\'s, and reads no items', async () => {
    collectionFindFirst.mockResolvedValue(null);

    expect(await getCollectionExportData('user-1', 'col-9')).toBeNull();
    expect(collectionFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'col-9', userId: 'user-1' } }));
    expect(itemFindMany).not.toHaveBeenCalled();
  });

  it('holds the collection and its items only, mentioning no other collection', async () => {
    collectionFindFirst.mockResolvedValue({ name: 'Work', description: null, isFavorite: true, isPinned: false });
    itemFindMany.mockResolvedValue([row('Debounce', ['Work', 'Private stuff'])]);

    const data = await getCollectionExportData('user-1', 'col-1');

    expect(itemFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1', collections: { some: { collectionId: 'col-1' } } } })
    );
    expect(data?.collections).toEqual([{ name: 'Work', description: null, isFavorite: true, isPinned: false }]);
    expect(data?.items).toHaveLength(1);
    expect(data?.items[0].collections).toEqual(['Work']);
    expect(data?.items[0]).toMatchObject({ title: 'Debounce', type: 'snippet', tags: ['react'] });
  });
});

describe('getUserExportData', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps every collection an item belongs to', async () => {
    itemFindMany.mockResolvedValue([row('Debounce', ['Work', 'Private stuff'])]);
    collectionFindMany.mockResolvedValue([]);

    const data = await getUserExportData('user-1');

    expect(itemFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-1' } }));
    expect(data.items[0].collections).toEqual(['Work', 'Private stuff']);
  });
});

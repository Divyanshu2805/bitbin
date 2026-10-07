import { describe, it, expect, vi, beforeEach } from 'vitest';
import { decodeCursor, encodeCursor, keysetWhere } from '@/lib/keyset';
import { getCollectionById, getAllCollections, updateCollection, deleteCollection, toggleCollectionPin } from './collections';

// Mock Prisma client
vi.mock('@/lib/prisma', () => ({
  prisma: {
    collection: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';

const mockFindFirst = vi.mocked(prisma.collection.findFirst);
const mockUpdate = vi.mocked(prisma.collection.update);
const mockDelete = vi.mocked(prisma.collection.delete);

const mockDate = new Date('2025-06-15T12:00:00Z');

const basePrismaCollection = {
  id: 'col-1',
  name: 'React Patterns',
  description: 'Useful React patterns and hooks',
  isFavorite: true,
  isPinned: false,
  userId: 'user-1',
  defaultTypeId: null,
  createdAt: mockDate,
  updatedAt: mockDate,
  _count: { items: 3 },
  items: [
    {
      item: {
        itemType: { id: 'type-1', name: 'snippet', icon: 'Code', color: '#3b82f6' },
      },
    },
    {
      item: {
        itemType: { id: 'type-1', name: 'snippet', icon: 'Code', color: '#3b82f6' },
      },
    },
    {
      item: {
        itemType: { id: 'type-2', name: 'note', icon: 'StickyNote', color: '#fde047' },
      },
    },
  ],
};

describe('getCollectionById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns mapped collection detail when collection exists and belongs to user', async () => {
    mockFindFirst.mockResolvedValue(basePrismaCollection as never);

    const result = await getCollectionById('col-1', 'user-1');

    expect(result).toEqual({
      id: 'col-1',
      name: 'React Patterns',
      description: 'Useful React patterns and hooks',
      isFavorite: true,
      isPinned: false,
      itemCount: 3,
      itemTypes: [
        { name: 'snippet', icon: 'Code', color: '#3b82f6', count: 2 },
        { name: 'note', icon: 'StickyNote', color: '#fde047', count: 1 },
      ],
      dominantColor: '#3b82f6',
      createdAt: mockDate,
      updatedAt: mockDate,
    });
  });

  it('returns null when collection does not exist', async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await getCollectionById('nonexistent', 'user-1');

    expect(result).toBeNull();
  });

  it('returns null dominantColor when collection has no items', async () => {
    mockFindFirst.mockResolvedValue({
      ...basePrismaCollection,
      _count: { items: 0 },
      items: [],
    } as never);

    const result = await getCollectionById('col-1', 'user-1');

    expect(result?.itemTypes).toEqual([]);
    expect(result?.dominantColor).toBeNull();
  });

  it('sorts item types by count descending', async () => {
    mockFindFirst.mockResolvedValue({
      ...basePrismaCollection,
      items: [
        { item: { itemType: { id: 'type-1', name: 'note', icon: 'StickyNote', color: '#fde047' } } },
        { item: { itemType: { id: 'type-2', name: 'snippet', icon: 'Code', color: '#3b82f6' } } },
        { item: { itemType: { id: 'type-2', name: 'snippet', icon: 'Code', color: '#3b82f6' } } },
        { item: { itemType: { id: 'type-2', name: 'snippet', icon: 'Code', color: '#3b82f6' } } },
      ],
    } as never);

    const result = await getCollectionById('col-1', 'user-1');

    expect(result?.itemTypes[0].name).toBe('snippet');
    expect(result?.itemTypes[0].count).toBe(3);
    expect(result?.itemTypes[1].name).toBe('note');
    expect(result?.itemTypes[1].count).toBe(1);
  });

  it('calls prisma with correct where clause including userId', async () => {
    mockFindFirst.mockResolvedValue(basePrismaCollection as never);

    await getCollectionById('col-1', 'user-1');

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'col-1', userId: 'user-1' },
      })
    );
  });
});

describe('updateCollection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when collection does not exist', async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await updateCollection('col-1', 'user-1', {
      name: 'Updated Name',
      description: null,
    });

    expect(result).toBeNull();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns updated collection when successful', async () => {
    const mockUpdated = {
      id: 'col-1',
      name: 'Updated Name',
      description: 'Updated description',
      isFavorite: false,
      createdAt: mockDate,
      updatedAt: mockDate,
    };

    mockFindFirst.mockResolvedValue({ id: 'col-1', userId: 'user-1' } as never);
    mockUpdate.mockResolvedValue(mockUpdated as never);

    const result = await updateCollection('col-1', 'user-1', {
      name: 'Updated Name',
      description: 'Updated description',
    });

    expect(result).toEqual({
      id: 'col-1',
      name: 'Updated Name',
      description: 'Updated description',
      isFavorite: false,
      createdAt: mockDate,
      updatedAt: mockDate,
    });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'col-1' },
      data: { name: 'Updated Name', description: 'Updated description' },
    });
  });

  it('verifies ownership before updating', async () => {
    mockFindFirst.mockResolvedValue(null);

    await updateCollection('col-1', 'user-1', {
      name: 'Test',
      description: null,
    });

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: 'col-1', userId: 'user-1' },
    });
  });
});

describe('deleteCollection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false when collection does not exist', async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await deleteCollection('col-1', 'user-1');

    expect(result).toBe(false);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('returns true when collection is deleted', async () => {
    mockFindFirst.mockResolvedValue({ id: 'col-1', userId: 'user-1' } as never);
    mockDelete.mockResolvedValue({ id: 'col-1' } as never);

    const result = await deleteCollection('col-1', 'user-1');

    expect(result).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith({
      where: { id: 'col-1' },
    });
  });

  it('verifies ownership before deleting', async () => {
    mockFindFirst.mockResolvedValue(null);

    await deleteCollection('col-1', 'user-1');

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: 'col-1', userId: 'user-1' },
    });
  });
});

describe('toggleCollectionPin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('flips isPinned on a collection the user owns', async () => {
    mockFindFirst.mockResolvedValue({ isPinned: false } as never);
    mockUpdate.mockResolvedValue({ isPinned: true } as never);

    const result = await toggleCollectionPin('col-1', 'user-1');

    expect(result).toBe(true);
    expect(mockFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'col-1', userId: 'user-1' } }));
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: { isPinned: true } }));
  });

  it("returns null and writes nothing for another user's collection", async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await toggleCollectionPin('col-1', 'user-2');

    expect(result).toBeNull();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe('getAllCollections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists pinned collections first, then by last edit, and returns isPinned', async () => {
    vi.mocked(prisma.collection.findMany).mockResolvedValue([{ ...basePrismaCollection, isPinned: true }] as never);
    vi.mocked(prisma.collection.count).mockResolvedValue(1);

    const result = await getAllCollections('user-1');

    expect(prisma.collection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }, { id: 'desc' }],
      })
    );
    expect(result.collections[0].isPinned).toBe(true);
  });

  it('reads one more than a page to learn whether there is another, and shows only the page', async () => {
    const rows = Array.from({ length: 4 }, (_, i) => ({
      ...basePrismaCollection,
      id: `col-${i}`,
      updatedAt: new Date(10_000 - i),
    }));
    vi.mocked(prisma.collection.findMany).mockResolvedValue(rows as never);
    vi.mocked(prisma.collection.count).mockResolvedValue(9);

    const result = await getAllCollections('user-1', undefined, 3);

    expect(prisma.collection.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 4 }));
    expect(result.collections.map((c) => c.id)).toEqual(['col-0', 'col-1', 'col-2']);
    expect(result.totalCount).toBe(9);
    expect(result.pageInfo).toMatchObject({ hasNext: true, hasPrev: false });
    expect(decodeCursor(result.pageInfo.nextCursor)?.id).toBe('col-2');
  });

  it('continues after a cursor, still scoped to the user, and knows it is on a later page', async () => {
    vi.mocked(prisma.collection.findMany).mockResolvedValue([{ ...basePrismaCollection, id: 'col-7' }] as never);
    vi.mocked(prisma.collection.count).mockResolvedValue(8);
    const after = encodeCursor({ id: 'col-6', isPinned: false, updatedAt: new Date(5000) });

    const result = await getAllCollections('user-1', { after }, 3);

    const call = vi.mocked(prisma.collection.findMany).mock.calls[0][0] as { where: { AND: unknown[] } };
    expect(call.where.AND[0]).toEqual({ userId: 'user-1' });
    expect(call.where.AND[1]).toEqual(keysetWhere({ pinned: false, updatedAt: new Date(5000), id: 'col-6' }, 'after'));
    expect(result.pageInfo).toMatchObject({ hasNext: false, hasPrev: true, nextCursor: null });
  });

  it('goes back by reading in reverse and showing the rows in list order', async () => {
    const reversed = ['col-3', 'col-2', 'col-1', 'col-0'].map((id, i) => ({ ...basePrismaCollection, id, updatedAt: new Date(1000 + i) }));
    vi.mocked(prisma.collection.findMany).mockResolvedValue(reversed as never);
    vi.mocked(prisma.collection.count).mockResolvedValue(10);
    const before = encodeCursor({ id: 'col-4', isPinned: false, updatedAt: new Date(900) });

    const result = await getAllCollections('user-1', { before }, 3);

    expect(prisma.collection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ isPinned: 'asc' }, { updatedAt: 'asc' }, { id: 'asc' }], take: 4 })
    );
    expect(result.collections.map((c) => c.id)).toEqual(['col-1', 'col-2', 'col-3']);
    expect(result.pageInfo).toMatchObject({ hasPrev: true, hasNext: true });
  });

  it('ignores a cursor it did not issue and shows the first page', async () => {
    vi.mocked(prisma.collection.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.collection.count).mockResolvedValue(0);

    await getAllCollections('user-1', { after: 'garbage' });

    expect(prisma.collection.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-1' } }));
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getItemById, deleteItem, createItem, setItemInCollection, getCollectionsForItem } from './items';

// Mock Prisma client
vi.mock('@/lib/prisma', () => ({
  prisma: {
    item: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
    },
    itemCollection: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    itemType: {
      findFirst: vi.fn(),
    },
    collection: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';

const mockFindUnique = vi.mocked(prisma.item.findUnique);
const mockDelete = vi.mocked(prisma.item.delete);

const mockDate = new Date('2025-06-15T12:00:00Z');

const basePrismaItem = {
  id: 'item-1',
  title: 'useAuth Hook',
  description: 'Custom authentication hook',
  content: 'import { useContext } from "react"',
  url: null,
  language: 'typescript',
  contentType: 'TEXT' as const,
  isFavorite: true,
  isPinned: false,
  userId: 'user-1',
  itemTypeId: 'type-1',
  fileUrl: null,
  fileName: null,
  fileSize: null,
  createdAt: mockDate,
  updatedAt: mockDate,
  itemType: {
    id: 'type-1',
    name: 'snippet',
    icon: 'Code',
    color: '#3b82f6',
    isSystem: true,
    userId: null,
  },
  tags: [
    { id: 'tag-1', name: 'react' },
    { id: 'tag-2', name: 'hooks' },
  ],
  collections: [
    {
      itemId: 'item-1',
      collectionId: 'col-1',
      addedAt: mockDate,
      collection: { id: 'col-1', name: 'React Patterns' },
    },
  ],
};

describe('getItemById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns mapped item detail when item exists and belongs to user', async () => {
    mockFindUnique.mockResolvedValue(basePrismaItem as never);

    const result = await getItemById('user-1', 'item-1');

    expect(result).toEqual({
      id: 'item-1',
      title: 'useAuth Hook',
      description: 'Custom authentication hook',
      content: 'import { useContext } from "react"',
      url: null,
      language: 'typescript',
      contentType: 'TEXT',
      fileUrl: null,
      fileName: null,
      fileSize: null,
      isFavorite: true,
      isPinned: false,
      itemType: { name: 'snippet', icon: 'Code', color: '#3b82f6' },
      tags: ['react', 'hooks'],
      collections: [{ id: 'col-1', name: 'React Patterns' }],
      createdAt: mockDate,
      updatedAt: mockDate,
    });
  });

  it('returns null when item does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await getItemById('user-1', 'nonexistent');

    expect(result).toBeNull();
  });

  it('returns null when item belongs to a different user', async () => {
    mockFindUnique.mockResolvedValue(basePrismaItem as never);

    const result = await getItemById('other-user', 'item-1');

    expect(result).toBeNull();
  });

  it('maps empty tags and collections correctly', async () => {
    mockFindUnique.mockResolvedValue({
      ...basePrismaItem,
      tags: [],
      collections: [],
    } as never);

    const result = await getItemById('user-1', 'item-1');

    expect(result?.tags).toEqual([]);
    expect(result?.collections).toEqual([]);
  });

  it('maps multiple collections correctly', async () => {
    mockFindUnique.mockResolvedValue({
      ...basePrismaItem,
      collections: [
        {
          itemId: 'item-1',
          collectionId: 'col-1',
          addedAt: mockDate,
          collection: { id: 'col-1', name: 'React Patterns' },
        },
        {
          itemId: 'item-1',
          collectionId: 'col-2',
          addedAt: mockDate,
          collection: { id: 'col-2', name: 'Interview Prep' },
        },
      ],
    } as never);

    const result = await getItemById('user-1', 'item-1');

    expect(result?.collections).toEqual([
      { id: 'col-1', name: 'React Patterns' },
      { id: 'col-2', name: 'Interview Prep' },
    ]);
  });

  it('calls prisma with correct arguments', async () => {
    mockFindUnique.mockResolvedValue(basePrismaItem as never);

    await getItemById('user-1', 'item-1');

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      include: {
        itemType: true,
        tags: true,
        collections: {
          include: {
            collection: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });
  });
});

describe('deleteItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false when item does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await deleteItem('user-1', 'nonexistent');

    expect(result).toBe(false);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('returns false when item belongs to different user', async () => {
    mockFindUnique.mockResolvedValue({ userId: 'other-user' } as never);

    const result = await deleteItem('user-1', 'item-1');

    expect(result).toBe(false);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('deletes item and returns true when user owns item', async () => {
    mockFindUnique.mockResolvedValue({ userId: 'user-1' } as never);
    mockDelete.mockResolvedValue({} as never);

    const result = await deleteItem('user-1', 'item-1');

    expect(result).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'item-1' } });
  });
});

describe('createItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('links only collections the user owns', async () => {
    vi.mocked(prisma.itemType.findFirst).mockResolvedValue({ id: 'type-note' } as never);
    vi.mocked(prisma.collection.findMany).mockResolvedValue([{ id: 'mine' }] as never);
    vi.mocked(prisma.item.create).mockResolvedValue({
      id: 'item-1',
      title: 'Hello',
      itemType: { id: 'type-note', name: 'note', icon: 'StickyNote', color: '#fff' },
      tags: [],
      collections: [],
      createdAt: mockDate,
      updatedAt: mockDate,
    } as never);

    await createItem('user-1', {
      typeName: 'note',
      title: 'Hello',
      description: null,
      content: null,
      url: null,
      language: null,
      tags: [],
      collectionIds: ['mine', 'someone-elses', 'mine'],
    });

    expect(prisma.collection.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['mine', 'someone-elses', 'mine'] }, userId: 'user-1' },
      select: { id: true },
    });
    const createArgs = vi.mocked(prisma.item.create).mock.calls[0][0];
    expect(createArgs.data.collections).toEqual({ create: [{ collectionId: 'mine' }] });
  });
});

describe('setItemInCollection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when the collection isn't the user's", async () => {
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(prisma.item.findFirst).mockResolvedValue({ id: 'item-1' } as never);
    vi.mocked(prisma.collection.findFirst).mockResolvedValue(null);

    const result = await setItemInCollection('user-1', 'item-1', 'col-2', true);

    expect(result).toBeNull();
    expect(prisma.collection.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'col-2', userId: 'user-1' } }));
    expect(prisma.itemCollection.createMany).not.toHaveBeenCalled();
  });

  it("does nothing when the item isn't the user's", async () => {
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(prisma.item.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.collection.findFirst).mockResolvedValue({ name: 'React' } as never);

    expect(await setItemInCollection('user-1', 'item-9', 'col-1', true)).toBeNull();
    expect(prisma.itemCollection.createMany).not.toHaveBeenCalled();
  });

  it('adds without duplicating, and says whether anything changed', async () => {
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(prisma.item.findFirst).mockResolvedValue({ id: 'item-1' } as never);
    vi.mocked(prisma.collection.findFirst).mockResolvedValue({ name: 'React' } as never);
    vi.mocked(prisma.itemCollection.createMany).mockResolvedValue({ count: 0 });

    const result = await setItemInCollection('user-1', 'item-1', 'col-1', true);

    expect(prisma.itemCollection.createMany).toHaveBeenCalledWith({
      data: [{ itemId: 'item-1', collectionId: 'col-1' }],
      skipDuplicates: true,
    });
    expect(result).toEqual({ collectionName: 'React', inCollection: true, changed: false });
  });

  it('removes only that one link', async () => {
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(prisma.item.findFirst).mockResolvedValue({ id: 'item-1' } as never);
    vi.mocked(prisma.collection.findFirst).mockResolvedValue({ name: 'React' } as never);
    vi.mocked(prisma.itemCollection.deleteMany).mockResolvedValue({ count: 1 });

    const result = await setItemInCollection('user-1', 'item-1', 'col-1', false);

    expect(prisma.itemCollection.deleteMany).toHaveBeenCalledWith({ where: { itemId: 'item-1', collectionId: 'col-1' } });
    expect(result).toEqual({ collectionName: 'React', inCollection: false, changed: true });
  });
});

describe('getCollectionsForItem', () => {
  it("returns null for someone else's item", async () => {
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(prisma.item.findFirst).mockResolvedValue(null);
    expect(await getCollectionsForItem('user-1', 'item-9')).toBeNull();
  });

  it("marks the collections the item is in", async () => {
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(prisma.item.findFirst).mockResolvedValue({ collections: [{ collectionId: 'col-2' }] } as never);
    vi.mocked(prisma.collection.findMany).mockResolvedValue([
      { id: 'col-1', name: 'Infra' },
      { id: 'col-2', name: 'React' },
    ] as never);

    expect(await getCollectionsForItem('user-1', 'item-1')).toEqual([
      { id: 'col-1', name: 'Infra', inCollection: false },
      { id: 'col-2', name: 'React', inCollection: true },
    ]);
  });
});

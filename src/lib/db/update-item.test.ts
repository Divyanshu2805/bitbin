import { describe, it, expect, vi, beforeEach } from 'vitest';

const { tx, prismaMock } = vi.hoisted(() => {
  const tx = {
    itemCollection: { deleteMany: vi.fn(), createMany: vi.fn() },
    item: { update: vi.fn() },
  };
  const prismaMock = {
    $transaction: vi.fn(),
    item: { findUnique: vi.fn(), update: vi.fn() },
    itemCollection: { deleteMany: vi.fn(), createMany: vi.fn() },
    collection: { findMany: vi.fn() },
  };
  return { tx, prismaMock };
});

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

import { updateItem } from './items';

const data = { title: 'New', description: null, content: 'c', url: null, language: null, tags: ['a'] };

const updatedRow = {
  id: 'item-1',
  title: 'New',
  description: null,
  content: 'c',
  url: null,
  language: null,
  contentType: 'TEXT',
  fileUrl: null,
  fileName: null,
  fileSize: null,
  isFavorite: false,
  isPinned: false,
  itemType: { name: 'note', icon: 'StickyNote', color: '#fde047' },
  tags: [{ name: 'a' }],
  collections: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('updateItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (fn: (t: typeof tx) => unknown) => fn(tx));
    prismaMock.item.findUnique.mockResolvedValue({ userId: 'user-1' });
    prismaMock.collection.findMany.mockResolvedValue([{ id: 'col-1' }]);
    tx.item.update.mockResolvedValue(updatedRow);
  });

  it("returns null for another user's item without writing anything", async () => {
    prismaMock.item.findUnique.mockResolvedValue({ userId: 'someone-else' });

    expect(await updateItem('user-1', 'item-1', data)).toBeNull();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('rewrites the collection links and the item inside one transaction', async () => {
    const result = await updateItem('user-1', 'item-1', { ...data, collectionIds: ['col-1'] });

    expect(result?.id).toBe('item-1');
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.itemCollection.deleteMany).toHaveBeenCalledWith({ where: { itemId: 'item-1' } });
    expect(tx.itemCollection.createMany).toHaveBeenCalledWith({
      data: [{ itemId: 'item-1', collectionId: 'col-1' }],
    });
    expect(tx.item.update).toHaveBeenCalledTimes(1);
    // Nothing is written outside the transaction
    expect(prismaMock.itemCollection.deleteMany).not.toHaveBeenCalled();
    expect(prismaMock.itemCollection.createMany).not.toHaveBeenCalled();
    expect(prismaMock.item.update).not.toHaveBeenCalled();
  });

  it('leaves the links alone when no collection ids are sent', async () => {
    await updateItem('user-1', 'item-1', data);

    expect(tx.itemCollection.deleteMany).not.toHaveBeenCalled();
    expect(tx.item.update).toHaveBeenCalledTimes(1);
  });

  it('only links collections the caller owns', async () => {
    await updateItem('user-1', 'item-1', { ...data, collectionIds: ['col-1', 'col-of-someone-else'] });

    expect(prismaMock.collection.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['col-1', 'col-of-someone-else'] }, userId: 'user-1' },
      select: { id: true },
    });
    expect(tx.itemCollection.createMany).toHaveBeenCalledWith({
      data: [{ itemId: 'item-1', collectionId: 'col-1' }],
    });
  });

  it('fails as a whole when the item update fails, so the database can roll the links back', async () => {
    tx.item.update.mockRejectedValue(new Error('db down'));

    await expect(updateItem('user-1', 'item-1', { ...data, collectionIds: [] })).rejects.toThrow('db down');
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });
});

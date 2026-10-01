import { describe, it, expect, vi, beforeEach } from 'vitest';

const { tx, prismaMock } = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(),
    item: { count: vi.fn(), create: vi.fn() },
    collection: { count: vi.fn(), create: vi.fn() },
  };
  const prismaMock = {
    $transaction: vi.fn(),
    itemType: { findFirst: vi.fn() },
    item: { create: vi.fn() },
    collection: { create: vi.fn(), findMany: vi.fn() },
  };
  return { tx, prismaMock };
});

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

import { createItem } from './items';
import { createCollection } from './collections';
import { LimitReachedError } from '@/lib/limit-error';

const itemData = {
  typeName: 'note' as const,
  title: 'Test',
  description: null,
  content: null,
  url: null,
  language: null,
  tags: [],
};

const createdItem = {
  id: 'item-1',
  title: 'Test',
  description: null,
  content: null,
  url: null,
  language: null,
  contentType: 'TEXT',
  fileUrl: null,
  fileName: null,
  fileSize: null,
  isFavorite: false,
  isPinned: false,
  itemType: { name: 'note', icon: 'StickyNote', color: '#fde047' },
  tags: [],
  collections: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const createdCollection = {
  id: 'col-1',
  name: 'React',
  description: null,
  isFavorite: false,
  isPinned: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation(async (fn: (t: typeof tx) => unknown) => fn(tx));
  prismaMock.itemType.findFirst.mockResolvedValue({ id: 'type-1' });
  tx.$queryRaw.mockResolvedValue([]);
});

describe('createItem with a plan cap', () => {
  it('locks the user row, counts, then inserts inside one transaction', async () => {
    tx.item.count.mockResolvedValue(49);
    tx.item.create.mockResolvedValue(createdItem);

    const result = await createItem('user-1', { ...itemData, maxItems: 50 });

    expect(result?.id).toBe('item-1');
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.item.count).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(tx.item.create).toHaveBeenCalledTimes(1);
    // Lock first, insert last
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.item.count.mock.invocationCallOrder[0]);
    expect(tx.item.count.mock.invocationCallOrder[0]).toBeLessThan(tx.item.create.mock.invocationCallOrder[0]);
    expect(prismaMock.item.create).not.toHaveBeenCalled();
  });

  it('refuses the insert when the account is already full', async () => {
    tx.item.count.mockResolvedValue(50);

    await expect(createItem('user-1', { ...itemData, maxItems: 50 })).rejects.toBeInstanceOf(LimitReachedError);
    expect(tx.item.create).not.toHaveBeenCalled();
  });

  it('skips the transaction and the lock when there is no cap (Pro)', async () => {
    prismaMock.item.create.mockResolvedValue(createdItem);

    await createItem('user-1', itemData);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(tx.$queryRaw).not.toHaveBeenCalled();
    expect(prismaMock.item.create).toHaveBeenCalledTimes(1);
  });

  it('lets exactly one of two racing creates through at the cap', async () => {
    // A lock that queues the second transaction until the first has finished
    let rows = 49;
    let tail: Promise<unknown> = Promise.resolve();
    prismaMock.$transaction.mockImplementation((fn: (t: typeof tx) => Promise<unknown>) => {
      const run = tail.then(() => fn(tx));
      tail = run.catch(() => undefined);
      return run;
    });
    tx.item.count.mockImplementation(async () => rows);
    tx.item.create.mockImplementation(async () => {
      rows += 1;
      return createdItem;
    });

    const results = await Promise.allSettled([
      createItem('user-1', { ...itemData, maxItems: 50 }),
      createItem('user-1', { ...itemData, maxItems: 50 }),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect(rows).toBe(50);
  });
});

describe('createCollection with a plan cap', () => {
  it('counts under the lock and inserts when there is room', async () => {
    tx.collection.count.mockResolvedValue(2);
    tx.collection.create.mockResolvedValue(createdCollection);

    const result = await createCollection('user-1', { name: 'React', description: null, maxCollections: 3 });

    expect(result.id).toBe('col-1');
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.collection.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', name: 'React', description: null },
    });
  });

  it('refuses when the account already has the maximum', async () => {
    tx.collection.count.mockResolvedValue(3);

    await expect(
      createCollection('user-1', { name: 'React', description: null, maxCollections: 3 })
    ).rejects.toBeInstanceOf(LimitReachedError);
    expect(tx.collection.create).not.toHaveBeenCalled();
  });

  it('skips the transaction without a cap', async () => {
    prismaMock.collection.create.mockResolvedValue(createdCollection);

    await createCollection('user-1', { name: 'React', description: null });

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

const tx = vi.hoisted(() => ({
  item: { findMany: vi.fn() },
  tag: { upsert: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
}));
const { tagFindMany } = vi.hoisted(() => ({ tagFindMany: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    tag: { findMany: tagFindMany },
    $transaction: async (fn: (client: typeof tx) => unknown) => fn(tx),
  },
}));

import { deleteUserTag, getUserTags, renameUserTag } from './tags';

beforeEach(() => {
  vi.clearAllMocks();
  tx.tag.upsert.mockResolvedValue({ id: 'tag-to', name: 'javascript' });
});

describe('getUserTags', () => {
  it('lists only tags on the user\'s items, counting only the user\'s items', async () => {
    tagFindMany.mockResolvedValue([{ name: 'react', _count: { items: 4 } }]);

    expect(await getUserTags('user-1')).toEqual([{ name: 'react', count: 4 }]);
    expect(tagFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { items: { some: { userId: 'user-1' } } },
        select: { name: true, _count: { select: { items: { where: { userId: 'user-1' } } } } },
      })
    );
  });
});

describe('renameUserTag', () => {
  it('moves only the user\'s own items to the new tag and drops the old row when it is unused', async () => {
    tx.item.findMany.mockResolvedValue([{ id: 'i1' }, { id: 'i2' }]);

    const changed = await renameUserTag('user-1', 'js', 'javascript');

    expect(changed).toBe(2);
    // Found through the caller's own items, never through the tag
    expect(tx.item.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', tags: { some: { name: 'js' } } },
      select: { id: true },
    });
    expect(tx.tag.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'tag-to' },
      data: { items: { connect: [{ id: 'i1' }, { id: 'i2' }] } },
    });
    expect(tx.tag.update).toHaveBeenNthCalledWith(2, {
      where: { name: 'js' },
      data: { items: { disconnect: [{ id: 'i1' }, { id: 'i2' }] } },
    });
    expect(tx.tag.deleteMany).toHaveBeenCalledWith({ where: { name: 'js', items: { none: {} } } });
  });

  it('changes nothing when the user has no item with the tag', async () => {
    tx.item.findMany.mockResolvedValue([]);

    expect(await renameUserTag('user-1', 'js', 'javascript')).toBeNull();
    expect(tx.tag.upsert).not.toHaveBeenCalled();
    expect(tx.tag.update).not.toHaveBeenCalled();
  });
});

describe('deleteUserTag', () => {
  it('disconnects the user\'s items and removes the row only if nobody else uses it', async () => {
    tx.item.findMany.mockResolvedValue([{ id: 'i1' }]);

    expect(await deleteUserTag('user-1', 'old')).toBe(1);
    expect(tx.tag.update).toHaveBeenCalledWith({
      where: { name: 'old' },
      data: { items: { disconnect: [{ id: 'i1' }] } },
    });
    expect(tx.tag.deleteMany).toHaveBeenCalledWith({ where: { name: 'old', items: { none: {} } } });
  });

  it('is null when the user has no item with the tag', async () => {
    tx.item.findMany.mockResolvedValue([]);

    expect(await deleteUserTag('user-1', 'old')).toBeNull();
    expect(tx.tag.update).not.toHaveBeenCalled();
  });
});

import { prisma } from '@/lib/prisma';

/**
 * A tag row is shared by name, but the link between a tag and an item belongs to the item's owner.
 * Everything here works on the caller's own links only: it finds the caller's items first, then
 * moves or removes those links, so one user renaming "react" never touches anyone else's items.
 */

// A user's tag list is read in one go and filtered in the browser
const MAX_LISTED_TAGS = 1000;

export interface UserTag {
  name: string;
  /** How many of the user's items carry it */
  count: number;
}

/** The tags on the user's items, with how many items each is on. */
export async function getUserTags(userId: string): Promise<UserTag[]> {
  const tags = await prisma.tag.findMany({
    where: { items: { some: { userId } } },
    select: { name: true, _count: { select: { items: { where: { userId } } } } },
    orderBy: { name: 'asc' },
    take: MAX_LISTED_TAGS,
  });
  return tags.map((tag) => ({ name: tag.name, count: tag._count.items }));
}

/**
 * Rename a tag on all of the user's items. When `to` already exists the two merge: the items end
 * up with it once. Returns how many items changed, or null when none of the user's items has `from`.
 */
export async function renameUserTag(userId: string, from: string, to: string): Promise<number | null> {
  return prisma.$transaction(async (tx) => {
    const items = await tx.item.findMany({
      where: { userId, tags: { some: { name: from } } },
      select: { id: true },
    });
    if (items.length === 0) return null;

    const ids = items.map((item) => ({ id: item.id }));
    const target = await tx.tag.upsert({ where: { name: to }, create: { name: to }, update: {} });
    // Connecting an item that already has the tag is a no-op, which is what makes a merge safe
    await tx.tag.update({ where: { id: target.id }, data: { items: { connect: ids } } });
    await tx.tag.update({ where: { name: from }, data: { items: { disconnect: ids } } });
    // The old row goes once nobody uses it
    await tx.tag.deleteMany({ where: { name: from, items: { none: {} } } });

    return items.length;
  });
}

/** Remove a tag from all of the user's items. Returns how many items changed, or null when none had it. */
export async function deleteUserTag(userId: string, name: string): Promise<number | null> {
  return prisma.$transaction(async (tx) => {
    const items = await tx.item.findMany({
      where: { userId, tags: { some: { name } } },
      select: { id: true },
    });
    if (items.length === 0) return null;

    await tx.tag.update({
      where: { name },
      data: { items: { disconnect: items.map((item) => ({ id: item.id })) } },
    });
    await tx.tag.deleteMany({ where: { name, items: { none: {} } } });

    return items.length;
  });
}

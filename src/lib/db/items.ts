import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma/client';
import { keysetOrderBy, keysetWhere, readPageRequest, resolvePage, type PageInfo, type PageRequest } from '@/lib/keyset';
import { LimitReachedError, lockUserForLimit } from '@/lib/limit-error';

// Maximum allowed limit for queries to prevent abuse
const MAX_QUERY_LIMIT = 100;

/**
 * Validate and cap limit parameter
 */
function validateLimit(limit: number, defaultLimit: number): number {
  return Math.min(Math.max(1, limit), MAX_QUERY_LIMIT) || defaultLimit;
}

export interface ItemType {
  name: string;
  icon: string;
  color: string;
}

export interface ItemTypeWithCount extends ItemType {
  count: number;
}

export interface ItemWithType {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  url: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  itemType: ItemType;
  tags: string[];
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ItemDetail {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  url: string | null;
  language: string | null;
  contentType: string;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  isFavorite: boolean;
  isPinned: boolean;
  itemType: ItemType;
  tags: string[];
  collections: { id: string; name: string }[];
  createdAt: Date;
  updatedAt: Date;
}

// Prisma item type with relations for mapping
type PrismaItemWithType = {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  url: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  createdAt: Date;
  updatedAt: Date;
  itemType: { name: string; icon: string; color: string };
  tags: { name: string }[];
};

type PrismaItemWithDetail = PrismaItemWithType & {
  language: string | null;
  contentType: string;
  collections: { collection: { id: string; name: string } }[];
};

/**
 * Transform Prisma item to ItemWithType
 */
function toItemWithType(item: PrismaItemWithType): ItemWithType {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    content: item.content,
    url: item.url,
    isFavorite: item.isFavorite,
    isPinned: item.isPinned,
    itemType: {
      name: item.itemType.name,
      icon: item.itemType.icon,
      color: item.itemType.color,
    },
    tags: item.tags.map((tag) => tag.name),
    fileUrl: item.fileUrl,
    fileName: item.fileName,
    fileSize: item.fileSize,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

/**
 * Transform Prisma item to ItemDetail
 */
function toItemDetail(item: PrismaItemWithDetail): ItemDetail {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    content: item.content,
    url: item.url,
    language: item.language,
    contentType: item.contentType,
    fileUrl: item.fileUrl,
    fileName: item.fileName,
    fileSize: item.fileSize,
    isFavorite: item.isFavorite,
    isPinned: item.isPinned,
    itemType: {
      name: item.itemType.name,
      icon: item.itemType.icon,
      color: item.itemType.color,
    },
    tags: item.tags.map((tag) => tag.name),
    collections: item.collections.map((ic) => ({
      id: ic.collection.id,
      name: ic.collection.name,
    })),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

/** How many items the user has (plan limits). */
export async function countItems(userId: string): Promise<number> {
  return prisma.item.count({ where: { userId } });
}

export interface DashboardStats {
  totalItems: number;
  totalCollections: number;
  favoriteItems: number;
  favoriteCollections: number;
}

/**
 * Get dashboard stats for a user
 */
export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const [totalItems, totalCollections, favoriteItems, favoriteCollections] =
    await Promise.all([
      prisma.item.count({ where: { userId } }),
      prisma.collection.count({ where: { userId } }),
      prisma.item.count({ where: { userId, isFavorite: true } }),
      prisma.collection.count({ where: { userId, isFavorite: true } }),
    ]);

  return {
    totalItems,
    totalCollections,
    favoriteItems,
    favoriteCollections,
  };
}

// Define the display order for item types
const ITEM_TYPE_ORDER = ['snippet', 'prompt', 'command', 'note', 'file', 'image', 'link'];

/**
 * Get system item types with counts for a user
 */
export async function getItemTypesWithCounts(
  userId: string
): Promise<ItemTypeWithCount[]> {
  const itemTypes = await prisma.itemType.findMany({
    where: { isSystem: true },
  });

  const counts = await prisma.item.groupBy({
    by: ['itemTypeId'],
    where: { userId },
    _count: { id: true },
  });

  const countMap = new Map(counts.map((c) => [c.itemTypeId, c._count.id]));

  const typesWithCounts = itemTypes.map((type) => ({
    name: type.name,
    icon: type.icon,
    color: type.color,
    count: countMap.get(type.id) || 0,
  }));

  // Sort by predefined order
  return typesWithCounts.sort((a, b) => {
    const indexA = ITEM_TYPE_ORDER.indexOf(a.name);
    const indexB = ITEM_TYPE_ORDER.indexOf(b.name);
    return indexA - indexB;
  });
}

/**
 * Get pinned items for a user
 */
export async function getPinnedItems(userId: string): Promise<ItemWithType[]> {
  const items = await prisma.item.findMany({
    where: {
      userId,
      isPinned: true,
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      itemType: true,
      tags: true,
    },
  });

  return items.map(toItemWithType);
}

/**
 * Get recent items for a user (excluding pinned items)
 */
export async function getRecentItems(
  userId: string,
  limit: number = 10
): Promise<ItemWithType[]> {
  const safeLimit = validateLimit(limit, 10);

  const items = await prisma.item.findMany({
    where: {
      userId,
      isPinned: false,
    },
    orderBy: { updatedAt: 'desc' },
    take: safeLimit,
    include: {
      itemType: true,
      tags: true,
    },
  });

  return items.map(toItemWithType);
}

/**
 * Valid item type names (singular form as stored in database)
 */
export const VALID_ITEM_TYPES = ['snippet', 'prompt', 'command', 'note', 'file', 'image', 'link'] as const;
export type ValidItemType = typeof VALID_ITEM_TYPES[number];

export interface PaginatedItems {
  items: ItemWithType[];
  totalCount: number;
  pageInfo: PageInfo;
}

/**
 * One page of items matching `where`, pinned first then by last edit, found by position
 * (`after` / `before` a row) rather than by skipping rows. See `lib/keyset.ts`.
 */
async function pageOfItems(
  where: Prisma.ItemWhereInput,
  request: PageRequest | undefined,
  limit: number
): Promise<PaginatedItems> {
  const { cursor, direction } = readPageRequest(request);
  const position = keysetWhere(cursor, direction);

  const [fetched, totalCount] = await Promise.all([
    prisma.item.findMany({
      where: position ? { AND: [where, position] } : where,
      orderBy: keysetOrderBy(direction),
      // One more than shown: its presence says there is another page
      take: limit + 1,
      include: {
        itemType: true,
        tags: true,
      },
    }),
    prisma.item.count({ where }),
  ]);

  const { rows, pageInfo } = resolvePage(fetched, limit, direction, cursor !== null);
  return { items: rows.map(toItemWithType), totalCount, pageInfo };
}

/**
 * Get items by type for a user, one page at a time
 */
export async function getItemsByType(
  userId: string,
  typeName: string,
  request?: PageRequest,
  limit: number = 21
): Promise<PaginatedItems> {
  return pageOfItems(
    { userId, itemType: { name: typeName, isSystem: true } },
    request,
    limit
  );
}

/**
 * Get items by collection ID for a user, one page at a time
 */
export async function getItemsByCollection(
  userId: string,
  collectionId: string,
  request?: PageRequest,
  limit: number = 21
): Promise<PaginatedItems> {
  return pageOfItems(
    { userId, collections: { some: { collectionId } } },
    request,
    limit
  );
}

/**
 * Get full item detail by ID for a user
 */
export async function getItemById(
  userId: string,
  itemId: string
): Promise<ItemDetail | null> {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
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

  if (!item || item.userId !== userId) {
    return null;
  }

  return toItemDetail(item);
}

/**
 * Keep only the collection ids that belong to the user, so an item can't be
 * linked into someone else's collection.
 */
async function filterOwnedCollectionIds(
  userId: string,
  collectionIds: string[]
): Promise<string[]> {
  if (collectionIds.length === 0) return [];
  const owned = await prisma.collection.findMany({
    where: { id: { in: collectionIds }, userId },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((c) => c.id));
  return [...new Set(collectionIds)].filter((id) => ownedIds.has(id));
}

export interface UpdateItemData {
  title: string;
  description: string | null;
  content: string | null;
  url: string | null;
  language: string | null;
  tags: string[];
  collectionIds?: string[];
}

/**
 * Update an item and return the updated ItemDetail
 */
export async function updateItem(
  userId: string,
  itemId: string,
  data: UpdateItemData
): Promise<ItemDetail | null> {
  // Verify ownership first
  const existing = await prisma.item.findUnique({
    where: { id: itemId },
    select: { userId: true },
  });

  if (!existing || existing.userId !== userId) {
    return null;
  }

  // Only the collections the caller owns (a read, so it stays outside the transaction)
  const collectionIds =
    data.collectionIds !== undefined
      ? await filterOwnedCollectionIds(userId, data.collectionIds)
      : undefined;

  // The collection links and the item's own fields change together or not at all:
  // a failure part-way used to leave an item with its collections wiped
  const updated = await prisma.$transaction(async (tx) => {
    // Update collections if provided (delete all existing, then create new)
    if (collectionIds !== undefined) {
      await tx.itemCollection.deleteMany({
        where: { itemId },
      });

      if (collectionIds.length > 0) {
        await tx.itemCollection.createMany({
          data: collectionIds.map((collectionId) => ({
            itemId,
            collectionId,
          })),
        });
      }
    }

    // Update item with tag disconnect/connect-or-create
    return tx.item.update({
      where: { id: itemId },
      data: {
        title: data.title,
        description: data.description,
        content: data.content,
        url: data.url,
        language: data.language,
        tags: {
          set: [], // Disconnect all existing tags
          connectOrCreate: data.tags.map((tagName) => ({
            where: { name: tagName },
            create: { name: tagName },
          })),
        },
      },
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

  return toItemDetail(updated);
}

/**
 * Delete an item by ID (with ownership check)
 * Also deletes associated file from R2 if present
 * Returns true if deleted, false if not found or not owned
 */
export async function deleteItem(
  userId: string,
  itemId: string
): Promise<boolean> {
  // Verify ownership and get file URL
  const existing = await prisma.item.findUnique({
    where: { id: itemId },
    select: { userId: true, fileUrl: true },
  });

  if (!existing || existing.userId !== userId) {
    return false;
  }

  // Delete file from R2 if present, and only ever from the owner's own folder
  if (existing.fileUrl) {
    try {
      const { deleteFromR2, isOwnedFileUrl } = await import('@/lib/r2');
      if (isOwnedFileUrl(userId, existing.fileUrl)) {
        await deleteFromR2(existing.fileUrl);
      } else {
        console.warn('Skipped R2 delete: file URL is outside the owner folder', { itemId });
      }
    } catch (error) {
      // Log but don't fail - the DB record should still be deleted
      console.error('Failed to delete file from R2:', error);
    }
  }

  await prisma.item.delete({
    where: { id: itemId },
  });

  return true;
}

export interface CreateItemData {
  typeName: ValidItemType;
  title: string;
  description: string | null;
  content: string | null;
  url: string | null;
  language: string | null;
  tags: string[];
  collectionIds?: string[];
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  /**
   * Free plan cap. When set, the count and the insert run in one transaction
   * under a lock on the user's row, and a full account throws LimitReachedError.
   */
  maxItems?: number;
}

/**
 * Get all favorite items for a user (sorted by updatedAt desc)
 */
export async function getFavoriteItems(userId: string): Promise<ItemWithType[]> {
  const items = await prisma.item.findMany({
    where: {
      userId,
      isFavorite: true,
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      itemType: true,
      tags: true,
    },
  });

  return items.map(toItemWithType);
}

/**
 * Toggle isFavorite on an item (with ownership check)
 * Returns the new isFavorite value, or null if not found/not owned
 */
export async function toggleItemFavorite(
  userId: string,
  itemId: string
): Promise<boolean | null> {
  const existing = await prisma.item.findUnique({
    where: { id: itemId },
    select: { userId: true, isFavorite: true },
  });

  if (!existing || existing.userId !== userId) {
    return null;
  }

  const updated = await prisma.item.update({
    where: { id: itemId },
    data: { isFavorite: !existing.isFavorite },
    select: { isFavorite: true },
  });

  return updated.isFavorite;
}

/**
 * Toggle isPinned on an item (with ownership check)
 * Returns the new isPinned value, or null if not found/not owned
 */
export async function toggleItemPin(
  userId: string,
  itemId: string
): Promise<boolean | null> {
  const existing = await prisma.item.findUnique({
    where: { id: itemId },
    select: { userId: true, isPinned: true },
  });

  if (!existing || existing.userId !== userId) {
    return null;
  }

  const updated = await prisma.item.update({
    where: { id: itemId },
    data: { isPinned: !existing.isPinned },
    select: { isPinned: true },
  });

  return updated.isPinned;
}

export async function createItem(
  userId: string,
  data: CreateItemData
): Promise<ItemDetail | null> {
  // Look up the item type
  const itemType = await prisma.itemType.findFirst({
    where: {
      name: data.typeName,
      isSystem: true,
    },
  });

  if (!itemType) {
    return null;
  }

  // Determine contentType based on item type
  let contentType: 'TEXT' | 'FILE' | 'URL' = 'TEXT';
  const collectionIds = await filterOwnedCollectionIds(userId, data.collectionIds ?? []);

  if (data.typeName === 'link') {
    contentType = 'URL';
  } else if (data.typeName === 'file' || data.typeName === 'image') {
    contentType = 'FILE';
  }

  const insert = (db: Pick<typeof prisma, 'item'>) =>
    db.item.create({
      data: {
        userId,
        itemTypeId: itemType.id,
        title: data.title,
        description: data.description,
        content: data.content,
        url: data.url,
        language: data.language,
        contentType,
        fileUrl: data.fileUrl ?? null,
        fileName: data.fileName ?? null,
        fileSize: data.fileSize ?? null,
        tags: {
          connectOrCreate: data.tags.map((tagName) => ({
            where: { name: tagName },
            create: { name: tagName },
          })),
        },
        collections: collectionIds.length
          ? {
              create: collectionIds.map((collectionId) => ({
                collectionId,
              })),
            }
          : undefined,
      },
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

  const maxItems = data.maxItems;
  const created =
    maxItems === undefined
      ? await insert(prisma)
      : await prisma.$transaction(async (tx) => {
          await lockUserForLimit(tx, userId);
          const count = await tx.item.count({ where: { userId } });
          if (count >= maxItems) throw new LimitReachedError('items');
          return insert(tx);
        });

  return {
    id: created.id,
    title: created.title,
    description: created.description,
    content: created.content,
    url: created.url,
    language: created.language,
    contentType: created.contentType,
    fileUrl: created.fileUrl,
    fileName: created.fileName,
    fileSize: created.fileSize,
    isFavorite: created.isFavorite,
    isPinned: created.isPinned,
    itemType: {
      name: created.itemType.name,
      icon: created.itemType.icon,
      color: created.itemType.color,
    },
    tags: created.tags.map((tag) => tag.name),
    collections: created.collections.map((ic) => ({
      id: ic.collection.id,
      name: ic.collection.name,
    })),
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  };
}

export interface ItemCollectionOption {
  id: string;
  name: string;
  /** Whether the item is already in this collection */
  inCollection: boolean;
}

/**
 * The user's collections, each marked with whether the item is in it (for the
 * card's "Add to" menu). Null when the item isn't the user's.
 */
export async function getCollectionsForItem(
  userId: string,
  itemId: string
): Promise<ItemCollectionOption[] | null> {
  const item = await prisma.item.findFirst({
    where: { id: itemId, userId },
    select: { collections: { select: { collectionId: true } } },
  });
  if (!item) return null;

  const collections = await prisma.collection.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });
  const current = new Set(item.collections.map((c) => c.collectionId));
  return collections.map((c) => ({ ...c, inCollection: current.has(c.id) }));
}

export interface ItemCollectionChange {
  collectionName: string;
  inCollection: boolean;
  /** False when it was already that way (added twice, removed when absent) */
  changed: boolean;
}

/**
 * Puts an item in a collection (`add`) or takes it out, leaving its other
 * collections alone. Both the item and the collection must be the user's;
 * otherwise null.
 */
export async function setItemInCollection(
  userId: string,
  itemId: string,
  collectionId: string,
  add: boolean
): Promise<ItemCollectionChange | null> {
  const [item, collection] = await Promise.all([
    prisma.item.findFirst({ where: { id: itemId, userId }, select: { id: true } }),
    prisma.collection.findFirst({ where: { id: collectionId, userId }, select: { name: true } }),
  ]);
  if (!item || !collection) return null;

  if (add) {
    const { count } = await prisma.itemCollection.createMany({
      data: [{ itemId, collectionId }],
      skipDuplicates: true,
    });
    return { collectionName: collection.name, inCollection: true, changed: count > 0 };
  }

  const { count } = await prisma.itemCollection.deleteMany({ where: { itemId, collectionId } });
  return { collectionName: collection.name, inCollection: false, changed: count > 0 };
}

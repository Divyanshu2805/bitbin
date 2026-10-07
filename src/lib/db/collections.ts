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

/** How many collections the user has (plan limits). */
export async function countCollections(userId: string): Promise<number> {
  return prisma.collection.count({ where: { userId } });
}

export interface CollectionItemType {
  name: string;
  icon: string;
  color: string;
  count: number;
}

export interface CollectionWithTypes {
  id: string;
  name: string;
  description: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  itemCount: number;
  itemTypes: CollectionItemType[];
  dominantColor: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Maximum items to sample per collection for type aggregation
const MAX_ITEMS_FOR_TYPE_SAMPLE = 50;

// Pinned collections lead every card list, then the most recently edited
const PINNED_FIRST = [{ isPinned: 'desc' as const }, { updatedAt: 'desc' as const }];

// Type for items with itemType info used in type counting
type ItemWithType = {
  item: {
    itemType: {
      id: string;
      name?: string;
      icon?: string;
      color: string;
    };
  };
};

/**
 * Count items by type and return sorted array with full type info
 */
function countItemTypes(items: ItemWithType[]): CollectionItemType[] {
  const typeCounts = new Map<string, CollectionItemType>();

  for (const itemCollection of items) {
    const itemType = itemCollection.item.itemType;
    const existing = typeCounts.get(itemType.id);

    if (existing) {
      existing.count++;
    } else {
      typeCounts.set(itemType.id, {
        name: itemType.name || '',
        icon: itemType.icon || '',
        color: itemType.color,
        count: 1,
      });
    }
  }

  // Sort by count (descending)
  return Array.from(typeCounts.values()).sort((a, b) => b.count - a.count);
}

/**
 * Get dominant color from items (most frequently used type's color)
 */
function getDominantColor(items: ItemWithType[]): string | null {
  const typeCounts = new Map<string, { color: string; count: number }>();

  for (const itemCollection of items) {
    const itemType = itemCollection.item.itemType;
    const existing = typeCounts.get(itemType.id);

    if (existing) {
      existing.count++;
    } else {
      typeCounts.set(itemType.id, {
        color: itemType.color,
        count: 1,
      });
    }
  }

  let dominantColor: string | null = null;
  let maxCount = 0;
  for (const { color, count } of typeCounts.values()) {
    if (count > maxCount) {
      maxCount = count;
      dominantColor = color;
    }
  }

  return dominantColor;
}

/**
 * Get recent collections for a user with item type information
 * Returns collections sorted by updatedAt, with aggregated item type data
 * Uses _count for accurate item count and limits items fetched for type aggregation
 */
export async function getRecentCollections(
  userId: string,
  limit: number = 6
): Promise<CollectionWithTypes[]> {
  const safeLimit = validateLimit(limit, 6);

  const collections = await prisma.collection.findMany({
    where: { userId },
    orderBy: PINNED_FIRST,
    take: safeLimit,
    include: {
      _count: {
        select: { items: true },
      },
      items: {
        take: MAX_ITEMS_FOR_TYPE_SAMPLE,
        include: {
          item: {
            select: {
              itemType: {
                select: {
                  id: true,
                  name: true,
                  icon: true,
                  color: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return collections.map((collection) => {
    const itemTypes = countItemTypes(collection.items);
    const dominantColor = itemTypes.length > 0 ? itemTypes[0].color : null;

    return {
      id: collection.id,
      name: collection.name,
      description: collection.description,
      isFavorite: collection.isFavorite,
      isPinned: collection.isPinned,
      itemCount: collection._count.items,
      itemTypes,
      dominantColor,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
    };
  });
}

export interface SidebarCollection {
  id: string;
  name: string;
  itemCount: number;
  isFavorite: boolean;
  dominantColor: string | null;
}

export interface SidebarCollections {
  favorites: SidebarCollection[];
  recents: SidebarCollection[];
}

// Shared include config for sidebar collections
const sidebarCollectionInclude = {
  _count: {
    select: { items: true },
  },
  items: {
    take: MAX_ITEMS_FOR_TYPE_SAMPLE,
    include: {
      item: {
        select: {
          itemType: {
            select: {
              id: true,
              color: true,
            },
          },
        },
      },
    },
  },
} as const;

type SidebarCollectionWithItems = Awaited<
  ReturnType<typeof prisma.collection.findMany<{ include: typeof sidebarCollectionInclude }>>
>[number];

/**
 * Get collections for sidebar (favorites and recents)
 * Uses parallel queries with proper limits instead of fetching all and filtering
 */
export async function getSidebarCollections(
  userId: string
): Promise<SidebarCollections> {
  // Fetch favorites and recents in parallel with proper limits
  const [favoriteCollections, recentCollections] = await Promise.all([
    prisma.collection.findMany({
      where: { userId, isFavorite: true },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: sidebarCollectionInclude,
    }),
    prisma.collection.findMany({
      where: { userId, isFavorite: false },
      orderBy: { updatedAt: 'desc' },
      take: 3,
      include: sidebarCollectionInclude,
    }),
  ]);

  const processCollection = (collection: SidebarCollectionWithItems): SidebarCollection => ({
    id: collection.id,
    name: collection.name,
    itemCount: collection._count.items,
    isFavorite: collection.isFavorite,
    dominantColor: getDominantColor(collection.items),
  });

  const favorites = favoriteCollections.map(processCollection);
  const recents = recentCollections.map(processCollection);

  return { favorites, recents };
}

export interface CreateCollectionData {
  name: string;
  description: string | null;
  /** Free plan cap, enforced atomically; a full account throws LimitReachedError */
  maxCollections?: number;
}

export interface CreatedCollection {
  id: string;
  name: string;
  description: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create a new collection for a user
 */
export interface CollectionForPicker {
  id: string;
  name: string;
}

/**
 * Get all collections for a user (for picker dropdowns)
 */
export async function getUserCollections(
  userId: string
): Promise<CollectionForPicker[]> {
  const collections = await prisma.collection.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
    },
  });

  return collections;
}

export interface PaginatedCollections {
  collections: CollectionWithTypes[];
  totalCount: number;
  pageInfo: PageInfo;
}

/**
 * Get all collections for a user with item type information, one page at a time
 * (pinned first, then by last edit; found by position, see `lib/keyset.ts`)
 */
export async function getAllCollections(
  userId: string,
  request?: PageRequest,
  limit: number = 21
): Promise<PaginatedCollections> {
  const { cursor, direction } = readPageRequest(request);
  const position = keysetWhere(cursor, direction);
  const where: Prisma.CollectionWhereInput = { userId };

  const [fetched, totalCount] = await Promise.all([
    prisma.collection.findMany({
      where: position ? { AND: [where, position] } : where,
      orderBy: keysetOrderBy(direction),
      // One more than shown: its presence says there is another page
      take: limit + 1,
      include: {
        _count: {
          select: { items: true },
        },
        items: {
          take: MAX_ITEMS_FOR_TYPE_SAMPLE,
          include: {
            item: {
              select: {
                itemType: {
                  select: {
                    id: true,
                    name: true,
                    icon: true,
                    color: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.collection.count({ where }),
  ]);

  const { rows: collections, pageInfo } = resolvePage(fetched, limit, direction, cursor !== null);

  return {
    collections: collections.map((collection) => {
      const itemTypes = countItemTypes(collection.items);
      const dominantColor = itemTypes.length > 0 ? itemTypes[0].color : null;

      return {
        id: collection.id,
        name: collection.name,
        description: collection.description,
        isFavorite: collection.isFavorite,
        isPinned: collection.isPinned,
        itemCount: collection._count.items,
        itemTypes,
        dominantColor,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt,
      };
    }),
    totalCount,
    pageInfo,
  };
}

export interface CollectionDetail {
  id: string;
  name: string;
  description: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  itemCount: number;
  itemTypes: CollectionItemType[];
  dominantColor: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get a single collection by ID with ownership check
 */
export async function getCollectionById(
  collectionId: string,
  userId: string
): Promise<CollectionDetail | null> {
  const collection = await prisma.collection.findFirst({
    where: { id: collectionId, userId },
    include: {
      _count: {
        select: { items: true },
      },
      items: {
        take: MAX_ITEMS_FOR_TYPE_SAMPLE,
        include: {
          item: {
            select: {
              itemType: {
                select: {
                  id: true,
                  name: true,
                  icon: true,
                  color: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!collection) {
    return null;
  }

  const itemTypes = countItemTypes(collection.items);
  const dominantColor = itemTypes.length > 0 ? itemTypes[0].color : null;

  return {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    isFavorite: collection.isFavorite,
    isPinned: collection.isPinned,
    itemCount: collection._count.items,
    itemTypes,
    dominantColor,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
  };
}

export async function createCollection(
  userId: string,
  data: CreateCollectionData
): Promise<CreatedCollection> {
  const insert = {
    data: {
      userId,
      name: data.name,
      description: data.description,
    },
  };

  const maxCollections = data.maxCollections;
  const created =
    maxCollections === undefined
      ? await prisma.collection.create(insert)
      : await prisma.$transaction(async (tx) => {
          await lockUserForLimit(tx, userId);
          const count = await tx.collection.count({ where: { userId } });
          if (count >= maxCollections) throw new LimitReachedError('collections');
          return tx.collection.create(insert);
        });

  return {
    id: created.id,
    name: created.name,
    description: created.description,
    isFavorite: created.isFavorite,
    isPinned: created.isPinned,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  };
}

export interface UpdateCollectionData {
  name: string;
  description: string | null;
}

/**
 * Update a collection (with ownership check)
 */
export async function updateCollection(
  collectionId: string,
  userId: string,
  data: UpdateCollectionData
): Promise<CreatedCollection | null> {
  // First verify ownership
  const existing = await prisma.collection.findFirst({
    where: { id: collectionId, userId },
  });

  if (!existing) {
    return null;
  }

  const updated = await prisma.collection.update({
    where: { id: collectionId },
    data: {
      name: data.name,
      description: data.description,
    },
  });

  return {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    isFavorite: updated.isFavorite,
    isPinned: updated.isPinned,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
}

/**
 * Delete a collection (with ownership check)
 * Note: Items are NOT deleted, only the ItemCollection join records are removed (via cascade)
 */
export async function deleteCollection(
  collectionId: string,
  userId: string
): Promise<boolean> {
  // First verify ownership
  const existing = await prisma.collection.findFirst({
    where: { id: collectionId, userId },
  });

  if (!existing) {
    return false;
  }

  await prisma.collection.delete({
    where: { id: collectionId },
  });

  return true;
}

/**
 * Toggle isFavorite on a collection (with ownership check)
 * Returns the new isFavorite value, or null if not found/not owned
 */
export async function toggleCollectionFavorite(
  collectionId: string,
  userId: string
): Promise<boolean | null> {
  const existing = await prisma.collection.findFirst({
    where: { id: collectionId, userId },
    select: { isFavorite: true },
  });

  if (!existing) {
    return null;
  }

  const updated = await prisma.collection.update({
    where: { id: collectionId },
    data: { isFavorite: !existing.isFavorite },
    select: { isFavorite: true },
  });

  return updated.isFavorite;
}

/**
 * Toggle isPinned on a collection (with ownership check)
 * Returns the new isPinned value, or null if not found/not owned
 */
export async function toggleCollectionPin(
  collectionId: string,
  userId: string
): Promise<boolean | null> {
  const existing = await prisma.collection.findFirst({
    where: { id: collectionId, userId },
    select: { isPinned: true },
  });

  if (!existing) {
    return null;
  }

  const updated = await prisma.collection.update({
    where: { id: collectionId },
    data: { isPinned: !existing.isPinned },
    select: { isPinned: true },
  });

  return updated.isPinned;
}

/**
 * Get all favorite collections for a user (sorted by updatedAt desc), in the
 * same shape as the collections page so they render as cards or rows
 */
export async function getFavoriteCollections(
  userId: string
): Promise<CollectionWithTypes[]> {
  const collections = await prisma.collection.findMany({
    where: {
      userId,
      isFavorite: true,
    },
    orderBy: PINNED_FIRST,
    include: {
      _count: {
        select: { items: true },
      },
      items: {
        take: MAX_ITEMS_FOR_TYPE_SAMPLE,
        include: {
          item: {
            select: {
              itemType: {
                select: { id: true, name: true, icon: true, color: true },
              },
            },
          },
        },
      },
    },
  });

  return collections.map((collection) => {
    const itemTypes = countItemTypes(collection.items);
    return {
      id: collection.id,
      name: collection.name,
      description: collection.description,
      isFavorite: collection.isFavorite,
      isPinned: collection.isPinned,
      itemCount: collection._count.items,
      itemTypes,
      dominantColor: itemTypes.length > 0 ? itemTypes[0].color : null,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
    };
  });
}

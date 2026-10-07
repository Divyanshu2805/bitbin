import { prisma } from '@/lib/prisma';
import { MAX_COLLECTIONS, MAX_ITEMS } from '@/lib/constants/plan';
import { lockUserForLimit } from '@/lib/limit-error';
import { isOwnedFileUrl } from '@/lib/r2';
import { isDuplicateItem, parseExportDate, type ItemIdentity } from '@/lib/import-utils';
import type { ImportData, ImportResult } from '@/lib/import-schema';

/** What identifies each of the user's items, to tell which entries of an import file they already have. */
export async function getItemIdentities(userId: string): Promise<ItemIdentity[]> {
  const items = await prisma.item.findMany({
    where: { userId },
    select: {
      title: true,
      content: true,
      url: true,
      fileName: true,
      itemType: { select: { name: true } },
    },
  });

  return items.map((i) => ({
    title: i.title,
    type: i.itemType.name,
    content: i.content,
    url: i.url,
    fileName: i.fileName,
  }));
}

/**
 * Write an export file into the user's library. Free accounts are held to their caps, counted
 * again under a lock on the user row so a concurrent create or import can't push them past
 * it; duplicates (same title, type and content) are skipped when asked. A file reference is
 * kept only when it points at the user's own storage folder.
 */
export async function importLibrary(
  userId: string,
  isPro: boolean,
  data: ImportData,
  skipDuplicates: boolean
): Promise<ImportResult> {
  // Get current usage for free tier limits
  const [currentItemCount, currentCollectionCount] = await Promise.all([
    prisma.item.count({ where: { userId } }),
    prisma.collection.count({ where: { userId } }),
  ]);

  // Filter out file/image types for free users
  let importableItems = data.items;
  if (!isPro) {
    importableItems = importableItems.filter(
      (item) => item.type !== 'file' && item.type !== 'image'
    );
  }

  // Enforce free tier limits
  let itemLimit = importableItems.length;
  let collectionLimit = data.collections.length;

  if (!isPro) {
    const remainingItems = Math.max(0, MAX_ITEMS - currentItemCount);
    const remainingCollections = Math.max(0, MAX_COLLECTIONS - currentCollectionCount);
    itemLimit = Math.min(itemLimit, remainingItems);
    collectionLimit = Math.min(collectionLimit, remainingCollections);
  }

  // Get existing items for duplicate detection
  const existingItems: ItemIdentity[] = skipDuplicates ? await getItemIdentities(userId) : [];

  // Get existing collection names for duplicate detection
  const existingCollections = await prisma.collection.findMany({
    where: { userId },
    select: { name: true },
  });
  const existingCollectionNames = new Set(existingCollections.map((c) => c.name));

  // Fetch system item types
  const systemTypes = await prisma.itemType.findMany({
    where: { isSystem: true },
  });
  const typeMap = new Map(systemTypes.map((t) => [t.name, t.id]));

  let itemsImported = 0;
  let collectionsImported = 0;
  let itemsSkipped = 0;
  let collectionsSkipped = 0;

  await prisma.$transaction(async (tx) => {
    // A Free account's room is counted again under a lock on the user row, so a
    // concurrent create or import can't push it past the cap between the count
    // above and these inserts
    if (!isPro) {
      await lockUserForLimit(tx, userId);
      const [lockedItemCount, lockedCollectionCount] = await Promise.all([
        tx.item.count({ where: { userId } }),
        tx.collection.count({ where: { userId } }),
      ]);
      itemLimit = Math.min(importableItems.length, Math.max(0, MAX_ITEMS - lockedItemCount));
      collectionLimit = Math.min(data.collections.length, Math.max(0, MAX_COLLECTIONS - lockedCollectionCount));
    }

    // 1. Create collections first
    const collectionNameToId = new Map<string, string>();

    // Map existing collections
    const allExistingCollections = await tx.collection.findMany({
      where: { userId },
      select: { id: true, name: true },
    });
    for (const c of allExistingCollections) {
      collectionNameToId.set(c.name, c.id);
    }

    for (let i = 0; i < data.collections.length; i++) {
      const collection = data.collections[i];

      if (existingCollectionNames.has(collection.name)) {
        collectionsSkipped++;
        continue;
      }

      if (collectionsImported >= collectionLimit) {
        collectionsSkipped++;
        continue;
      }

      const created = await tx.collection.create({
        data: {
          userId,
          name: collection.name,
          description: collection.description,
          isFavorite: collection.isFavorite,
          isPinned: collection.isPinned,
        },
      });

      collectionNameToId.set(collection.name, created.id);
      collectionsImported++;
    }

    // 2. Create items with tags and collection assignments
    for (let i = 0; i < importableItems.length; i++) {
      if (itemsImported >= itemLimit) {
        itemsSkipped++;
        continue;
      }

      const item = importableItems[i];

      // Check for duplicates
      const identity: ItemIdentity = {
        title: item.title,
        type: item.type,
        content: item.content,
        url: item.url,
        fileName: item.fileName,
      };
      if (skipDuplicates) {
        // Against what's already saved, and against earlier entries of this same file
        if (existingItems.some((existing) => isDuplicateItem(existing, identity))) {
          itemsSkipped++;
          continue;
        }
      }

      const itemTypeId = typeMap.get(item.type);
      if (!itemTypeId) {
        itemsSkipped++;
        continue;
      }

      // Determine contentType
      let contentType: 'TEXT' | 'FILE' | 'URL' = 'TEXT';
      if (item.type === 'link') contentType = 'URL';
      else if (item.type === 'file' || item.type === 'image') contentType = 'FILE';

      // Resolve collection IDs for this item
      const itemCollectionIds: string[] = [];
      for (const collName of item.collections) {
        const collId = collectionNameToId.get(collName);
        if (collId) itemCollectionIds.push(collId);
      }

      // Preserve file references for file/image types (Pro users only)
      const isFileType = item.type === 'file' || item.type === 'image';

      await tx.item.create({
        data: {
          userId,
          itemTypeId,
          title: item.title,
          content: item.content,
          language: item.language,
          description: item.description,
          url: item.url,
          contentType,
          isFavorite: item.isFavorite,
          isPinned: item.isPinned,
          // Keep the original dates when the file has them (updatedAt falls back to createdAt)
          createdAt: parseExportDate(item.createdAt),
          updatedAt: parseExportDate(item.updatedAt) ?? parseExportDate(item.createdAt),
          fileUrl: isFileType && isOwnedFileUrl(userId, item.fileUrl) ? item.fileUrl : null,
          fileName: isFileType ? item.fileName : null,
          fileSize: isFileType ? item.fileSize : null,
          tags: {
            connectOrCreate: item.tags.map((tagName) => ({
              where: { name: tagName },
              create: { name: tagName },
            })),
          },
          collections: itemCollectionIds.length > 0
            ? {
                create: itemCollectionIds.map((collectionId) => ({
                  collectionId,
                })),
              }
            : undefined,
        },
      });

      if (skipDuplicates) existingItems.push(identity);
      itemsImported++;
    }
  });

  return { itemsImported, collectionsImported, itemsSkipped, collectionsSkipped };
}

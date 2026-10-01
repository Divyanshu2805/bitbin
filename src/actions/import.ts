'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { VALID_ITEM_TYPES } from '@/lib/db/items';
import { MAX_ITEMS, MAX_COLLECTIONS } from '@/lib/usage';
import { getAuthedSession, type ActionResult } from '@/lib/action-utils';
import {
  isValidUrlProtocol,
  MAX_CONTENT_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_FILE_NAME_LENGTH,
  MAX_LANGUAGE_LENGTH,
  MAX_TAG_LENGTH,
  MAX_TAGS_PER_ITEM,
  MAX_TITLE_LENGTH,
} from '@/lib/validation';

/** Most items or collections one import file may hold */
const MAX_IMPORT_ENTRIES = 5000;
import { isOwnedFileUrl } from '@/lib/r2';
import { lockUserForLimit } from '@/lib/limit-error';

const importItemSchema = z.object({
  title: z.string().min(1).max(MAX_TITLE_LENGTH),
  type: z.enum(VALID_ITEM_TYPES),
  content: z.string().max(MAX_CONTENT_LENGTH).nullable().optional().default(null),
  language: z.string().max(MAX_LANGUAGE_LENGTH).nullable().optional().default(null),
  // Older exports may hold longer descriptions: cut to the cap rather than fail the import
  description: z
    .string()
    .nullable()
    .optional()
    .default(null)
    .transform((val) => (val ? val.slice(0, MAX_DESCRIPTION_LENGTH) : val)),
  // Same rule as safeUrlSchema: only http(s) links are kept (a javascript: URL becomes none)
  url: z
    .string()
    .nullable()
    .optional()
    .default(null)
    .transform((val) => (val && isValidUrlProtocol(val) ? val : null)),
  fileName: z.string().max(MAX_FILE_NAME_LENGTH).nullable().optional().default(null),
  fileSize: z.number().nullable().optional().default(null),
  fileUrl: z.string().nullable().optional().default(null),
  tags: z
    .array(z.string().trim().min(1).max(MAX_TAG_LENGTH))
    .max(MAX_TAGS_PER_ITEM)
    .optional()
    .default([]),
  collections: z.array(z.string().max(100)).max(100).optional().default([]),
  isFavorite: z.boolean().optional().default(false),
  isPinned: z.boolean().optional().default(false),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const importCollectionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional().default(null),
  isFavorite: z.boolean().optional().default(false),
  isPinned: z.boolean().optional().default(false),
});

const importDataSchema = z.object({
  version: z.number(),
  exportedAt: z.string().optional(),
  items: z.array(importItemSchema).max(MAX_IMPORT_ENTRIES),
  collections: z.array(importCollectionSchema).max(MAX_IMPORT_ENTRIES),
});

export type ImportInput = z.infer<typeof importDataSchema>;

export interface ImportPreview {
  itemCountsByType: Record<string, number>;
  collectionCount: number;
  tagCount: number;
  totalItems: number;
}

export interface ImportResult {
  itemsImported: number;
  collectionsImported: number;
  itemsSkipped: number;
  collectionsSkipped: number;
}

/**
 * Parse and preview an import file without importing
 */
export async function previewImport(
  jsonString: string
): Promise<ActionResult<ImportPreview>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;
  // session used for auth check only
  void session;

  let raw: unknown;
  try {
    raw = JSON.parse(jsonString);
  } catch {
    return { success: false, error: 'Invalid JSON file' };
  }

  const parsed = importDataSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: 'Invalid export format. Please use a file exported from BitBin.' };
  }

  const data = parsed.data;
  const itemCountsByType: Record<string, number> = {};
  const allTags = new Set<string>();

  for (const item of data.items) {
    itemCountsByType[item.type] = (itemCountsByType[item.type] || 0) + 1;
    for (const tag of item.tags) {
      allTags.add(tag);
    }
  }

  return {
    success: true,
    data: {
      itemCountsByType,
      collectionCount: data.collections.length,
      tagCount: allTags.size,
      totalItems: data.items.length,
    },
  };
}

/**
 * Import data from a BitBin export JSON
 */
export async function importData(
  jsonString: string,
  skipDuplicates: boolean
): Promise<ActionResult<ImportResult>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  let raw: unknown;
  try {
    raw = JSON.parse(jsonString);
  } catch {
    return { success: false, error: 'Invalid JSON file' };
  }

  const parsed = importDataSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: 'Invalid export format. Please use a file exported from BitBin.' };
  }

  const data = parsed.data;
  const userId = session.user.id;
  const isPro = session.user.isPro ?? false;

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
  let existingItems: { title: string; typeName: string; content: string | null; url: string | null }[] = [];
  if (skipDuplicates) {
    existingItems = await prisma.item.findMany({
      where: { userId },
      select: {
        title: true,
        content: true,
        url: true,
        itemType: { select: { name: true } },
      },
    }).then((items) =>
      items.map((i) => ({
        title: i.title,
        typeName: i.itemType.name,
        content: i.content,
        url: i.url,
      }))
    );
  }

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
      if (skipDuplicates) {
        const isDuplicate = existingItems.some(
          (existing) =>
            existing.title === item.title &&
            existing.typeName === item.type &&
            (existing.content === item.content || existing.url === item.url)
        );
        if (isDuplicate) {
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

      itemsImported++;
    }
  });

  return {
    success: true,
    data: {
      itemsImported,
      collectionsImported,
      itemsSkipped,
      collectionsSkipped,
    },
  };
}

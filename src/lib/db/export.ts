import { prisma } from '@/lib/prisma';

export interface ExportItem {
  title: string;
  type: string;
  content: string | null;
  language: string | null;
  description: string | null;
  url: string | null;
  fileName: string | null;
  fileSize: number | null;
  fileUrl: string | null;
  /** Where the file sits inside an export ZIP; set only when the ZIP is built */
  zipPath?: string | null;
  tags: string[];
  collections: string[];
  isFavorite: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExportCollection {
  name: string;
  description: string | null;
  isFavorite: boolean;
  isPinned: boolean;
}

export interface ExportData {
  version: number;
  exportedAt: string;
  items: ExportItem[];
  collections: ExportCollection[];
}

const itemExportInclude = {
  itemType: { select: { name: true } },
  tags: { select: { name: true } },
  collections: {
    include: {
      collection: { select: { name: true } },
    },
  },
} as const;

const collectionExportSelect = {
  name: true,
  description: true,
  isFavorite: true,
  isPinned: true,
} as const;

type ExportedItemRow = Awaited<ReturnType<typeof findItemsForExport>>[number];

function findItemsForExport(where: { userId: string; collections?: { some: { collectionId: string } } }) {
  return prisma.item.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    include: itemExportInclude,
  });
}

function toExportItem(item: ExportedItemRow, onlyCollection?: string): ExportItem {
  const collections = item.collections.map((ic) => ic.collection.name);
  return {
    title: item.title,
    type: item.itemType.name,
    content: item.content,
    language: item.language,
    description: item.description,
    url: item.url,
    fileName: item.fileName,
    fileSize: item.fileSize,
    fileUrl: item.fileUrl,
    tags: item.tags.map((t) => t.name),
    // A single-collection export mentions only that collection, not the user's others
    collections: onlyCollection === undefined ? collections : collections.filter((name) => name === onlyCollection),
    isFavorite: item.isFavorite,
    isPinned: item.isPinned,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

/**
 * Fetch all user data for export
 */
export async function getUserExportData(userId: string): Promise<ExportData> {
  const [items, collections] = await Promise.all([
    findItemsForExport({ userId }),
    prisma.collection.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: collectionExportSelect,
    }),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    items: items.map((item) => toExportItem(item)),
    collections: collections.map((c) => ({ ...c })),
  };
}

/**
 * One collection and the items in it, in the same format as a full export so the same importer
 * reads it. Returns null when the collection doesn't exist or isn't the caller's.
 */
export async function getCollectionExportData(userId: string, collectionId: string): Promise<ExportData | null> {
  const collection = await prisma.collection.findFirst({
    where: { id: collectionId, userId },
    select: collectionExportSelect,
  });
  if (!collection) return null;

  const items = await findItemsForExport({
    userId,
    collections: { some: { collectionId } },
  });

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    items: items.map((item) => toExportItem(item, collection.name)),
    collections: [{ ...collection }],
  };
}

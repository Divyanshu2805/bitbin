import { z } from 'zod';
import { VALID_ITEM_TYPES } from '@/lib/db/items';
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
export const MAX_IMPORT_ENTRIES = 5000;

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
  // Where the file sits inside an export ZIP (only meaningful when importing that ZIP)
  zipPath: z.string().max(300).nullable().optional().default(null),
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

export const importDataSchema = z.object({
  version: z.number(),
  exportedAt: z.string().optional(),
  items: z.array(importItemSchema).max(MAX_IMPORT_ENTRIES),
  collections: z.array(importCollectionSchema).max(MAX_IMPORT_ENTRIES),
});

export type ImportData = z.infer<typeof importDataSchema>;
export type ImportItem = ImportData['items'][number];

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

export const INVALID_IMPORT_FORMAT = 'Invalid export format. Please use a file exported from BitBin.';

/** Validate an export manifest (a JSON export, or the JSON inside an export ZIP). */
export function parseImportData(raw: unknown): { ok: true; data: ImportData } | { ok: false } {
  const parsed = importDataSchema.safeParse(raw);
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false };
}

/** What an import file holds, for the confirmation step. */
export function buildImportPreview(data: ImportData): ImportPreview {
  const itemCountsByType: Record<string, number> = {};
  const allTags = new Set<string>();

  for (const item of data.items) {
    itemCountsByType[item.type] = (itemCountsByType[item.type] || 0) + 1;
    for (const tag of item.tags) allTags.add(tag);
  }

  return {
    itemCountsByType,
    collectionCount: data.collections.length,
    tagCount: allTags.size,
    totalItems: data.items.length,
  };
}

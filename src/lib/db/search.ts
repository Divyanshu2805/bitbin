import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';

/**
 * The ⌘K palette's queries. The database does the matching: a case-insensitive "contains" over
 * the title, content, description, URL and tag names (GIN trigram indexes make that fast, see the
 * `add_search_trigram_indexes` migration), and only the few best rows are sent to the browser.
 * Every query is scoped by the user id.
 */

export interface SearchableItem {
  id: string;
  title: string;
  typeName: string;
  typeIcon: string;
  typeColor: string;
  contentPreview: string | null;
  tags: string[];
}

export interface SearchableCollection {
  id: string;
  name: string;
  itemCount: number;
}

/** Longest search text accepted */
export const MAX_SEARCH_LENGTH = 100;
const DEFAULT_ITEM_LIMIT = 20;
const DEFAULT_COLLECTION_LIMIT = 8;
const RECENT_ITEM_LIMIT = 8;
const RECENT_COLLECTION_LIMIT = 5;
const PREVIEW_LENGTH = 100;

/**
 * A LIKE pattern that matches `text` literally anywhere: the characters LIKE treats as wildcards
 * (`%`, `_`) and its escape character (`\`) are escaped, so searching for "50%" finds "50%", not "50".
 */
export function containsPattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, '\\$&')}%`;
}

/**
 * What was typed: "#react" looks only at tags, anything else at the text fields and the tags.
 */
export function parseSearch(raw: string): { text: string; tagsOnly: boolean } | null {
  const trimmed = raw.trim().slice(0, MAX_SEARCH_LENGTH);
  if (trimmed.startsWith('#')) {
    const tag = trimmed.slice(1).trim();
    return tag ? { text: tag, tagsOnly: true } : null;
  }
  return trimmed ? { text: trimmed, tagsOnly: false } : null;
}

interface ItemRow {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  // Only the first 101 characters of the content leave the database (101, so a 100-character
  // preview can tell whether it was cut)
  snippet: string | null;
  typeName: string;
  typeIcon: string;
  typeColor: string;
  tags: string[];
}

function toSearchableItem(row: ItemRow): SearchableItem {
  const source = row.snippet || row.description || row.url || '';
  return {
    id: row.id,
    title: row.title,
    typeName: row.typeName,
    typeIcon: row.typeIcon,
    typeColor: row.typeColor,
    contentPreview: source.length > PREVIEW_LENGTH ? `${source.slice(0, PREVIEW_LENGTH)}...` : source || null,
    tags: row.tags,
  };
}

const itemColumns = Prisma.sql`
  i.id, i.title, i.description, i.url,
  left(i.content, 101) AS snippet,
  t.name AS "typeName", t.icon AS "typeIcon", t.color AS "typeColor",
  COALESCE(
    (SELECT array_agg(g.name ORDER BY g.name) FROM "_ItemTags" it JOIN "tags" g ON g.id = it."B" WHERE it."A" = i.id),
    ARRAY[]::text[]
  ) AS tags`;

/**
 * Items matching what was typed: title matches first, then the most recently edited.
 */
export async function searchItems(
  userId: string,
  raw: string,
  limit: number = DEFAULT_ITEM_LIMIT
): Promise<SearchableItem[]> {
  const search = parseSearch(raw);
  if (!search) return [];

  const pattern = containsPattern(search.text);
  const tagMatch = Prisma.sql`EXISTS (
    SELECT 1 FROM "_ItemTags" it JOIN "tags" g ON g.id = it."B"
    WHERE it."A" = i.id AND g.name ILIKE ${pattern}
  )`;

  const rows = search.tagsOnly
    ? await prisma.$queryRaw<ItemRow[]>`
        SELECT ${itemColumns}
        FROM "items" i JOIN "item_types" t ON t.id = i."itemTypeId"
        WHERE i."userId" = ${userId} AND ${tagMatch}
        ORDER BY i."updatedAt" DESC
        LIMIT ${limit}`
    : await prisma.$queryRaw<ItemRow[]>`
        SELECT ${itemColumns}
        FROM "items" i JOIN "item_types" t ON t.id = i."itemTypeId"
        WHERE i."userId" = ${userId} AND (
          i.title ILIKE ${pattern} OR i.content ILIKE ${pattern}
          OR i.description ILIKE ${pattern} OR i.url ILIKE ${pattern} OR ${tagMatch}
        )
        ORDER BY (i.title ILIKE ${pattern}) DESC, i."updatedAt" DESC
        LIMIT ${limit}`;

  return rows.map(toSearchableItem);
}

/** The most recently edited items, shown before anything is typed. */
export async function getRecentSearchableItems(
  userId: string,
  limit: number = RECENT_ITEM_LIMIT
): Promise<SearchableItem[]> {
  const rows = await prisma.$queryRaw<ItemRow[]>`
    SELECT ${itemColumns}
    FROM "items" i JOIN "item_types" t ON t.id = i."itemTypeId"
    WHERE i."userId" = ${userId}
    ORDER BY i."updatedAt" DESC
    LIMIT ${limit}`;
  return rows.map(toSearchableItem);
}

interface CollectionRow {
  id: string;
  name: string;
  itemCount: number;
}

/** Collections whose name contains what was typed, most recently edited first. */
export async function searchCollections(
  userId: string,
  raw: string,
  limit: number = DEFAULT_COLLECTION_LIMIT
): Promise<SearchableCollection[]> {
  const search = parseSearch(raw);
  // A "#tag" search is for items
  if (!search || search.tagsOnly) return [];

  return prisma.$queryRaw<CollectionRow[]>`
    SELECT c.id, c.name,
      (SELECT count(*) FROM "item_collections" ic WHERE ic."collectionId" = c.id)::int AS "itemCount"
    FROM "collections" c
    WHERE c."userId" = ${userId} AND c.name ILIKE ${containsPattern(search.text)}
    ORDER BY c."updatedAt" DESC
    LIMIT ${limit}`;
}

/** The most recently edited collections, shown before anything is typed. */
export async function getRecentSearchableCollections(
  userId: string,
  limit: number = RECENT_COLLECTION_LIMIT
): Promise<SearchableCollection[]> {
  return prisma.$queryRaw<CollectionRow[]>`
    SELECT c.id, c.name,
      (SELECT count(*) FROM "item_collections" ic WHERE ic."collectionId" = c.id)::int AS "itemCount"
    FROM "collections" c
    WHERE c."userId" = ${userId}
    ORDER BY c."updatedAt" DESC
    LIMIT ${limit}`;
}

import type { ItemDetail } from '@/lib/db/items';
import { getRecentSearchableItems, searchItems, type SearchableItem } from '@/lib/db/search';

/**
 * How the token API (`GET /api/v1/items`, `GET /api/v1/items/{id}`) and the MCP
 * endpoint hand items to a client. One shape for both, so they can't drift apart.
 */

/** Most results one search returns */
export const API_SEARCH_MAX = 20;
const API_SEARCH_DEFAULT = 10;

export interface ApiItemSummary {
  id: string;
  title: string;
  typeName: string;
  /** The first 100 characters of the content, or the URL of a link */
  preview: string | null;
  tags: string[];
}

export interface ApiItem {
  id: string;
  title: string;
  typeName: string;
  description: string | null;
  content: string | null;
  url: string | null;
  language: string | null;
  tags: string[];
  collections: { id: string; name: string }[];
  /** Files and images: the name and size only. The bytes stay behind the signed-in download route. */
  fileName: string | null;
  fileSize: number | null;
  isFavorite: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

function toSummary(item: SearchableItem): ApiItemSummary {
  return { id: item.id, title: item.title, typeName: item.typeName, preview: item.contentPreview, tags: item.tags };
}

/** A whole number of results between 1 and API_SEARCH_MAX; anything else becomes the default. */
export function clampSearchLimit(value: unknown): number {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isInteger(n)) return API_SEARCH_DEFAULT;
  return Math.min(Math.max(n, 1), API_SEARCH_MAX);
}

/**
 * The caller's items matching `query` ("#tag" looks only at tags), or the most recently edited
 * ones when nothing is asked for. The same search as the ⌘K palette.
 */
export async function searchApiItems(userId: string, query: string, limit: number): Promise<ApiItemSummary[]> {
  const items = query.trim() ? await searchItems(userId, query, limit) : await getRecentSearchableItems(userId, limit);
  return items.map(toSummary);
}

/** A full item, without the stored file's address: the bucket is private. */
export function toApiItem(item: ItemDetail): ApiItem {
  return {
    id: item.id,
    title: item.title,
    typeName: item.itemType.name,
    description: item.description,
    content: item.content,
    url: item.url,
    language: item.language,
    tags: item.tags,
    collections: item.collections,
    fileName: item.fileName,
    fileSize: item.fileSize,
    isFavorite: item.isFavorite,
    isPinned: item.isPinned,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

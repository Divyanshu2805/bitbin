'use server';

import { z } from 'zod';
import {
  getRecentSearchableCollections,
  getRecentSearchableItems,
  MAX_SEARCH_LENGTH,
  searchCollections,
  searchItems,
  type SearchableCollection,
  type SearchableItem,
} from '@/lib/db/search';
import { checkActionRateLimit, getAuthedSession, type ActionResult } from '@/lib/action-utils';

export interface SearchData {
  items: SearchableItem[];
  collections: SearchableCollection[];
}

const querySchema = z.string().max(MAX_SEARCH_LENGTH * 4);

/**
 * The ⌘K palette's search. With nothing typed it returns the most recently edited items and
 * collections; otherwise the best matches for the text ("#tag" looks only at tags). The database
 * matches and ranks, so only a handful of rows ever reach the browser.
 */
export async function searchLibrary(query: string): Promise<ActionResult<SearchData>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const parsed = querySchema.safeParse(query);
  if (!parsed.success) return { success: false, error: 'Search text is too long' };

  const limited = await checkActionRateLimit('search', session.user.id, 'searches');
  if (limited) return limited;

  try {
    const typed = parsed.data.trim().length > 0;
    const [items, collections] = await Promise.all(
      typed
        ? [searchItems(session.user.id, parsed.data), searchCollections(session.user.id, parsed.data)]
        : [getRecentSearchableItems(session.user.id), getRecentSearchableCollections(session.user.id)]
    );

    return { success: true, data: { items, collections } };
  } catch (error) {
    console.error('Search failed:', error);
    return { success: false, error: 'Search failed' };
  }
}

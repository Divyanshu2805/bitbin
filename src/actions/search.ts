'use server';

import {
  getSearchableItems,
  type SearchableItem,
} from '@/lib/db/items';
import {
  getSearchableCollections,
  type SearchableCollection,
} from '@/lib/db/collections';
import { getAuthedSession, type ActionResult } from '@/lib/action-utils';

export interface SearchData {
  items: SearchableItem[];
  collections: SearchableCollection[];
}

export async function getSearchData(): Promise<ActionResult<SearchData>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  try {
    const [items, collections] = await Promise.all([
      getSearchableItems(session.user.id),
      getSearchableCollections(session.user.id),
    ]);

    return {
      success: true,
      data: { items, collections },
    };
  } catch {
    return { success: false, error: 'Failed to fetch search data' };
  }
}

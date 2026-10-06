'use server';

import { z } from 'zod';
import {
  updateItem as updateItemQuery,
  deleteItem as deleteItemQuery,
  toggleItemFavorite as toggleItemFavoriteQuery,
  toggleItemPin as toggleItemPinQuery,
  getCollectionsForItem as getCollectionsForItemQuery,
  getItemById as getItemByIdQuery,
  setItemInCollection as setItemInCollectionQuery,
  type ItemDetail,
  type ItemCollectionOption,
  type ItemCollectionChange,
} from '@/lib/db/items';
import {
  collectionIdsSchema,
  contentSchema,
  descriptionSchema,
  languageSchema,
  parseZodErrors,
  safeUrlSchema,
  tagsSchema,
  titleSchema,
  validateId,
} from '@/lib/validation';
import { createItemForUser, type CreateItemInput } from '@/lib/item-create';
import { checkActionRateLimit, getAuthedSession, type ActionResult } from '@/lib/action-utils';
import { demoItemRestriction, isDemoEmail } from '@/lib/demo';

const updateItemSchema = z.object({
  title: titleSchema,
  description: descriptionSchema,
  content: contentSchema,
  url: safeUrlSchema,
  language: languageSchema,
  tags: tagsSchema,
  collectionIds: collectionIdsSchema,
});

export type UpdateItemInput = z.infer<typeof updateItemSchema>;

export async function updateItem(
  itemId: string,
  input: UpdateItemInput
): Promise<ActionResult<ItemDetail>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const parsed = updateItemSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: 'Validation failed', fieldErrors: parseZodErrors(parsed.error) };
  }

  // The shared demo account: no new or changed links, no huge pastes (everyone sees what is saved)
  if (isDemoEmail(session.user.email)) {
    const existing = await getItemByIdQuery(session.user.id, itemId);
    const restriction = demoItemRestriction(parsed.data, existing?.url);
    if (restriction) return { success: false, error: restriction };
  }

  const updated = await updateItemQuery(session.user.id, itemId, parsed.data);

  if (!updated) {
    return { success: false, error: 'Item not found or access denied' };
  }

  return { success: true, data: updated };
}

export async function deleteItem(
  itemId: string
): Promise<ActionResult<null>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const idError = validateId(itemId, 'item ID');
  if (idError) return idError;

  const deleted = await deleteItemQuery(session.user.id, itemId);

  if (!deleted) {
    return { success: false, error: 'Item not found or access denied' };
  }

  return { success: true };
}

export async function toggleItemFavorite(
  itemId: string
): Promise<ActionResult<{ isFavorite: boolean }>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const idError = validateId(itemId, 'item ID');
  if (idError) return idError;

  const isFavorite = await toggleItemFavoriteQuery(session.user.id, itemId);

  if (isFavorite === null) {
    return { success: false, error: 'Item not found or access denied' };
  }

  return { success: true, data: { isFavorite } };
}

export async function toggleItemPin(
  itemId: string
): Promise<ActionResult<{ isPinned: boolean }>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const idError = validateId(itemId, 'item ID');
  if (idError) return idError;

  const isPinned = await toggleItemPinQuery(session.user.id, itemId);

  if (isPinned === null) {
    return { success: false, error: 'Item not found or access denied' };
  }

  return { success: true, data: { isPinned } };
}

export async function createItem(
  input: CreateItemInput
): Promise<ActionResult<ItemDetail>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  // The shared demo account: no links, no huge pastes (everyone sees what is saved)
  if (isDemoEmail(session.user.email)) {
    const restriction = demoItemRestriction(input);
    if (restriction) return { success: false, error: restriction };
  }

  const limited = await checkActionRateLimit('create', session.user.id, 'new items');
  if (limited) return limited;

  return createItemForUser(session.user.id, session.user.isPro ?? false, input);
}

/** The user's collections, each marked with whether the item is in it. */
export async function getItemCollections(
  itemId: string
): Promise<ActionResult<ItemCollectionOption[]>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const idError = validateId(itemId, 'item ID');
  if (idError) return idError;

  const collections = await getCollectionsForItemQuery(session.user.id, itemId);
  if (!collections) return { success: false, error: 'Item not found or access denied' };

  return { success: true, data: collections };
}

/**
 * Adds an item to one collection (`add: true`, from drag and drop or the
 * card menu) or removes it, without touching its other collections.
 */
export async function setItemCollection(
  itemId: string,
  collectionId: string,
  add: boolean
): Promise<ActionResult<ItemCollectionChange>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const idError = validateId(itemId, 'item ID') ?? validateId(collectionId, 'collection ID');
  if (idError) return idError;
  if (typeof add !== 'boolean') return { success: false, error: 'Validation failed' };

  const result = await setItemInCollectionQuery(session.user.id, itemId, collectionId, add);
  if (!result) return { success: false, error: 'Item or collection not found or access denied' };

  return { success: true, data: result };
}

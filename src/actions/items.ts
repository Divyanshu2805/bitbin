'use server';

import { z } from 'zod';
import {
  updateItem as updateItemQuery,
  deleteItem as deleteItemQuery,
  toggleItemFavorite as toggleItemFavoriteQuery,
  toggleItemPin as toggleItemPinQuery,
  getCollectionsForItem as getCollectionsForItemQuery,
  setItemInCollection as setItemInCollectionQuery,
  type ItemDetail,
  type ItemCollectionOption,
  type ItemCollectionChange,
} from '@/lib/db/items';
import { descriptionSchema, parseZodErrors, safeUrlSchema, validateId } from '@/lib/validation';
import { createItemForUser, type CreateItemInput } from '@/lib/item-create';
import { getAuthedSession, type ActionResult } from '@/lib/action-utils';

const updateItemSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: descriptionSchema,
  content: z.string().nullable().optional().transform((val) => val || null),
  url: safeUrlSchema,
  language: z.string().trim().nullable().optional().transform((val) => val || null),
  tags: z.array(z.string().trim()).transform((tags) =>
    tags.filter((tag) => tag.length > 0)
  ),
  collectionIds: z.array(z.string()).optional(),
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

'use server';

import { z } from 'zod';
import {
  updateCollection as updateCollectionQuery,
  deleteCollection as deleteCollectionQuery,
  getUserCollections as getUserCollectionsQuery,
  toggleCollectionFavorite as toggleCollectionFavoriteQuery,
  toggleCollectionPin as toggleCollectionPinQuery,
  type CreatedCollection,
  type CollectionForPicker,
} from '@/lib/db/collections';
import { parseZodErrors, validateId } from '@/lib/validation';
import { createCollectionForUser, createCollectionSchema } from '@/lib/collection-create';
import { checkActionRateLimit, getAuthedSession, type ActionResult } from '@/lib/action-utils';

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;

export async function createCollection(
  input: CreateCollectionInput
): Promise<ActionResult<CreatedCollection>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const parsed = createCollectionSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: 'Validation failed', fieldErrors: parseZodErrors(parsed.error) };
  }

  const limited = await checkActionRateLimit('create', session.user.id, 'new collections');
  if (limited) return limited;

  return createCollectionForUser(session.user.id, session.user.isPro ?? false, parsed.data);
}

export async function getUserCollections(): Promise<ActionResult<CollectionForPicker[]>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  try {
    const collections = await getUserCollectionsQuery(session.user.id);
    return { success: true, data: collections };
  } catch {
    return { success: false, error: 'Failed to fetch collections' };
  }
}

export async function toggleCollectionFavorite(
  collectionId: string
): Promise<ActionResult<{ isFavorite: boolean }>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const idError = validateId(collectionId, 'collection ID');
  if (idError) return idError;

  const isFavorite = await toggleCollectionFavoriteQuery(collectionId, session.user.id);

  if (isFavorite === null) {
    return { success: false, error: 'Collection not found' };
  }

  return { success: true, data: { isFavorite } };
}

export async function toggleCollectionPin(
  collectionId: string
): Promise<ActionResult<{ isPinned: boolean }>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const idError = validateId(collectionId, 'collection ID');
  if (idError) return idError;

  const isPinned = await toggleCollectionPinQuery(collectionId, session.user.id);

  if (isPinned === null) {
    return { success: false, error: 'Collection not found' };
  }

  return { success: true, data: { isPinned } };
}

const updateCollectionSchema = z.object({
  id: z.string().min(1, 'Collection ID is required'),
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().trim().max(500, 'Description must be 500 characters or less').nullable().optional().transform((val) => val || null),
});

export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;

export async function updateCollection(
  input: UpdateCollectionInput
): Promise<ActionResult<CreatedCollection>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const parsed = updateCollectionSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: 'Validation failed', fieldErrors: parseZodErrors(parsed.error) };
  }

  try {
    const updated = await updateCollectionQuery(parsed.data.id, session.user.id, {
      name: parsed.data.name,
      description: parsed.data.description,
    });

    if (!updated) {
      return { success: false, error: 'Collection not found' };
    }

    return { success: true, data: updated };
  } catch {
    return { success: false, error: 'Failed to update collection' };
  }
}

export type DeleteCollectionInput = { id: string };

export async function deleteCollection(
  input: DeleteCollectionInput
): Promise<ActionResult<null>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const idError = validateId(input.id, 'collection ID');
  if (idError) return idError;

  try {
    const deleted = await deleteCollectionQuery(input.id, session.user.id);

    if (!deleted) {
      return { success: false, error: 'Collection not found' };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to delete collection' };
  }
}

'use server';

import { z } from 'zod';
import {
  createCollection as createCollectionQuery,
  updateCollection as updateCollectionQuery,
  deleteCollection as deleteCollectionQuery,
  getUserCollections as getUserCollectionsQuery,
  toggleCollectionFavorite as toggleCollectionFavoriteQuery,
  type CreatedCollection,
  type CollectionForPicker,
} from '@/lib/db/collections';
import { parseZodErrors, validateId } from '@/lib/validation';
import { canCreateCollection } from '@/lib/usage';
import { getAuthedSession, type ActionResult } from '@/lib/action-utils';

const createCollectionSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().trim().max(500, 'Description must be 500 characters or less').nullable().optional().transform((val) => val || null),
});

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

  // Usage limit check
  const isPro = session.user.isPro ?? false;
  const allowed = await canCreateCollection(session.user.id, isPro);
  if (!allowed) {
    return { success: false, error: 'You have reached the free tier limit of 3 collections. Upgrade to Pro for unlimited collections.' };
  }

  try {
    const created = await createCollectionQuery(session.user.id, parsed.data);
    return { success: true, data: created };
  } catch {
    return { success: false, error: 'Failed to create collection' };
  }
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

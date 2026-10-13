import { z } from 'zod';
import { createCollection, type CreatedCollection } from '@/lib/db/collections';
import { canCreateCollection, MAX_COLLECTIONS } from '@/lib/usage';
import { LimitReachedError } from '@/lib/limit-error';

export const COLLECTION_LIMIT_MESSAGE =
  'You have reached the free tier limit of 3 collections. Upgrade to Pro for unlimited collections.';

export const createCollectionSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().trim().max(500, 'Description must be 500 characters or less').nullable().optional().transform((val) => val || null),
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;

export type CreateCollectionOutcome =
  | { success: true; data: CreatedCollection }
  | { success: false; error: string };

/**
 * The plan check and the insert, shared by the `createCollection` server action and
 * `POST /api/v1/collections`. The input is already validated.
 */
export async function createCollectionForUser(
  userId: string,
  isPro: boolean,
  input: CreateCollectionInput
): Promise<CreateCollectionOutcome> {
  if (!(await canCreateCollection(userId, isPro))) {
    return { success: false, error: COLLECTION_LIMIT_MESSAGE };
  }

  try {
    // A Free account's cap is re-checked under a lock, so concurrent creates can't overshoot it
    const created = await createCollection(userId, isPro ? input : { ...input, maxCollections: MAX_COLLECTIONS });
    return { success: true, data: created };
  } catch (error) {
    if (error instanceof LimitReachedError) return { success: false, error: COLLECTION_LIMIT_MESSAGE };
    return { success: false, error: 'Failed to create collection' };
  }
}

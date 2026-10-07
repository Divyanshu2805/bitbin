'use server';

import { z } from 'zod';
import { checkActionRateLimit, getAuthedSession, type ActionResult } from '@/lib/action-utils';
import { deleteUserTag, renameUserTag } from '@/lib/db/tags';
import { MAX_TAG_LENGTH, parseZodErrors } from '@/lib/validation';

const tagName = z
  .string()
  .trim()
  .min(1, 'Tag name is required')
  .max(MAX_TAG_LENGTH, `Tags must be ${MAX_TAG_LENGTH} characters or fewer`);

const renameSchema = z.object({ from: tagName, to: tagName });
const deleteSchema = z.object({ name: tagName });

/**
 * Rename a tag on all of the caller's items. A name that already exists merges the two tags.
 */
export async function renameTag(input: z.infer<typeof renameSchema>): Promise<ActionResult<{ itemsChanged: number }>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const parsed = renameSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Validation failed', fieldErrors: parseZodErrors(parsed.error) };
  }
  const { from, to } = parsed.data;
  if (from === to) return { success: false, error: 'Choose a different name' };

  const limited = await checkActionRateLimit('create', session.user.id, 'tag changes');
  if (limited) return limited;

  const changed = await renameUserTag(session.user.id, from, to);
  if (changed === null) return { success: false, error: 'Tag not found' };

  return { success: true, data: { itemsChanged: changed } };
}

/**
 * Remove a tag from all of the caller's items.
 */
export async function deleteTag(input: z.infer<typeof deleteSchema>): Promise<ActionResult<{ itemsChanged: number }>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Validation failed', fieldErrors: parseZodErrors(parsed.error) };
  }

  const limited = await checkActionRateLimit('create', session.user.id, 'tag changes');
  if (limited) return limited;

  const changed = await deleteUserTag(session.user.id, parsed.data.name);
  if (changed === null) return { success: false, error: 'Tag not found' };

  return { success: true, data: { itemsChanged: changed } };
}

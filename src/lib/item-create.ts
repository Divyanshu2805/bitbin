import { z } from 'zod';
import { createItem as createItemQuery, VALID_ITEM_TYPES, type ItemDetail } from '@/lib/db/items';
import { descriptionSchema, parseZodErrors, safeUrlSchema } from '@/lib/validation';
import { canCreateItem } from '@/lib/usage';
import type { ActionResult } from '@/lib/action-utils';
import { detectLanguage } from '@/lib/detect-language';
import { isOwnedFileUrl } from '@/lib/r2';

const LANGUAGE_TYPES: string[] = ['snippet', 'command'];

/**
 * Item creation shared by the `createItem` server action and
 * `POST /api/v1/items`. The caller authenticates; everything after that
 * (validation, plan checks, the scoped insert) lives here so the two
 * entry points can't drift apart.
 */

export const createItemSchema = z.object({
  typeName: z.enum(VALID_ITEM_TYPES, { message: 'Invalid item type' }),
  title: z.string().trim().min(1, 'Title is required'),
  description: descriptionSchema,
  content: z.string().nullable().optional().transform((val) => val || null),
  url: safeUrlSchema,
  language: z.string().trim().nullable().optional().transform((val) => val || null),
  tags: z.array(z.string().trim()).transform((tags) =>
    tags.filter((tag) => tag.length > 0)
  ),
  collectionIds: z.array(z.string()).optional(),
  fileUrl: safeUrlSchema,
  fileName: z.string().nullable().optional().transform((val) => val || null),
  fileSize: z.number().int().positive().nullable().optional().transform((val) => val || null),
});

export type CreateItemInput = z.input<typeof createItemSchema>;

export async function createItemForUser(
  userId: string,
  isPro: boolean,
  input: unknown
): Promise<ActionResult<ItemDetail>> {
  const parsed = createItemSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: 'Validation failed', fieldErrors: parseZodErrors(parsed.error) };
  }

  // Pro type check: file/image require Pro
  if ((parsed.data.typeName === 'file' || parsed.data.typeName === 'image') && !isPro) {
    return { success: false, error: 'File and image uploads require a Pro subscription' };
  }

  // Only files and images carry a file, and it must be one this user uploaded
  const isFileType = parsed.data.typeName === 'file' || parsed.data.typeName === 'image';
  if (!isFileType) {
    parsed.data.fileUrl = null;
    parsed.data.fileName = null;
    parsed.data.fileSize = null;
  } else if (parsed.data.fileUrl && !isOwnedFileUrl(userId, parsed.data.fileUrl)) {
    return { success: false, error: 'Invalid file reference', fieldErrors: { fileUrl: ['Invalid file URL'] } };
  }

  // Usage limit check
  const allowed = await canCreateItem(userId, isPro);
  if (!allowed) {
    return { success: false, error: 'You have reached the free tier limit of 50 items. Upgrade to Pro for unlimited items.' };
  }

  // Validate URL is required for link type
  if (parsed.data.typeName === 'link' && !parsed.data.url) {
    return { success: false, error: 'URL is required for links', fieldErrors: { url: ['URL is required'] } };
  }

  // Snippets and commands saved without a language get one guessed from the
  // content. An explicit choice, including 'plaintext', is kept.
  const data = parsed.data;
  if (!data.language && data.content && LANGUAGE_TYPES.includes(data.typeName)) {
    data.language = detectLanguage(data.content, data.typeName);
  }

  const created = await createItemQuery(userId, data);

  if (!created) {
    return { success: false, error: 'Failed to create item' };
  }

  return { success: true, data: created };
}

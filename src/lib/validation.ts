import { z } from 'zod';

/**
 * Parse Zod validation errors into a field-keyed error map
 */
export function parseZodErrors(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const field = issue.path[0]?.toString() || 'unknown';
    if (!fieldErrors[field]) {
      fieldErrors[field] = [];
    }
    fieldErrors[field].push(issue.message);
  }
  return fieldErrors;
}

/**
 * Validate URL uses http or https protocol only (prevents javascript:, data:, etc.)
 */
export function isValidUrlProtocol(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Zod schema for URLs that only allows http/https protocols
 */
export const safeUrlSchema = z
  .string()
  .url('Invalid URL')
  .refine(isValidUrlProtocol, 'URL must use http or https protocol')
  .nullable()
  .optional()
  .transform((val) => val || null);

/**
 * Validates that a string ID is non-empty.
 * Returns an error result if invalid, or null if valid.
 */
export function validateId(
  id: string,
  label: string
): { success: false; error: string } | null {
  if (!id || id.trim().length === 0) {
    return { success: false, error: `Invalid ${label}` };
  }
  return null;
}

/** Longest password accepted (bcrypt only uses the first 72 bytes anyway) */
export const MAX_PASSWORD_LENGTH = 128;

/** Size caps for item fields, so one request can't store megabytes in a title or a thousand tags */
export const MAX_TITLE_LENGTH = 200;
export const MAX_CONTENT_LENGTH = 500_000;
export const MAX_LANGUAGE_LENGTH = 50;
export const MAX_TAGS_PER_ITEM = 20;
export const MAX_TAG_LENGTH = 50;
export const MAX_FILE_NAME_LENGTH = 255;
export const MAX_COLLECTIONS_PER_ITEM = 50;

/** Shared field schemas for create and update, so the two can't drift apart */
export const titleSchema = z
  .string()
  .trim()
  .min(1, 'Title is required')
  .max(MAX_TITLE_LENGTH, `Title must be ${MAX_TITLE_LENGTH} characters or fewer`);

export const contentSchema = z
  .string()
  .max(MAX_CONTENT_LENGTH, `Content must be ${MAX_CONTENT_LENGTH.toLocaleString('en-US')} characters or fewer`)
  .nullable()
  .optional()
  .transform((val) => val || null);

export const languageSchema = z
  .string()
  .trim()
  .max(MAX_LANGUAGE_LENGTH, 'Invalid language')
  .nullable()
  .optional()
  .transform((val) => val || null);

export const tagsSchema = z
  .array(z.string().trim().max(MAX_TAG_LENGTH, `Tags must be ${MAX_TAG_LENGTH} characters or fewer`))
  .transform((tags) => tags.filter((tag) => tag.length > 0))
  .pipe(z.array(z.string()).max(MAX_TAGS_PER_ITEM, `An item can have at most ${MAX_TAGS_PER_ITEM} tags`));

export const collectionIdsSchema = z.array(z.string().max(100)).max(MAX_COLLECTIONS_PER_ITEM).optional();

/** The longest an item description may be; longer text belongs in the content */
export const MAX_DESCRIPTION_LENGTH = 1000;

/**
 * An item's description: trimmed, at most MAX_DESCRIPTION_LENGTH characters,
 * blank → null. Shared by the create and update actions and `POST /api/v1/items`.
 */
export const descriptionSchema = z
  .string()
  .trim()
  .max(MAX_DESCRIPTION_LENGTH, `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`)
  .nullable()
  .optional()
  .transform((val) => val || null);

'use server';

import { z } from 'zod';
import { updateEditorPreferences as updateEditorPreferencesQuery, updateUserName } from '@/lib/db/users';
import {
  type EditorPreferences,
  EDITOR_THEMES,
  FONT_SIZES,
  TAB_SIZES,
} from '@/lib/constants/editor';
import { getAuthedSession, type ActionResult } from '@/lib/action-utils';
import { parseZodErrors } from '@/lib/validation';

const editorPreferencesSchema = z.object({
  fontSize: z.number().refine((val) => FONT_SIZES.includes(val), {
    message: 'Invalid font size',
  }),
  tabSize: z.number().refine((val) => TAB_SIZES.includes(val), {
    message: 'Invalid tab size',
  }),
  wordWrap: z.boolean(),
  minimap: z.boolean(),
  theme: z.enum(EDITOR_THEMES.map((t) => t.value) as [string, ...string[]]),
});

export async function updateEditorPreferences(
  input: EditorPreferences
): Promise<ActionResult> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const parsed = editorPreferencesSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: 'Invalid preferences' };
  }

  try {
    const updated = await updateEditorPreferencesQuery(session.user.id, parsed.data as EditorPreferences);

    if (!updated) {
      return { success: false, error: 'Failed to update preferences' };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update preferences' };
  }
}

const nameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(50, 'Name must be 50 characters or fewer'),
});

export async function updateName(
  input: z.infer<typeof nameSchema>
): Promise<ActionResult<{ name: string }>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const parsed = nameSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Validation failed', fieldErrors: parseZodErrors(parsed.error) };
  }

  const name = await updateUserName(session.user.id, parsed.data.name);
  if (name === null) {
    return { success: false, error: 'Could not update your name. Try again.' };
  }

  return { success: true, data: { name } };
}

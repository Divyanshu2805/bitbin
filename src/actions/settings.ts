'use server';

import { z } from 'zod';
import { updateEditorPreferences as updateEditorPreferencesQuery } from '@/lib/db/users';
import {
  type EditorPreferences,
  EDITOR_THEMES,
  FONT_SIZES,
  TAB_SIZES,
} from '@/lib/constants/editor';
import { getAuthedSession, type ActionResult } from '@/lib/action-utils';

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

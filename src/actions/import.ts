'use server';

import { checkActionRateLimit, getAuthedSession, type ActionResult } from '@/lib/action-utils';
import { demoBlockedMessage, isDemoEmail } from '@/lib/demo';
import { importLibrary } from '@/lib/db/import';
import {
  buildImportPreview,
  INVALID_IMPORT_FORMAT,
  parseImportData,
  type ImportPreview,
  type ImportResult,
} from '@/lib/import-schema';

/**
 * Parse and preview an import file without importing
 */
export async function previewImport(
  jsonString: string
): Promise<ActionResult<ImportPreview>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  if (isDemoEmail(session.user.email)) return { success: false, error: demoBlockedMessage('import data') };

  const limited = await checkActionRateLimit('importPreview', session.user.id, 'import previews');
  if (limited) return limited;

  let raw: unknown;
  try {
    raw = JSON.parse(jsonString);
  } catch {
    return { success: false, error: 'Invalid JSON file' };
  }

  const parsed = parseImportData(raw);
  if (!parsed.ok) {
    return { success: false, error: INVALID_IMPORT_FORMAT };
  }

  return { success: true, data: buildImportPreview(parsed.data) };
}

/**
 * Import data from a BitBin export JSON (a full export, or a single collection's)
 */
export async function importData(
  jsonString: string,
  skipDuplicates: boolean
): Promise<ActionResult<ImportResult>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  // An import could fill the shared library with thousands of entries
  if (isDemoEmail(session.user.email)) return { success: false, error: demoBlockedMessage('import data') };

  const limited = await checkActionRateLimit('import', session.user.id, 'imports');
  if (limited) return limited;

  let raw: unknown;
  try {
    raw = JSON.parse(jsonString);
  } catch {
    return { success: false, error: 'Invalid JSON file' };
  }

  const parsed = parseImportData(raw);
  if (!parsed.ok) {
    return { success: false, error: INVALID_IMPORT_FORMAT };
  }

  const result = await importLibrary(
    session.user.id,
    session.user.isPro ?? false,
    parsed.data,
    skipDuplicates
  );

  return { success: true, data: result };
}

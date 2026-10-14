/**
 * What a file item's card can show of its file: the first page of a PDF, or the first lines of a text
 * file. Pure helpers, so the rules are tested without a browser.
 */

/** A PDF bigger than this isn't downloaded just to draw a card; the card keeps its plain look. */
export const MAX_PDF_PREVIEW_BYTES = 5 * 1024 * 1024;

/** How much of a text file is read for the excerpt, and how many lines of it show. */
export const EXCERPT_BYTES = 4096;
export const EXCERPT_LINES = 6;

const TEXT_EXTENSIONS = new Set(['txt', 'md', 'json', 'yaml', 'yml', 'xml', 'csv', 'toml', 'ini']);

export type FilePreviewKind = 'pdf' | 'text';

function extensionOf(fileName: string | null | undefined): string {
  const name = fileName ?? '';
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

/** How a file can be previewed on a card, or null when it can't (an unknown type, or a PDF too big to fetch for it). */
export function filePreviewKind(
  fileName: string | null | undefined,
  fileSize: number | null | undefined
): FilePreviewKind | null {
  const ext = extensionOf(fileName);
  if (ext === 'pdf') return fileSize != null && fileSize > MAX_PDF_PREVIEW_BYTES ? null : 'pdf';
  return TEXT_EXTENSIONS.has(ext) ? 'text' : null;
}

/** The first non-blank lines of a text, tabs turned into spaces and a leading byte-order mark dropped. */
export function excerptLines(text: string, max = EXCERPT_LINES): string[] {
  return text
    .replace(/^﻿/, '')
    .replace(/\t/g, '  ')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .slice(0, max);
}

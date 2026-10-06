/** What identifies an item when deciding whether an import would duplicate it. */
export interface ItemIdentity {
  title: string;
  /** Item type name: snippet, prompt, command, note, file, image or link */
  type: string;
  content: string | null;
  url: string | null;
  fileName: string | null;
}

/**
 * Whether two items are the same one: same title and type, and the same thing
 * inside. What "the same thing" is depends on the type: a link's URL, a file's
 * name, otherwise the text. (Comparing content *or* URL meant two notes with
 * the same title and different text matched, because both URLs were null.)
 */
export function isDuplicateItem(existing: ItemIdentity, incoming: ItemIdentity): boolean {
  if (existing.title !== incoming.title || existing.type !== incoming.type) return false;

  switch (incoming.type) {
    case 'link':
      return existing.url === incoming.url;
    case 'file':
    case 'image':
      return existing.fileName === incoming.fileName;
    default:
      return existing.content === incoming.content;
  }
}

/**
 * A timestamp from an export file, or `undefined` if it isn't a usable date.
 * Dates in the future are clamped to now, so an edited file can't make an item
 * claim to be newer than the moment it was imported.
 */
export function parseExportDate(value: string | undefined | null, now: Date = new Date()): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date > now ? now : date;
}

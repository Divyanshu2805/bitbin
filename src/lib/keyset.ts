/**
 * Keyset ("seek") pagination for the card lists, which are ordered pinned first, then by last edit:
 * `isPinned DESC, updatedAt DESC, id DESC`. A page is asked for with the position of the row it
 * starts after (`after`) or ends before (`before`), not with a row count to skip. That keeps deep
 * pages as fast as the first and stops rows from shifting or repeating when something is edited
 * while you page. `id` breaks ties between rows with the same timestamp, so the order is total.
 */

export interface ListCursor {
  pinned: boolean;
  updatedAt: Date;
  id: string;
}

/** What a list page is asked for: the first page, or the one after / before a row. */
export interface PageRequest {
  after?: string;
  before?: string;
}

export type PageDirection = 'after' | 'before';

export interface PageInfo {
  hasNext: boolean;
  hasPrev: boolean;
  /** Pass as `after` to get the next page */
  nextCursor: string | null;
  /** Pass as `before` to get the previous page */
  prevCursor: string | null;
}

interface CursorRow {
  id: string;
  isPinned: boolean;
  updatedAt: Date;
}

const MAX_CURSOR_LENGTH = 200;

export function encodeCursor(row: CursorRow): string {
  return Buffer.from(JSON.stringify([row.isPinned ? 1 : 0, row.updatedAt.getTime(), row.id])).toString('base64url');
}

/** The cursor in a URL, or null when it is missing or not one we issued (the first page is shown then). */
export function decodeCursor(value: string | null | undefined): ListCursor | null {
  if (!value || value.length > MAX_CURSOR_LENGTH) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, 'base64url').toString('utf-8'));
    if (!Array.isArray(parsed) || parsed.length !== 3) return null;
    const [pinned, time, id] = parsed;
    if ((pinned !== 0 && pinned !== 1) || typeof time !== 'number' || !Number.isFinite(time)) return null;
    if (typeof id !== 'string' || id.length === 0 || id.length > 100) return null;
    const updatedAt = new Date(time);
    if (Number.isNaN(updatedAt.getTime())) return null;
    return { pinned: pinned === 1, updatedAt, id };
  } catch {
    return null;
  }
}

/** Which way a request goes and from where. `before` wins nothing over `after`: a bad cursor means page one. */
export function readPageRequest(request: PageRequest | undefined): { cursor: ListCursor | null; direction: PageDirection } {
  const after = decodeCursor(request?.after);
  if (after) return { cursor: after, direction: 'after' };
  const before = decodeCursor(request?.before);
  if (before) return { cursor: before, direction: 'before' };
  return { cursor: null, direction: 'after' };
}

type Condition = {
  isPinned: boolean;
  updatedAt?: Date | { lt: Date } | { gt: Date };
  id?: { lt: string } | { gt: string };
};

/**
 * The rows that come after (in list order) or before the cursor, as a Prisma `OR`. A boolean has no
 * "less than" in Prisma, so the pinned/unpinned boundary is spelled out. Combine with the list's own
 * filter using `AND`.
 */
export function keysetWhere(cursor: ListCursor | null, direction: PageDirection): { OR: Condition[] } | undefined {
  if (!cursor) return undefined;
  const { pinned, updatedAt, id } = cursor;

  if (direction === 'after') {
    // Lower in the list: older, or (same time) a smaller id; unpinned rows follow all the pinned ones
    const sameGroup: Condition[] = [
      { isPinned: pinned, updatedAt: { lt: updatedAt } },
      { isPinned: pinned, updatedAt, id: { lt: id } },
    ];
    return { OR: pinned ? [{ isPinned: false }, ...sameGroup] : sameGroup };
  }

  const sameGroup: Condition[] = [
    { isPinned: pinned, updatedAt: { gt: updatedAt } },
    { isPinned: pinned, updatedAt, id: { gt: id } },
  ];
  return { OR: pinned ? sameGroup : [{ isPinned: true }, ...sameGroup] };
}

/** List order for a page that goes forward, or its reverse for one that goes back (flipped again afterwards). */
export function keysetOrderBy(direction: PageDirection) {
  const order = direction === 'after' ? ('desc' as const) : ('asc' as const);
  return [{ isPinned: order }, { updatedAt: order }, { id: order }];
}

/**
 * Turns the rows fetched for a page (fetch `limit + 1`: the extra one only says there is more) into
 * the page to show and the links around it.
 */
export function resolvePage<Row extends CursorRow>(
  fetched: Row[],
  limit: number,
  direction: PageDirection,
  hasCursor: boolean
): { rows: Row[]; pageInfo: PageInfo } {
  const more = fetched.length > limit;
  const slice = fetched.slice(0, limit);
  const rows = direction === 'before' ? slice.reverse() : slice;

  // Going forward there is a page behind us once we've left the first; going back, one ahead of us
  const hasNext = direction === 'after' ? more : hasCursor;
  const hasPrev = direction === 'after' ? hasCursor : more;

  return {
    rows,
    pageInfo: {
      hasNext,
      hasPrev,
      nextCursor: hasNext && rows.length > 0 ? encodeCursor(rows[rows.length - 1]) : null,
      prevCursor: hasPrev && rows.length > 0 ? encodeCursor(rows[0]) : null,
    },
  };
}

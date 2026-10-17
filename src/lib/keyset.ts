/**
 * Keyset ("seek") pagination for the card lists, which are ordered pinned first, then by last edit:
 * `isPinned DESC, updatedAt DESC, id DESC`. A page is asked for with the position of the row it
 * starts after (`after`) or ends before (`before`), not with a row count to skip. With the
 * `(userId, isPinned, updatedAt, id)` index that keeps every page as fast as the first, and it stops
 * rows from shifting or repeating when something is edited while you page. `id` breaks ties between
 * rows with the same timestamp, so the order is total.
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

/** Part of a list on one side of the cursor, as a Prisma condition to `AND` with the list's own filter. */
export type KeysetSegment = {
  isPinned: boolean;
  updatedAt?: { lte: Date } | { gte: Date };
  OR?: Array<{ updatedAt: { lt: Date } | { gt: Date } } | { id: { lt: string } | { gt: string } }>;
};

/**
 * Where the rows after (in list order) or before the cursor are, as segments to read in order until
 * the page is full: the cursor's own group (pinned or not) from the cursor on, then, if that runs
 * out, the other group from its start. Each segment is one range of the `(userId, isPinned,
 * updatedAt, id)` index, and the bound on `updatedAt` lets the scan start at the cursor. A single
 * `OR` across both groups would not: a page in the middle of a long list then read every row before
 * it. A boolean has no "less than" in Prisma, so the groups are spelled out.
 */
export function keysetSegments(cursor: ListCursor | null, direction: PageDirection): KeysetSegment[] {
  if (!cursor) return [];
  const { pinned, updatedAt, id } = cursor;

  if (direction === 'after') {
    // Lower in the list: older, or (same time) a smaller id; unpinned rows follow all the pinned ones
    const sameGroup: KeysetSegment = {
      isPinned: pinned,
      updatedAt: { lte: updatedAt },
      OR: [{ updatedAt: { lt: updatedAt } }, { id: { lt: id } }],
    };
    return pinned ? [sameGroup, { isPinned: false }] : [sameGroup];
  }

  const sameGroup: KeysetSegment = {
    isPinned: pinned,
    updatedAt: { gte: updatedAt },
    OR: [{ updatedAt: { gt: updatedAt } }, { id: { gt: id } }],
  };
  return pinned ? [sameGroup] : [sameGroup, { isPinned: true }];
}

/**
 * Reads up to `take` rows of a page, one segment at a time (see `keysetSegments`). `fetch` gets the
 * condition to add to the list's filter (none on the first page) and how many rows are still
 * wanted. Usually the first segment fills the page and only one query runs.
 */
export async function fetchKeysetRows<Row>(
  cursor: ListCursor | null,
  direction: PageDirection,
  take: number,
  fetch: (position: KeysetSegment | undefined, take: number) => Promise<Row[]>
): Promise<Row[]> {
  const segments = keysetSegments(cursor, direction);
  if (segments.length === 0) return fetch(undefined, take);

  const rows: Row[] = [];
  for (const segment of segments) {
    rows.push(...(await fetch(segment, take - rows.length)));
    if (rows.length >= take) break;
  }
  return rows;
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

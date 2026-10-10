// Pagination limits for list views
export const ITEMS_PER_PAGE = 21;
export const COLLECTIONS_PER_PAGE = 21;

// Dashboard limits (separate from pagination)
export const DASHBOARD_COLLECTIONS_LIMIT = 9;
export const DASHBOARD_RECENT_ITEMS_LIMIT = 9;

// The most rows a caller-supplied limit can ask for
export const MAX_QUERY_LIMIT = 100;

/** A caller-supplied limit, kept between 1 and MAX_QUERY_LIMIT (`defaultLimit` when it isn't a number). */
export function clampLimit(limit: number, defaultLimit: number): number {
  return Math.min(Math.max(1, limit), MAX_QUERY_LIMIT) || defaultLimit;
}

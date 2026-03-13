import { NextResponse } from 'next/server';
import { findApiTokenByHash, touchApiToken } from '@/lib/db/api-tokens';
import { hashApiToken, readBearerToken } from '@/lib/api-tokens';
import { checkRateLimit, formatRetryTime } from '@/lib/rate-limit';

/** How stale `lastUsedAt` may get before a request writes it again. */
const TOUCH_INTERVAL_MS = 60 * 1000;

export interface ApiUser {
  id: string;
  email: string;
  name: string | null;
  isPro: true;
}

export type ApiAuthResult =
  | { user: ApiUser; tokenId: string; response?: never }
  | { user?: never; tokenId?: never; response: NextResponse };

export function apiError(error: string, status: number, headers?: HeadersInit): NextResponse {
  return NextResponse.json({ error }, { status, headers });
}

/**
 * Authenticates a token-API request (`Authorization: Bearer bb_…`).
 *
 * The plan is read from the database on every call, so a cancelled
 * subscription loses API access on its next request. Cookies are ignored:
 * the token API is Bearer-only.
 */
export async function authenticateApiRequest(request: Request): Promise<ApiAuthResult> {
  const token = readBearerToken(request.headers.get('authorization'));
  if (!token) {
    return { response: apiError('Missing or malformed API token', 401) };
  }

  const found = await findApiTokenByHash(hashApiToken(token));
  if (!found) {
    return { response: apiError('Invalid or revoked API token', 401) };
  }

  if (!found.user.isPro) {
    return { response: apiError('The BitBin extension requires a Pro subscription', 403) };
  }

  const rateLimit = await checkRateLimit('api', found.user.id);
  if (!rateLimit.success) {
    return {
      response: apiError(
        `Too many requests. Please try again in ${formatRetryTime(rateLimit.retryAfter)}.`,
        429,
        { 'Retry-After': String(rateLimit.retryAfter) }
      ),
    };
  }

  const lastUsed = found.lastUsedAt?.getTime() ?? 0;
  if (Date.now() - lastUsed > TOUCH_INTERVAL_MS) {
    // Best effort: a failed timestamp write shouldn't fail the request
    await touchApiToken(found.tokenId).catch((error) => {
      console.error('Failed to update API token lastUsedAt:', error);
    });
  }

  return {
    user: { ...found.user, isPro: true },
    tokenId: found.tokenId,
  };
}

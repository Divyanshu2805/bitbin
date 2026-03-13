import { createHash, randomBytes } from 'crypto';

/** Every BitBin token starts with this, so a leaked one is recognisable. */
export const API_TOKEN_PREFIX = 'bb_';

/** Characters of the token kept in the database to tell tokens apart. */
const DISPLAY_PREFIX_LENGTH = 10;

export function hashApiToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a new token. The plain token is returned once to the user;
 * only its hash and a short display prefix are stored.
 */
export function generateApiToken(): { token: string; tokenHash: string; prefix: string } {
  const token = API_TOKEN_PREFIX + randomBytes(32).toString('base64url');
  return {
    token,
    tokenHash: hashApiToken(token),
    prefix: token.slice(0, DISPLAY_PREFIX_LENGTH),
  };
}

/** Pull the token out of an `Authorization: Bearer bb_…` header. */
export function readBearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/^Bearer\s+(\S+)$/i);
  if (!match) return null;
  const token = match[1];
  return token.startsWith(API_TOKEN_PREFIX) ? token : null;
}

'use server';

import { z } from 'zod';
import {
  countApiTokens,
  createApiToken as createApiTokenQuery,
  deleteApiToken as deleteApiTokenQuery,
  MAX_API_TOKENS,
  type ApiTokenSummary,
} from '@/lib/db/api-tokens';
import { generateApiToken } from '@/lib/api-tokens';
import { API_SCOPES } from '@/lib/api-scopes';
import { parseZodErrors, validateId } from '@/lib/validation';
import { getAuthedSession, type ActionResult } from '@/lib/action-utils';

// Not exported: a 'use server' file may only export async functions.
/** A token lives 30, 90 or 365 days. There is no "never": a leaked token must eventually stop working. */
const DEFAULT_TOKEN_LIFETIME_DAYS = 90;

const createApiTokenSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(50, 'Name must be 50 characters or fewer'),
  expiresInDays: z
    .union([z.literal(30), z.literal(90), z.literal(365)], { message: 'Invalid expiry' })
    .optional()
    .default(DEFAULT_TOKEN_LIFETIME_DAYS),
  // What the token may do (least privilege: the caller picks, and must pick at least one)
  scopes: z
    .array(z.enum(API_SCOPES, { message: 'Invalid permission' }))
    .min(1, 'Choose at least one permission')
    .transform((scopes) => [...new Set(scopes)]),
});

export type CreateApiTokenInput = z.input<typeof createApiTokenSchema>;

export interface CreatedApiToken {
  /** The plain token. Returned once, never stored or shown again. */
  token: string;
  summary: ApiTokenSummary;
}

export async function createApiToken(
  input: CreateApiTokenInput
): Promise<ActionResult<CreatedApiToken>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  if (!session.user.isPro) {
    return { success: false, error: 'The browser extension requires a Pro subscription' };
  }

  const parsed = createApiTokenSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Validation failed', fieldErrors: parseZodErrors(parsed.error) };
  }

  const count = await countApiTokens(session.user.id);
  if (count >= MAX_API_TOKENS) {
    return { success: false, error: `You can have up to ${MAX_API_TOKENS} tokens. Revoke one to create another.` };
  }

  const { token, tokenHash, prefix } = generateApiToken();
  const summary = await createApiTokenQuery(session.user.id, {
    name: parsed.data.name,
    tokenHash,
    prefix,
    expiresAt: new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000),
    scopes: parsed.data.scopes,
  });

  return { success: true, data: { token, summary } };
}

/**
 * Revoke a token. Allowed on any plan, so a user who downgrades can still
 * clean up old tokens (which stop working anyway without Pro).
 */
export async function revokeApiToken(tokenId: string): Promise<ActionResult<null>> {
  const { session, unauthorized } = await getAuthedSession();
  if (unauthorized) return unauthorized;

  const idError = validateId(tokenId, 'token ID');
  if (idError) return idError;

  const deleted = await deleteApiTokenQuery(session.user.id, tokenId);
  if (!deleted) {
    return { success: false, error: 'Token not found or access denied' };
  }

  return { success: true };
}

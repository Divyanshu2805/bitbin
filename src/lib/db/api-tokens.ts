import { prisma } from '@/lib/prisma';
import { normalizeScopes, type ApiScope } from '@/lib/api-scopes';

/** Most tokens a user can hold at once. */
export const MAX_API_TOKENS = 10;

export interface ApiTokenSummary {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: Date | null;
  /** null only on a legacy row: new tokens always expire */
  expiresAt: Date | null;
  /** What the token may do */
  scopes: ApiScope[];
  createdAt: Date;
}

const summarySelect = {
  id: true,
  name: true,
  prefix: true,
  lastUsedAt: true,
  expiresAt: true,
  scopes: true,
  createdAt: true,
} as const;

function toSummary<T extends { scopes: string[] }>(row: T): Omit<T, 'scopes'> & { scopes: ApiScope[] } {
  return { ...row, scopes: normalizeScopes(row.scopes) };
}

/**
 * List a user's API tokens (never the hash)
 */
export async function getApiTokens(userId: string): Promise<ApiTokenSummary[]> {
  const rows = await prisma.apiToken.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: summarySelect,
  });
  return rows.map(toSummary);
}

export async function countApiTokens(userId: string): Promise<number> {
  return prisma.apiToken.count({ where: { userId } });
}

export interface CreateApiTokenData {
  name: string;
  tokenHash: string;
  prefix: string;
  /** Every token expires */
  expiresAt: Date;
  scopes: ApiScope[];
}

export async function createApiToken(
  userId: string,
  data: CreateApiTokenData
): Promise<ApiTokenSummary> {
  const row = await prisma.apiToken.create({
    data: { userId, ...data },
    select: summarySelect,
  });
  return toSummary(row);
}

/**
 * Delete a token. Returns false if it doesn't exist or isn't the user's.
 */
export async function deleteApiToken(userId: string, tokenId: string): Promise<boolean> {
  const { count } = await prisma.apiToken.deleteMany({
    where: { id: tokenId, userId },
  });
  return count > 0;
}

export interface ApiTokenOwner {
  tokenId: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  scopes: ApiScope[];
  user: {
    id: string;
    email: string;
    name: string | null;
    isPro: boolean;
  };
}

/**
 * Find a token by its hash, with its owner's current plan.
 * The only lookup not scoped by userId: the token is what identifies the user.
 */
export async function findApiTokenByHash(tokenHash: string): Promise<ApiTokenOwner | null> {
  const token = await prisma.apiToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      lastUsedAt: true,
      expiresAt: true,
      scopes: true,
      user: { select: { id: true, email: true, name: true, isPro: true } },
    },
  });

  if (!token) return null;
  return {
    tokenId: token.id,
    lastUsedAt: token.lastUsedAt,
    expiresAt: token.expiresAt,
    scopes: normalizeScopes(token.scopes),
    user: token.user,
  };
}

export async function touchApiToken(tokenId: string): Promise<void> {
  await prisma.apiToken.update({
    where: { id: tokenId },
    data: { lastUsedAt: new Date() },
  });
}

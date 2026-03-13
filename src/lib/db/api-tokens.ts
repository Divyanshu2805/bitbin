import { prisma } from '@/lib/prisma';

/** Most tokens a user can hold at once. */
export const MAX_API_TOKENS = 10;

export interface ApiTokenSummary {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: Date | null;
  createdAt: Date;
}

const summarySelect = {
  id: true,
  name: true,
  prefix: true,
  lastUsedAt: true,
  createdAt: true,
} as const;

/**
 * List a user's API tokens (never the hash)
 */
export async function getApiTokens(userId: string): Promise<ApiTokenSummary[]> {
  return prisma.apiToken.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: summarySelect,
  });
}

export async function countApiTokens(userId: string): Promise<number> {
  return prisma.apiToken.count({ where: { userId } });
}

export interface CreateApiTokenData {
  name: string;
  tokenHash: string;
  prefix: string;
}

export async function createApiToken(
  userId: string,
  data: CreateApiTokenData
): Promise<ApiTokenSummary> {
  return prisma.apiToken.create({
    data: { userId, ...data },
    select: summarySelect,
  });
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
      user: { select: { id: true, email: true, name: true, isPro: true } },
    },
  });

  if (!token) return null;
  return { tokenId: token.id, lastUsedAt: token.lastUsedAt, user: token.user };
}

export async function touchApiToken(tokenId: string): Promise<void> {
  await prisma.apiToken.update({
    where: { id: tokenId },
    data: { lastUsedAt: new Date() },
  });
}

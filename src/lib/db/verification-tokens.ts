import { prisma } from '@/lib/prisma';

/** Storage for the hashed email-verification and password-reset tokens (`lib/tokens.ts` owns the rules). */

/** Replace whatever tokens exist for an identifier with a single new one. */
export async function replaceToken(identifier: string, hashedToken: string, expires: Date) {
  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: { identifier, token: hashedToken, expires },
  });
}

export async function findToken(hashedToken: string) {
  return prisma.verificationToken.findUnique({ where: { token: hashedToken } });
}

/** Delete a token and report how many rows went: exactly one means this request used it first. */
export async function deleteToken(hashedToken: string): Promise<number> {
  const { count } = await prisma.verificationToken.deleteMany({ where: { token: hashedToken } });
  return count;
}

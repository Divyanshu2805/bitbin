import { prisma } from '@/lib/prisma';

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** The id of the account with this email, or null. */
export async function findUserIdByEmail(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return user?.id ?? null;
}

/**
 * Put the demo account back to a clean state: `resetContent` rewrites its library, then the
 * account itself is restored (the sandbox blocks these changes, so this is a safety net).
 */
export async function resetDemoAccount(
  userId: string,
  resetContent: (tx: Tx, userId: string) => Promise<void>
) {
  await prisma.$transaction(
    async (tx) => {
      await resetContent(tx, userId);
      await tx.user.update({
        where: { id: userId },
        data: { name: 'Demo User', isPro: false, stripeCustomerId: null, stripeSubscriptionId: null },
      });
    },
    { timeout: 30_000 }
  );
}

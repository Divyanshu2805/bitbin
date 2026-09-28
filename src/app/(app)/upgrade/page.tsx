import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import UpgradePricing from '@/components/settings/upgrade-pricing';
import { getUserUsage } from '@/lib/usage';

export default async function UpgradePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  if (session.user.isPro) {
    redirect('/settings');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, isPro: true },
  });

  if (!user) {
    redirect('/sign-in');
  }

  const usage = await getUserUsage(user.id, user.isPro);

  return (
    <>
      <UpgradePricing
        itemCount={usage.itemCount}
        collectionCount={usage.collectionCount}
      />
    </>
  );
}

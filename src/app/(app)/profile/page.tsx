import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import ProfileInfo from '@/components/profile/profile-info';
import ProfileStats from '@/components/profile/profile-stats';
import { getUserWithSettings } from '@/lib/db/users';
import PageHeader from '@/components/shared/page-header';

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const user = await getUserWithSettings(session.user.id);

  if (!user) {
    redirect('/sign-in');
  }

  // Get item counts by type
  const itemCounts = await prisma.item.groupBy({
    by: ['itemTypeId'],
    where: { userId: user.id },
    _count: { id: true },
  });

  // Get item types to map IDs to names
  const itemTypes = await prisma.itemType.findMany({
    where: { isSystem: true },
  });

  const typeCountMap = new Map(itemCounts.map((c) => [c.itemTypeId, c._count.id]));
  const itemTypeBreakdown = itemTypes.map((type) => ({
    name: type.name,
    icon: type.icon,
    color: type.color,
    count: typeCountMap.get(type.id) || 0,
  }));

  // Get totals
  const [totalItems, totalCollections] = await Promise.all([
    prisma.item.count({ where: { userId: user.id } }),
    prisma.collection.count({ where: { userId: user.id } }),
  ]);

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-10">
        <PageHeader path="profile" title="Profile" description="Your account, and what you've put in the bin." />

        <div className="space-y-6">
          <ProfileInfo
            user={{
              id: user.id,
              name: user.name,
              email: user.email,
              image: user.image,
              createdAt: user.createdAt,
            }}
            isPro={session.user.isPro}
          />
          <ProfileStats
            totalItems={totalItems}
            totalCollections={totalCollections}
            itemTypeBreakdown={itemTypeBreakdown}
          />
        </div>
      </div>
    </>
  );
}

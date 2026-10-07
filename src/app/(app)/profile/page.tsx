import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import ProfileInfo from '@/components/profile/profile-info';
import ProfileStats from '@/components/profile/profile-stats';
import { getProfileStats, getUserWithSettings } from '@/lib/db/users';
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

  const { totalItems, totalCollections, itemTypeBreakdown } = await getProfileStats(user.id);

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

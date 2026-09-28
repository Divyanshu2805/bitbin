import { redirect } from 'next/navigation';
import { ViewToggle } from '@/components/shared/view-toggle';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import BinOverview from '@/components/dashboard/bin-overview';
import QuickCreate from '@/components/dashboard/quick-create';
import PageHeader, { TitleAccent } from '@/components/shared/page-header';
import EmptyState from '@/components/shared/empty-state';
import CollectionsSection from '@/components/dashboard/collections-section';
import PinnedItems from '@/components/dashboard/pinned-items';
import RecentItems from '@/components/dashboard/recent-items';
import { getRecentCollections } from '@/lib/db/collections';
import { getPinnedItems, getRecentItems, getDashboardStats, getItemTypesWithCounts } from '@/lib/db/items';
import { DASHBOARD_COLLECTIONS_LIMIT, DASHBOARD_RECENT_ITEMS_LIMIT } from '@/lib/constants/pagination';
import { formatRelativeDate } from '@/lib/utils/date';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true },
  });

  const [collections, pinnedItems, recentItems, stats, itemTypes] = user
    ? await Promise.all([
        getRecentCollections(user.id, DASHBOARD_COLLECTIONS_LIMIT),
        getPinnedItems(user.id),
        getRecentItems(user.id, DASHBOARD_RECENT_ITEMS_LIMIT),
        getDashboardStats(user.id),
        getItemTypesWithCounts(user.id),
      ])
    : [[], [], [], { totalItems: 0, totalCollections: 0, favoriteItems: 0, favoriteCollections: 0 }, []];

  const firstName = user?.name?.split(' ')[0];
  const lastChange = recentItems[0] ? formatRelativeDate(recentItems[0].updatedAt) : null;

  return (
    <>
      <div className="mx-auto max-w-6xl space-y-12">
        <div className="space-y-6">
          <PageHeader
            path="dashboard"
            title={
              <>
                Welcome back{firstName ? <>, <TitleAccent>{firstName}</TitleAccent></> : ''}
              </>
            }
            description={
              <>
                Here&apos;s what&apos;s in your bin.
                {lastChange && (
                  <>
                    {' '}Last change{' '}
                    <span className="font-mono text-sm text-foreground/80">{lastChange.toLowerCase()}</span>.
                  </>
                )}
              </>
            }
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <QuickCreate isPro={session.user.isPro} />
            <ViewToggle />
          </div>
        </div>

        <BinOverview stats={stats} itemTypes={itemTypes} isPro={session.user.isPro} />

        {stats.totalItems === 0 ? (
          <EmptyState
            title="Your bin is empty"
            description="Save your first snippet, prompt or command. Press N anywhere, or pick a type above."
          />
        ) : (
          <>
            <PinnedItems items={pinnedItems} />
            <RecentItems items={recentItems} />
          </>
        )}

        <CollectionsSection collections={collections} />
      </div>
    </>
  );
}

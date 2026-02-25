import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/layout/dashboard-layout';
import StatsCards from '@/components/dashboard/stats-cards';
import CollectionsSection from '@/components/dashboard/collections-section';
import PinnedItems from '@/components/dashboard/pinned-items';
import RecentItems from '@/components/dashboard/recent-items';
import { getRecentCollections, getSidebarCollections } from '@/lib/db/collections';
import { getPinnedItems, getRecentItems, getDashboardStats, getItemTypesWithCounts } from '@/lib/db/items';
import { getEditorPreferences } from '@/lib/db/users';
import { DASHBOARD_COLLECTIONS_LIMIT, DASHBOARD_RECENT_ITEMS_LIMIT } from '@/lib/constants/pagination';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true },
  });

  const [collections, pinnedItems, recentItems, stats, itemTypes, sidebarCollections, editorPreferences] = user
    ? await Promise.all([
        getRecentCollections(user.id, DASHBOARD_COLLECTIONS_LIMIT),
        getPinnedItems(user.id),
        getRecentItems(user.id, DASHBOARD_RECENT_ITEMS_LIMIT),
        getDashboardStats(user.id),
        getItemTypesWithCounts(user.id),
        getSidebarCollections(user.id),
        getEditorPreferences(user.id),
      ])
    : [[], [], [], { totalItems: 0, totalCollections: 0, favoriteItems: 0, favoriteCollections: 0 }, [], { favorites: [], recents: [] }, undefined];

  const firstName = user?.name?.split(' ')[0];

  return (
    <DashboardLayout
      itemTypes={itemTypes}
      sidebarCollections={sidebarCollections}
      user={user}
      editorPreferences={editorPreferences}
      isPro={session.user.isPro}
    >
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 animate-fade-up">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-lime">Dashboard</p>
            <h1 className="mt-2 text-3xl font-bold text-foreground">
              Welcome back{firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="mt-1 text-muted-foreground">Here&apos;s what&apos;s in your bin.</p>
          </div>
          <p className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
            Press
            <kbd className="rounded border border-border bg-muted px-1.5 font-mono text-[11px]">⌘K</kbd>
            to search everything
          </p>
        </div>

        {/* Stats Cards */}
        <StatsCards stats={stats} />

        {/* Collections */}
        <CollectionsSection collections={collections} />

        {/* Pinned Items */}
        <PinnedItems items={pinnedItems} />

        {/* Recent Items */}
        <RecentItems items={recentItems} />
      </div>
    </DashboardLayout>
  );
}

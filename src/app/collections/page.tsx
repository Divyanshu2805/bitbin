import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import DashboardLayout from '@/components/layout/dashboard-layout';
import PageHeader from '@/components/shared/page-header';
import EmptyState from '@/components/shared/empty-state';
import CollectionCard from '@/components/dashboard/collection-card';
import Pagination from '@/components/shared/pagination';
import { getSidebarCollections, getAllCollections } from '@/lib/db/collections';
import { getItemTypesWithCounts } from '@/lib/db/items';
import { getUserById, getEditorPreferences } from '@/lib/db/users';
import { COLLECTIONS_PER_PAGE } from '@/lib/constants/pagination';
import { FolderOpen } from 'lucide-react';

interface CollectionsPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function CollectionsPage({ searchParams }: CollectionsPageProps) {
  const { page: pageParam } = await searchParams;
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const user = await getUserById(session.user.id);

  if (!user) {
    redirect('/sign-in');
  }

  // Parse page number (default to 1)
  const currentPage = Math.max(1, parseInt(pageParam || '1', 10) || 1);

  const [paginatedCollections, itemTypes, sidebarCollections, editorPreferences] = await Promise.all([
    getAllCollections(user.id, currentPage, COLLECTIONS_PER_PAGE),
    getItemTypesWithCounts(user.id),
    getSidebarCollections(user.id),
    getEditorPreferences(user.id),
  ]);

  const { collections, totalCount, totalPages } = paginatedCollections;

  return (
    <DashboardLayout
      itemTypes={itemTypes}
      sidebarCollections={sidebarCollections}
      user={user}
      editorPreferences={editorPreferences}
      isPro={session.user.isPro}
    >
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <PageHeader
          eyebrow="Library"
          title="Collections"
          count={totalCount}
          icon={<FolderOpen className="h-6 w-6 text-cyan" />}
        />

        {/* Collections Grid */}
        {collections.length > 0 ? (
          <div className="grid gap-4 stagger md:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No collections yet"
            description="Collections group related items by project, topic or workflow. Create one from the top bar."
          />
        )}

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          baseUrl="/collections"
        />
      </div>
    </DashboardLayout>
  );
}

import { redirect } from 'next/navigation';
import { CollectionsView } from '@/components/shared/list-views';
import { ViewToggle } from '@/components/shared/view-toggle';
import { auth } from '@/auth';
import PageHeader from '@/components/shared/page-header';
import EmptyState from '@/components/shared/empty-state';
import Pagination from '@/components/shared/pagination';
import { getAllCollections } from '@/lib/db/collections';
import { getUserById } from '@/lib/db/users';
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

  const paginatedCollections = await getAllCollections(user.id, currentPage, COLLECTIONS_PER_PAGE);

  const { collections, totalCount, totalPages } = paginatedCollections;

  return (
    <>
      <div className="mx-auto max-w-6xl space-y-10">
        {/* Header */}
        <PageHeader
          path="collections"
          title="Collections"
          count={totalCount}
          description="Group related items by project, topic or workflow. Press C to start a new one."
          icon={
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cyan/30 bg-cyan/10 text-cyan shadow-[0_10px_30px_-12px_var(--brand-cyan)]">
              <FolderOpen className="h-5 w-5" />
            </span>
          }
        >
          <ViewToggle />
        </PageHeader>

        {/* Cards or rows, by the shared grid / list choice */}
        {collections.length > 0 ? (
          <CollectionsView collections={collections} />
        ) : (
          <EmptyState
            title="No collections yet"
            description="Collections group related items by project, topic or workflow. Press C to create one."
          />
        )}

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          baseUrl="/collections"
        />
      </div>
    </>
  );
}

import { redirect, notFound } from 'next/navigation';
import { ItemsView } from '@/components/shared/list-views';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import ItemsPageHeader from '@/components/items/items-page-header';
import Pagination from '@/components/shared/pagination';
import EmptyState from '@/components/shared/empty-state';
import { getItemsByType, VALID_ITEM_TYPES } from '@/lib/db/items';
import { ITEMS_PER_PAGE } from '@/lib/constants/pagination';

interface ItemsPageProps {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function ItemsPage({ params, searchParams }: ItemsPageProps) {
  const { type: typeParam } = await params;
  const { page: pageParam } = await searchParams;

  // Convert plural route param to singular type name (e.g., "snippets" -> "snippet")
  const typeName = typeParam.endsWith('s') ? typeParam.slice(0, -1) : typeParam;

  // Validate the type
  if (!VALID_ITEM_TYPES.includes(typeName as typeof VALID_ITEM_TYPES[number])) {
    notFound();
  }

  // Parse page number (default to 1)
  const currentPage = Math.max(1, parseInt(pageParam || '1', 10) || 1);

  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, isPro: true },
  });

  if (!user) {
    redirect('/sign-in');
  }

  // Pro-only types: file and image require a Pro subscription
  const isProType = typeName === 'file' || typeName === 'image';

  if (isProType && !user.isPro) {
    redirect('/upgrade');
  }

  const paginatedItems = await getItemsByType(user.id, typeName, currentPage, ITEMS_PER_PAGE);

  const { items, totalCount, totalPages } = paginatedItems;
  const displayName = typeName.charAt(0).toUpperCase() + typeName.slice(1) + 's';

  return (
    <>
      <div className="mx-auto max-w-6xl space-y-10">
        {/* Header */}
        <ItemsPageHeader
          typeName={typeName}
          displayName={displayName}
          itemCount={totalCount}
        />

        {/* Cards or rows, by the shared grid / list choice */}
        {items.length > 0 ? (
          <ItemsView items={items} />
        ) : (
          <EmptyState
            title={`No ${typeName}s yet`}
            description={`Your ${typeName}s will show up here. Press N to add the first one.`}
          />
        )}

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          baseUrl={`/items/${typeParam}`}
        />
      </div>
    </>
  );
}

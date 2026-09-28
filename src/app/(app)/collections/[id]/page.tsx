import { redirect, notFound } from 'next/navigation';
import { ItemsView } from '@/components/shared/list-views';
import { ViewToggle } from '@/components/shared/view-toggle';
import { auth } from '@/auth';
import EmptyState from '@/components/shared/empty-state';
import CollectionActions from '@/components/collections/collection-actions';
import { CurrentCollectionProvider } from '@/components/collections/current-collection';
import Pagination from '@/components/shared/pagination';
import { getCollectionById } from '@/lib/db/collections';
import { getItemsByCollection } from '@/lib/db/items';
import { getUserById } from '@/lib/db/users';
import { ITEMS_PER_PAGE } from '@/lib/constants/pagination';
import PageHeader from '@/components/shared/page-header';
import SectionHeader from '@/components/dashboard/section-header';
import { ItemTypeIcon } from '@/components/shared/item-type-icon';
import { FileText, FolderOpen, Image as ImageIcon, Layers } from 'lucide-react';
import { readableColor } from '@/lib/utils/color';

interface CollectionDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function CollectionDetailPage({ params, searchParams }: CollectionDetailPageProps) {
  const { id: collectionId } = await params;
  const { page: pageParam } = await searchParams;
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const user = await getUserById(session.user.id);

  if (!user) {
    redirect('/sign-in');
  }

  const collection = await getCollectionById(collectionId, user.id);

  if (!collection) {
    notFound();
  }

  // Parse page number (default to 1)
  const currentPage = Math.max(1, parseInt(pageParam || '1', 10) || 1);

  const paginatedItems = await getItemsByCollection(user.id, collectionId, currentPage, ITEMS_PER_PAGE);

  const { items, totalPages } = paginatedItems;
  const accent = readableColor(collection.dominantColor || '#6b7280');
  // A readable path segment for the header pill, e.g. "react-patterns"
  const slug = collection.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'collection';

  // Separate items by type for different rendering
  const fileItems = items.filter((item) => item.itemType.name === 'file');
  const imageItems = items.filter((item) => item.itemType.name === 'image');
  const otherItems = items.filter(
    (item) => item.itemType.name !== 'file' && item.itemType.name !== 'image'
  );

  return (
    <>
      <div className="mx-auto max-w-6xl space-y-10">
        <div className="space-y-5">
          <PageHeader
            path={`collections/${slug}`}
            title={collection.name}
            count={collection.itemCount}
            description={collection.description ?? undefined}
            icon={
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border"
                style={{
                  color: accent,
                  backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`,
                  borderColor: `color-mix(in srgb, ${accent} 30%, transparent)`,
                  boxShadow: `0 10px 30px -12px ${accent}`,
                }}
              >
                <FolderOpen className="h-5 w-5" />
              </span>
            }
            // Edit, favorite and delete sit right by the name
            titleActions={<CollectionActions collection={collection} />}
          >
            <ViewToggle />
          </PageHeader>

          {/* What's inside, by type */}
          {collection.itemTypes.length > 0 && (
            <div className="flex flex-wrap gap-2 animate-fade-up" style={{ animationDelay: '120ms' }}>
              {collection.itemTypes.map((itemType) => (
                <span
                  key={itemType.name}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card/70 px-2 py-1 font-mono text-[11px] text-muted-foreground"
                >
                  <ItemTypeIcon icon={itemType.icon} className="h-3.5 w-3.5" style={{ color: readableColor(itemType.color) }} />
                  {itemType.name}s
                  <span className="tabular-nums text-foreground/80">{itemType.count}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 ? (
          // Lets each item's ⋯ menu offer "Remove" (from this collection)
          <CurrentCollectionProvider collection={{ id: collection.id, name: collection.name }}>
            <div className="space-y-10">
              {otherItems.length > 0 && (
                <section>
                  {(imageItems.length > 0 || fileItems.length > 0) && (
                    <SectionHeader icon={<Layers className="h-4 w-4" />} title="Items" count={otherItems.length} />
                  )}
                  <ItemsView items={otherItems} />
                </section>
              )}

              {imageItems.length > 0 && (
                <section>
                  {(otherItems.length > 0 || fileItems.length > 0) && (
                    <SectionHeader icon={<ImageIcon className="h-4 w-4" />} title="Images" count={imageItems.length} />
                  )}
                  <ItemsView items={imageItems} />
                </section>
              )}

              {fileItems.length > 0 && (
                <section>
                  {(otherItems.length > 0 || imageItems.length > 0) && (
                    <SectionHeader icon={<FileText className="h-4 w-4" />} title="Files" count={fileItems.length} />
                  )}
                  <ItemsView items={fileItems} />
                </section>
              )}
            </div>
          </CurrentCollectionProvider>
        ) : (
          <EmptyState
            title="This collection is empty"
            description="Add items to it from the item drawer, or pick it when you create a new item."
          />
        )}

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          baseUrl={`/collections/${collectionId}`}
        />
      </div>
    </>
  );
}

import { FolderOpen } from 'lucide-react';
import { CollectionsView } from '@/components/shared/list-views';
import SectionHeader from './section-header';
import EmptyState from '@/components/shared/empty-state';
import type { CollectionWithTypes } from '@/lib/db/collections';

interface CollectionsSectionProps {
  collections: CollectionWithTypes[];
}

export default function CollectionsSection({
  collections,
}: CollectionsSectionProps) {
  return (
    <section>
      <SectionHeader
        icon={<FolderOpen className="h-4 w-4" />}
        title="Collections"
        href="/collections"
        linkLabel="show all"
      />
      {collections.length === 0 ? (
        <EmptyState
          title="No collections yet"
          description="Group related items by project, topic or workflow. Press C to create one."
        />
      ) : (
        <CollectionsView collections={collections} />
      )}
    </section>
  );
}

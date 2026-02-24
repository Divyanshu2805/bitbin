import { Library } from 'lucide-react';
import CollectionCard from './collection-card';
import SectionHeader from './section-header';
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
        icon={<Library className="h-4 w-4" />}
        title="Collections"
        href="/collections"
      />
      {collections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No collections yet. Group related items together with{' '}
            <span className="font-medium text-foreground">Collection</span> in the top bar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 stagger sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      )}
    </section>
  );
}

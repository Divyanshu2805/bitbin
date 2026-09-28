import { Pin } from 'lucide-react';
import { ItemsView } from '@/components/shared/list-views';
import SectionHeader from './section-header';
import type { ItemWithType } from '@/lib/db/items';

interface PinnedItemsProps {
  items: ItemWithType[];
}

export default function PinnedItems({ items }: PinnedItemsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section>
      <SectionHeader icon={<Pin className="h-4 w-4 text-destructive" />} title="Pinned" count={items.length} />
      <ItemsView items={items} />
    </section>
  );
}

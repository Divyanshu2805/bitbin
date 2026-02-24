import { Pin } from 'lucide-react';
import ItemCard from './item-card';
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
      <SectionHeader
        icon={<Pin className="h-4 w-4 text-lime" />}
        title="Pinned"
        count={items.length}
      />
      <div className={`grid gap-4 stagger ${items.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

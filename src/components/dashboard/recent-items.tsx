import { Clock } from 'lucide-react';
import ItemCard from './item-card';
import SectionHeader from './section-header';
import type { ItemWithType } from '@/lib/db/items';

interface RecentItemsProps {
  items: ItemWithType[];
}

export default function RecentItems({ items }: RecentItemsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section>
      <SectionHeader icon={<Clock className="h-4 w-4" />} title="Recent items" />
      <div className="grid grid-cols-1 gap-4 stagger md:grid-cols-2">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

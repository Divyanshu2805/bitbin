import { History } from 'lucide-react';
import SectionHeader from './section-header';
import { ItemsView } from '@/components/shared/list-views';
import type { ItemWithType } from '@/lib/db/items';

interface RecentItemsProps {
  items: ItemWithType[];
}

/** The latest changes in the bin, as cards or rows by the shared grid / list choice. */
export default function RecentItems({ items }: RecentItemsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section>
      <SectionHeader icon={<History className="h-4 w-4" />} title="Recent" count={items.length} />
      <ItemsView items={items} />
    </section>
  );
}

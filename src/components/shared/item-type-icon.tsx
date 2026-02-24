import { createElement } from "react";
import type { LucideProps } from "lucide-react";
import { getItemTypeIcon } from "@/lib/constants/item-types";

interface ItemTypeIconProps extends LucideProps {
  /** Icon name stored on the item type (e.g. "Code", "Terminal") */
  icon: string;
}

/**
 * Renders the Lucide icon for an item type. Using createElement keeps the
 * lookup out of JSX so React doesn't treat it as a component created during render.
 */
export function ItemTypeIcon({ icon, ...props }: ItemTypeIconProps) {
  return createElement(getItemTypeIcon(icon), props);
}

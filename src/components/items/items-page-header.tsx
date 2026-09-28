import { readableColor } from "@/lib/utils/color";
import { ViewToggle } from "@/components/shared/view-toggle";
import { ITEM_TYPE_COLORS } from "@/lib/constants/item-types";
import { ItemTypeIcon } from "@/components/shared/item-type-icon";
import PageHeader from "@/components/shared/page-header";

const TYPE_ICON_NAMES: Record<string, string> = {
  snippet: "Code",
  prompt: "Sparkles",
  command: "Terminal",
  note: "StickyNote",
  file: "File",
  image: "Image",
  link: "Link",
};

const TYPE_DESCRIPTIONS: Record<string, string> = {
  snippet: "Reusable code, highlighted in the language it's written in.",
  prompt: "The prompts that work, ready to paste into any model.",
  command: "Shell one-liners you'd otherwise dig out of your history.",
  note: "Markdown notes, runbooks and things worth remembering.",
  file: "Files kept next to the rest of your knowledge.",
  image: "Screenshots, diagrams and images, stored with your items.",
  link: "Docs and references you keep coming back to.",
};

interface ItemsPageHeaderProps {
  typeName: string;
  displayName: string;
  itemCount: number;
}

/**
 * Header for a type's page (`~/items/snippets`): the type's icon and colour, a
 * count and a line about the type. Creating is the top bar's job: on this page
 * its New item button (and N) opens the dialog already set to the type.
 */
export default function ItemsPageHeader({ typeName, displayName, itemCount }: ItemsPageHeaderProps) {
  const color = readableColor(ITEM_TYPE_COLORS[typeName as keyof typeof ITEM_TYPE_COLORS] ?? "#6b7280");

  return (
    <PageHeader
      path={`items/${typeName}s`}
      title={displayName}
      count={itemCount}
      description={TYPE_DESCRIPTIONS[typeName]}
      icon={
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border"
          style={{
            color,
            backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
            borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
            boxShadow: `0 10px 30px -12px ${color}`,
          }}
        >
          <ItemTypeIcon icon={TYPE_ICON_NAMES[typeName] ?? "Code"} className="h-5 w-5" />
        </span>
      }
    >
      <ViewToggle />
    </PageHeader>
  );
}

import Link from "next/link";
import { BarChart3 } from "lucide-react";
import Panel from "@/components/shared/panel";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { ItemTypeIcon } from "@/components/shared/item-type-icon";
import { readableColor } from "@/lib/utils/color";

interface ItemTypeCount {
  name: string;
  icon: string;
  color: string;
  count: number;
}

interface ProfileStatsProps {
  totalItems: number;
  totalCollections: number;
  itemTypeBreakdown: ItemTypeCount[];
}

/** Totals, then one bar per type, scaled to the largest, growing in one after another. */
export default function ProfileStats({ totalItems, totalCollections, itemTypeBreakdown }: ProfileStatsProps) {
  const max = Math.max(1, ...itemTypeBreakdown.map((type) => type.count));

  return (
    <Panel id="usage" icon={<BarChart3 />} title="Usage" description="What's in your bin, by type.">
      <div className="grid gap-8 md:grid-cols-[160px_minmax(0,1fr)]">
        {/* Plain figures beside the bars, ruled off from them */}
        <dl className="flex gap-10 md:flex-col md:gap-6 md:border-r md:border-border md:pr-8">
          {[
            { label: "Items", value: totalItems, color: "var(--brand-lime)" },
            { label: "Collections", value: totalCollections, color: "var(--brand-cyan)" },
          ].map((stat) => (
            <div key={stat.label}>
              <dt className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                <span aria-hidden className="size-1.5 rounded-[2px]" style={{ backgroundColor: stat.color }} />
                {stat.label}
              </dt>
              <dd>
                <AnimatedNumber
                  value={stat.value}
                  className="mt-1 block font-sans text-3xl font-semibold tabular-nums tracking-[-0.045em]"
                />
              </dd>
            </div>
          ))}
        </dl>

        <ul className="space-y-2.5">
          {itemTypeBreakdown.map((type, i) => (
            <li key={type.name}>
              <Link
                href={`/items/${type.name}s`}
                className="group grid grid-cols-[110px_minmax(0,1fr)_2.5rem] items-center gap-3 font-mono text-xs capitalize"
              >
                <span className="flex items-center gap-2 text-muted-foreground transition-colors group-hover:text-foreground">
                  <ItemTypeIcon icon={type.icon} className="h-3.5 w-3.5" style={{ color: readableColor(type.color) }} />
                  {type.name}s
                </span>
                <span className="h-2 overflow-hidden rounded-[2px] bg-[color-mix(in_srgb,var(--foreground)_6%,var(--card))]">
                  <span
                    className="block h-full origin-left rounded-[2px] opacity-80 transition-opacity group-hover:opacity-100 animate-[bar-fill_0.9s_cubic-bezier(0.22,1,0.36,1)_both]"
                    style={{
                      width: `${(type.count / max) * 100}%`,
                      backgroundColor: type.color,
                      animationDelay: `${150 + i * 70}ms`,
                    }}
                  />
                </span>
                <span className="text-right tabular-nums text-foreground/80">{type.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}

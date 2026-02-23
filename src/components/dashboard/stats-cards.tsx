import { Boxes, FolderOpen, Star, Heart } from "lucide-react";
import { AnimatedNumber } from "@/components/shared/animated-number";
import type { DashboardStats } from "@/lib/db/items";

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <div
      className="card-lift group relative overflow-hidden rounded-xl border border-border bg-card px-4 py-4"
      style={{ "--accent-color": color } as React.CSSProperties}
    >
      {/* accent glow in the corner */}
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-40 blur-2xl transition-opacity duration-300 group-hover:opacity-80"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            {title}
          </p>
          <AnimatedNumber
            value={value}
            className="mt-2 block font-display text-3xl font-bold tabular-nums tracking-tight"
          />
        </div>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg border"
          style={{
            color,
            backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
            borderColor: `color-mix(in srgb, ${color} 25%, transparent)`,
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

interface StatsCardsProps {
  stats: DashboardStats;
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const statItems = [
    {
      title: "Items",
      value: stats.totalItems,
      icon: <Boxes className="h-4 w-4" />,
      color: "var(--brand-lime)",
    },
    {
      title: "Collections",
      value: stats.totalCollections,
      icon: <FolderOpen className="h-4 w-4" />,
      color: "var(--brand-cyan)",
    },
    {
      title: "Fav items",
      value: stats.favoriteItems,
      icon: <Star className="h-4 w-4" />,
      color: "#ffc857",
    },
    {
      title: "Fav collections",
      value: stats.favoriteCollections,
      icon: <Heart className="h-4 w-4" />,
      color: "var(--brand-coral)",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 stagger lg:grid-cols-4 lg:gap-4">
      {statItems.map((stat) => (
        <StatCard key={stat.title} {...stat} />
      ))}
    </div>
  );
}

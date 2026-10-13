import { cn } from "@/lib/utils";

interface PanelProps {
  /** Anchor, so a link can point at this card (`/settings#billing`) */
  id?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  /** Shown after the title, e.g. a PRO tag */
  badge?: React.ReactNode;
  /** Controls on the right of the header */
  action?: React.ReactNode;
  tone?: "default" | "danger";
  className?: string;
  children: React.ReactNode;
}

/**
 * A settings-style card: a header (icon, serif title, a line of description,
 * optional action) over a padded body. Used by Settings and Profile. A danger
 * panel is the same card in the destructive colour.
 */
export default function Panel({
  id,
  title,
  description,
  icon,
  badge,
  action,
  tone = "default",
  className,
  children,
}: PanelProps) {
  const danger = tone === "danger";
  return (
    <section
      id={id}
      className={cn("card-surface scroll-mt-6 overflow-hidden animate-fade-up", className)}
      style={danger ? ({ "--tone": "var(--destructive)" } as React.CSSProperties) : undefined}
    >
      <header
        data-anim-icons
        className={cn(
          "flex items-start gap-3 border-b px-6 py-5",
          danger ? "border-destructive/25" : "border-border"
        )}
      >
        {icon && (
          <span
            className={cn(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border [&_svg]:h-4 [&_svg]:w-4",
              danger
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-[color-mix(in_srgb,var(--brand-lime)_40%,var(--card))] bg-[color-mix(in_srgb,var(--brand-lime)_22%,var(--card))] text-lime"
            )}
          >
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="flex flex-wrap items-center gap-2 font-display text-xl leading-tight text-foreground">
            {title}
            {badge}
          </h2>
          {description && <p className="text-desc mt-1 text-sm leading-relaxed">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="px-6 py-6">{children}</div>
    </section>
  );
}

/** The coral `PRO` tag used next to Pro-only features. */
export function ProTag() {
  return (
    <span className="rounded-sm border border-[color-mix(in_srgb,var(--brand-coral)_35%,var(--card))] px-1 font-mono text-[9px] font-normal uppercase tracking-wide text-coral">
      pro
    </span>
  );
}

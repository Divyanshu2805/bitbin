import { cn } from "@/lib/utils";

interface PanelProps {
  /** Anchor for in-page navigation (the settings index links to it) */
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
 * A settings-style pane: a header strip (icon, title, a line of description,
 * optional action) over a padded body. Used by Settings and Profile.
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
      className={cn(
        "scroll-mt-6 overflow-hidden rounded-lg border bg-card/80 animate-fade-up",
        danger ? "border-destructive/30" : "border-border",
        className
      )}
    >
      <header
        data-anim-icons
        className={cn(
          "flex items-start gap-3 border-b px-5 py-4",
          danger ? "border-destructive/20 bg-destructive/[0.04]" : "border-border bg-surface/60"
        )}
      >
        {icon && (
          <span
            className={cn(
              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background/60 [&_svg]:h-4 [&_svg]:w-4",
              danger ? "border-destructive/30 text-destructive" : "border-border text-lime"
            )}
          >
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="flex flex-wrap items-center gap-2 font-display text-base font-semibold tracking-[-0.02em] text-foreground">
            {title}
            {badge}
          </h2>
          {description && <p className="text-desc mt-0.5 text-sm">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

/** The coral `PRO` tag used next to Pro-only features. */
export function ProTag() {
  return (
    <span className="rounded-sm border border-coral/35 px-1 font-mono text-[9px] font-normal uppercase tracking-wide text-coral">
      pro
    </span>
  );
}

interface PageHeaderProps {
  /** Rises into place on load; pass a node for mixed styling */
  title: React.ReactNode;
  description?: React.ReactNode;
  count?: number;
  icon?: React.ReactNode;
  /** Controls right after the title and count (e.g. a collection's edit / favorite / delete) */
  titleActions?: React.ReactNode;
  /** Actions on the right of the whole header */
  children?: React.ReactNode;
}

/**
 * Standard heading block for app pages, in the landing page's language: a serif title that rises out of its own line, an optional `[count]`,
 * a line of description and actions on the right.
 */
export default function PageHeader({ title, description, count, icon, titleActions, children }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 animate-fade-up">
      <div className="min-w-0 space-y-3">
        <div data-anim-icons className="flex min-w-0 items-center gap-3">
          {icon}
          <h1 className="min-w-0 font-display text-[clamp(2rem,3.4vw,2.75rem)] leading-[1.06] tracking-[-0.035em] text-foreground">
            <span className="hero-line">
              <span className="truncate">{title}</span>
            </span>
          </h1>
          {count !== undefined && (
            <span className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground">[{count}]</span>
          )}
          {titleActions && <div className="ml-1 shrink-0">{titleActions}</div>}
        </div>
        {description && <p className="text-desc max-w-2xl text-base leading-[1.75]">{description}</p>}
      </div>
      {children}
    </div>
  );
}

/** A word in a page title picked out in the accent. */
export function TitleAccent({ children }: { children: React.ReactNode }) {
  return <span className="text-lime">{children}</span>;
}

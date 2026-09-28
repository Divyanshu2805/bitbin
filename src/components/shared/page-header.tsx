import { TypeText } from "@/components/shared/type-text";

interface PageHeaderProps {
  /** Shown as a `~/path` pill above the title, e.g. "items/snippets" */
  path: string;
  /** Typed in on load, a character at a time; pass a node for mixed styling */
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
 * Standard heading block for app pages, in the landing page's language: a mono
 * `~/path` pill, a display heading that types itself in,
 * an optional `[count]`, a line of description and actions on the right.
 */
export default function PageHeader({ path, title, description, count, icon, titleActions, children }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 animate-fade-up">
      <div className="min-w-0 space-y-3">
        <PathPill path={path} />
        <div data-anim-icons className="flex min-w-0 items-center gap-3">
          {icon}
          <h1 className="min-w-0 truncate font-display text-[clamp(1.6rem,3vw,2.1rem)] font-bold leading-[1.1] tracking-[-0.04em] text-foreground">
            <TypeText>{title}</TypeText>
          </h1>
          {count !== undefined && (
            <span className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground">[{count}]</span>
          )}
          {titleActions && <div className="ml-1 shrink-0">{titleActions}</div>}
        </div>
        {description && <p className="text-desc max-w-2xl text-[15px] leading-relaxed">{description}</p>}
      </div>
      {children}
    </div>
  );
}

/** The lime `~/path` pill used over page and form headings. */
export function PathPill({ path }: { path: string }) {
  return (
    <p className="inline-flex max-w-full items-center gap-2 rounded-full border border-lime/35 bg-lime/[0.08] px-3 py-1 font-mono text-xs text-lime">
      <span className="size-1.5 shrink-0 rounded-full bg-lime" aria-hidden />
      <span className="truncate">~/{path}</span>
    </p>
  );
}

/** A word in a page title picked out in the brand gradient. */
export function TitleAccent({ children }: { children: React.ReactNode }) {
  return <span className="text-brand-gradient">{children}</span>;
}

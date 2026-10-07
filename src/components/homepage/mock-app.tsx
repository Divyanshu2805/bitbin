import { Folder, FolderOpen, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { readableColor } from "@/lib/utils/color";
import { KeyLabel } from "@/components/shared/kbd";

// Pieces of the real app shell, drawn small for the homepage demos, so every
// mock window looks like the app does now and follows the theme: `// label`
// section headings, the current row on a lime pill with a glowing bar, folders
// in each collection's colour, the `> search your bin` prompt with / and ⌘K,
// and buttons with the app's tinted glass (.term-btn). Keep them in step with
// components/layout (sidebar-nav, top-bar) when the app changes.

/** The sidebar's surface: see-through over the window, like the app's over its backdrop. */
export const MOCK_SIDEBAR = "bg-[color-mix(in_srgb,var(--sidebar)_70%,transparent)]";

/** `// types`, as the sidebar writes its section headings. */
export function MockSectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("px-2 pb-1 font-mono text-[10.5px] whitespace-nowrap text-muted-foreground", className)}>
      <span className="text-faint dark:text-muted-foreground/50">{"// "}</span>
      {children}
    </p>
  );
}

/**
 * A sidebar row. The current one sits on the app's lime pill (`.sidebar-pill`
 * active: a lime wash, a lime hairline and a glowing bar at the left edge) and
 * its count turns lime.
 */
export function MockNavRow({
  icon: Icon,
  iconColor,
  label,
  count,
  active = false,
  hideLabel = false,
  className,
}: {
  icon: LucideIcon;
  /** An item type's colour; rows without one (overview) wear lime when current */
  iconColor?: string;
  label: string;
  count?: React.ReactNode;
  active?: boolean;
  /** On a collapsed rail: the label and count fade, the icon stays put */
  hideLabel?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative flex h-7 items-center gap-2.5 rounded-lg px-2 text-[12.5px] whitespace-nowrap transition-[background-color,box-shadow,color] duration-300",
        active
          ? "bg-lime/15 font-medium text-foreground shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--brand-lime)_28%,transparent),0_6px_20px_-12px_color-mix(in_srgb,var(--brand-lime)_60%,transparent)]"
          : "text-foreground/75",
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-1/2 -left-2 h-3.5 w-[3px] -translate-y-1/2 rounded-r-full bg-lime shadow-[0_0_10px_var(--brand-lime)] transition-opacity duration-300",
          active ? "opacity-100" : "opacity-0"
        )}
      />
      <Icon
        className={cn("size-3.5 shrink-0", !iconColor && active && "text-lime")}
        style={iconColor ? { color: readableColor(iconColor) } : undefined}
      />
      <span className={cn("min-w-0 truncate transition-opacity duration-300", hideLabel && "opacity-0")}>{label}</span>
      {count !== undefined ? (
        <span
          className={cn(
            "ml-auto font-mono text-[10.5px] tabular-nums transition-opacity duration-300",
            active ? "text-lime" : "text-muted-foreground",
            hideLabel && "opacity-0"
          )}
        >
          {count}
        </span>
      ) : null}
    </span>
  );
}

/** A collection in the sidebar: a folder in its colour, open while it's the current page. */
export function MockCollectionRow({
  name,
  color,
  count,
  active = false,
  hideLabel = false,
}: {
  name: string;
  color: string;
  count?: number;
  active?: boolean;
  hideLabel?: boolean;
}) {
  return (
    <MockNavRow
      icon={active ? FolderOpen : Folder}
      iconColor={color}
      label={name}
      count={count}
      active={active}
      hideLabel={hideLabel}
    />
  );
}

/** The top bar's search: a `>` prompt, the placeholder, and its / and ⌘K keys. */
export function MockSearch({ text = "search your bin", className }: { text?: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "flex h-7 min-w-0 items-center gap-2 rounded-lg border border-border bg-[color-mix(in_srgb,var(--card)_70%,transparent)] px-2.5 font-mono text-[10.5px] text-muted-foreground",
        className
      )}
    >
      <span className="text-lime">&gt;</span>
      <span className="min-w-0 flex-1 truncate">{text}</span>
      <span className="kbd hidden sm:inline-flex">/</span>
      <span className="kbd">
        <KeyLabel label="⌘K" />
      </span>
    </span>
  );
}

/**
 * The app's button, drawn: tinted glass in its accent (`.term-btn`), lime for the
 * main action, and its shortcut on a key cap. Not a real button; demos only.
 */
export function MockButton({
  children,
  primary = false,
  accent,
  keys,
  icon: Icon,
  className,
}: {
  children?: React.ReactNode;
  primary?: boolean;
  /** Defaults to lime; e.g. coral for "New collection", like the top bar */
  accent?: string;
  keys?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "term-btn inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 font-mono text-[11px] whitespace-nowrap",
        primary ? "term-primary" : "term-outline",
        className
      )}
      style={accent ? ({ "--grid-color": accent, "--btn-accent": accent } as React.CSSProperties) : undefined}
    >
      {Icon ? <Icon className="size-3.5" /> : null}
      {children}
      {keys ? <span className="btn-kbd">{keys}</span> : null}
    </span>
  );
}

/** A page's path pill, like PageHeader's `~/collections/infra`. */
export function MockPathPill({ path }: { path: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-lime/35 bg-lime/[0.08] px-2 py-0.5 font-mono text-[10px] text-lime">
      <span className="size-1 shrink-0 rounded-full bg-lime" />
      <span className="truncate">~/{path}</span>
    </span>
  );
}

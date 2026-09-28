import Link from 'next/link';

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  count?: number;
  href?: string;
  linkLabel?: string;
}

/**
 * Heading row shared by the dashboard sections, drawn like a terminal rule:
 * `▸ // pinned [3] ───────────── view all →`
 */
export default function SectionHeader({ icon, title, count, href, linkLabel = 'view all' }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="flex shrink-0 items-center gap-2">
        <span data-anim-icons className="text-muted-foreground [&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>
        <h2 className="font-mono text-sm text-foreground">
          <span className="text-muted-foreground">{"// "}</span>
          {title.toLowerCase()}
        </h2>
        {count !== undefined && (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">[{count}]</span>
        )}
      </div>
      <span aria-hidden className="h-px flex-1 bg-[linear-gradient(90deg,var(--border),transparent)]" />
      {href && (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-lime"
        >
          {linkLabel}
          <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
        </Link>
      )}
    </div>
  );
}

import Link from 'next/link';
import RoundArrow from '@/components/shared/round-arrow';

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  count?: number;
  href?: string;
  linkLabel?: string;
}

/**
 * Heading row shared by the dashboard sections: a serif title with its count,
 * a hairline, and a link to the whole list.
 */
export default function SectionHeader({ icon, title, count, href, linkLabel = 'View all' }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="flex shrink-0 items-center gap-2.5">
        <span data-anim-icons className="text-lime [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
        <h2 className="font-display text-[22px] leading-none text-foreground">{title}</h2>
        {count !== undefined && (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">[{count}]</span>
        )}
      </div>
      <span aria-hidden className="h-px flex-1 bg-border" />
      {href && (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-lime"
        >
          {linkLabel}
          <RoundArrow />
        </Link>
      )}
    </div>
  );
}

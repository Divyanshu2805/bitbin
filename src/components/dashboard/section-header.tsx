import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  count?: number;
  href?: string;
  linkLabel?: string;
}

/** Heading row shared by the dashboard sections */
export default function SectionHeader({ icon, title, count, href, linkLabel = 'View all' }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {count !== undefined && (
          <span className="rounded-md bg-muted px-1.5 py-px font-mono text-[11px] text-muted-foreground">
            {count}
          </span>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-lime"
        >
          {linkLabel}
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

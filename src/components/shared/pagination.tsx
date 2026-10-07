import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PageInfo } from '@/lib/keyset';

interface PaginationProps {
  pageInfo: PageInfo;
  baseUrl: string;
}

const linkClass = cn(
  'flex h-9 items-center justify-center gap-1 rounded-md border border-border bg-card px-3 font-mono text-xs transition-colors',
  'hover:border-lime/40 hover:text-lime'
);

/**
 * Previous / next links for a keyset-paginated list. A page is identified by the row it starts
 * after or ends before (`?after=` / `?before=`), so there are no page numbers; the first page is
 * the plain list URL.
 */
export default function Pagination({ pageInfo, baseUrl }: PaginationProps) {
  const { hasPrev, hasNext, prevCursor, nextCursor } = pageInfo;
  if (!hasPrev && !hasNext) return null;

  const separator = baseUrl.includes('?') ? '&' : '?';
  const prevHref = prevCursor ? `${baseUrl}${separator}before=${encodeURIComponent(prevCursor)}` : null;
  const nextHref = nextCursor ? `${baseUrl}${separator}after=${encodeURIComponent(nextCursor)}` : null;

  return (
    <nav className="flex items-center justify-center gap-2" aria-label="Pagination">
      {hasPrev && (
        <Link href={baseUrl} className={linkClass} aria-label="First page">
          <span className="hidden sm:inline">first</span>
          <span className="sm:hidden">1</span>
        </Link>
      )}

      {prevHref ? (
        <Link href={prevHref} className={linkClass} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">prev</span>
        </Link>
      ) : (
        <span className={cn(linkClass, 'cursor-not-allowed opacity-50 hover:border-border hover:text-inherit')} aria-disabled="true">
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">prev</span>
        </span>
      )}

      {nextHref ? (
        <Link href={nextHref} className={linkClass} aria-label="Next page">
          <span className="hidden sm:inline">next</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className={cn(linkClass, 'cursor-not-allowed opacity-50 hover:border-border hover:text-inherit')} aria-disabled="true">
          <span className="hidden sm:inline">next</span>
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}

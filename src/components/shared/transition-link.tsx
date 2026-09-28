"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ComponentProps } from "react";
import { slideOnHistoryMoves, slideTo } from "@/lib/view-transition";

type TransitionLinkProps = ComponentProps<typeof Link> & {
  href: string;
  /** Slide left-to-right, as if going back */
  back?: boolean;
};

/**
 * A Link that slides to the next page. Modified and middle clicks behave like a
 * normal link (new tab, etc.).
 */
export function TransitionLink({ href, back, onClick, ...props }: TransitionLinkProps) {
  const router = useRouter();
  return (
    <Link
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        slideTo(() => router.push(href), href, { back });
      }}
      {...props}
    />
  );
}

/** router.push inside a page slide. */
export function useTransitionRouter() {
  const router = useRouter();
  return {
    push: (href: string, options?: { back?: boolean }) => slideTo(() => router.push(href), href, options),
  };
}

/** Makes the browser's Back / Forward between the homepage and the auth pages slide (root layout) */
export function HistorySlides() {
  useEffect(() => slideOnHistoryMoves(), []);
  return null;
}

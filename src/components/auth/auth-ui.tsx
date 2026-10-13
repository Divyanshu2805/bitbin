"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { prefersReducedMotion, usePointerEffects } from "@/hooks/use-motion";
import Link from "next/link";

// Building blocks for the auth forms, in the landing page's language (brand.css): a mono
// kicker over a serif heading, plain fields that take the accent on focus, and the hero's button.

/**
 * The root of the auth pages. `.brand` turns on the landing buttons, and the pointer
 * position is written to each button so its hover fill spreads from where the pointer came in.
 */
export function AuthRoot({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  usePointerEffects(ref);
  return (
    <div ref={ref} className={cn("auth-page brand", className)}>
      {children}
    </div>
  );
}

/**
 * A word that types itself, holds, deletes and types the next, with a caret at its edge.
 * An invisible copy of the longest word sets the slot's width, so the centred line never
 * shifts as the words change. Screen readers get the line from the parent's label;
 * reduced motion shows the first word and stops.
 */
export function TypedWord({ words }: { words: string[] }) {
  const [index, setIndex] = useState(0);
  const [length, setLength] = useState(words[0].length);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const word = words[index];
    let delay = deleting ? 45 : 85 + Math.random() * 50;
    if (!deleting && length === word.length) delay = 1900; // hold the finished word
    const id = window.setTimeout(() => {
      if (!deleting && length === word.length) setDeleting(true);
      else if (deleting && length === 0) {
        setDeleting(false);
        setIndex((i) => (i + 1) % words.length);
      } else setLength((n) => n + (deleting ? -1 : 1));
    }, delay);
    return () => window.clearTimeout(id);
  }, [words, index, length, deleting]);

  const longest = words.reduce((a, b) => (b.length > a.length ? b : a));
  return (
    <span aria-hidden className="typed-word">
      <span className="invisible">{longest},</span>
      <span>
        {words[index].slice(0, length)}
        <span className="typed-caret" />
        {length === words[index].length ? "," : null}
      </span>
    </span>
  );
}

/** A serif title that rises into place, and one line under it, centred over the form. */
export function AuthHeader({
  title,
  description,
}: {
  title: React.ReactNode;
  description: React.ReactNode;
}) {
  return (
    <div className="text-center">
      <h1 className="auth-title brand-serif">
        <span className="hero-line">
          <span>{title}</span>
        </span>
      </h1>
      <p className="auth-lede">{description}</p>
    </div>
  );
}

/** The accent word in an auth heading, with a pen stroke that draws under it, as on the landing hero. */
export function AuthAccent({ children }: { children: React.ReactNode }) {
  return (
    <span className="auth-accent">
      {children}
      <svg aria-hidden className="hero-underline" viewBox="0 0 300 18" preserveAspectRatio="none" fill="none">
        <path pathLength={100} d="M3 12 C 60 3, 120 3, 170 9 S 262 15, 297 6" />
      </svg>
    </span>
  );
}

/**
 * A field with an icon and a label inside the box. The label rests where the
 * placeholder would be and lifts into a small mono caption on focus or once
 * there's a value; on focus the box takes the accent (`.auth-input` in brand.css).
 * Password fields get a show/hide toggle. `aside` renders under the box, right-aligned.
 */
export function AuthField({
  id,
  label,
  icon: Icon,
  type = "text",
  aside,
  ...props
}: Omit<React.ComponentProps<"input">, "placeholder"> & {
  id: string;
  label: string;
  icon: LucideIcon;
  aside?: React.ReactNode;
}) {
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="space-y-1.5">
      <div className="auth-field group relative">
        <Icon
          aria-hidden
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within:text-lime"
        />
        <input
          id={id}
          type={isPassword && revealed ? "text" : type}
          placeholder=" "
          data-password={isPassword || undefined}
          className="auth-input peer text-base lg:text-sm"
          {...props}
        />
        <label
          htmlFor={id}
          className={cn(
            "pointer-events-none absolute left-10 top-1/2 -translate-y-1/2 text-sm text-muted-foreground transition-all duration-200",
            "peer-focus:top-3.5 peer-focus:font-mono peer-focus:text-[11px] peer-focus:text-lime",
            "peer-[:not(:placeholder-shown)]:top-3.5 peer-[:not(:placeholder-shown)]:font-mono peer-[:not(:placeholder-shown)]:text-[11px]",
            // Browser autofill (and its hover preview) fills the box without
            // clearing :placeholder-shown, so lift the label for it too
            "peer-autofill:top-3.5 peer-autofill:font-mono peer-autofill:text-[11px]"
          )}
        >
          {label}
        </label>
        {isPassword ? (
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
          >
            {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        ) : null}
      </div>
      {aside ? <div className="flex justify-end">{aside}</div> : null}
    </div>
  );
}

/** The landing button's arrow badge: one arrow rides out as the next comes in. */
export function ArrowBadge() {
  return (
    <span aria-hidden className="btn-arrow">
      <ArrowRight />
      <ArrowRight />
    </span>
  );
}

/** The submit, as the landing hero's button: the label and the arrow badge, or a spinner while loading. */
export function AuthSubmit({
  loading,
  children,
  loadingText,
}: {
  loading: boolean;
  children: string;
  loadingText: string;
}) {
  return (
    <button type="submit" disabled={loading} className="btn btn-primary auth-button">
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {loadingText}…
        </>
      ) : (
        <>
          <span className="auth-button-label">{children}</span>
          <ArrowBadge />
        </>
      )}
    </button>
  );
}

/** A full-width link styled as the landing button, for the pages that end in one next step. */
export function AuthAction({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link href={href} className={cn("btn auth-button", variant === "primary" ? "btn-primary" : "btn-secondary")}>
      <span className="auth-button-label">{children}</span>
      <ArrowBadge />
    </Link>
  );
}

/** "Back to sign in": the landing's quiet link, its arrow in a ring. */
export function AuthBackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="landing-tour-link text-muted-foreground">
      <span aria-hidden className="tour-arrow tour-arrow-back">
        <ArrowLeft />
        <ArrowLeft />
      </span>
      <span>{children}</span>
    </Link>
  );
}

/** "don't have an account? register" under the form. */
export function AuthSwitch({ children }: { children: React.ReactNode }) {
  return <div className="text-center text-sm text-muted-foreground">{children}</div>;
}

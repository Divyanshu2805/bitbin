"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/shared/logo";

// Building blocks for the auth forms, in the homepage's language: a mono path
// pill over a display heading, fields whose label sits inside the box, and the
// app's primary button.

/** `~/sign-in` pill, a big heading with a lime accent, and one line under it. */
export function AuthHeader({
  path,
  title,
  description,
}: {
  path: string;
  title: React.ReactNode;
  description: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <p className="inline-flex items-center gap-2 rounded-full border border-lime/35 bg-lime/[0.08] px-3 py-1 font-mono text-xs text-lime">
        <span className="size-1.5 rounded-full bg-lime" aria-hidden />~/{path}
      </p>
      <h1 className="font-display text-[2rem] font-bold leading-[1.08] tracking-[-0.04em]">
        {title}
      </h1>
      <p className="text-desc leading-relaxed">{description}</p>
    </div>
  );
}

/** A lime word inside an auth heading. */
export function AuthAccent({ children }: { children: React.ReactNode }) {
  return <span className="text-brand-gradient">{children}</span>;
}

const CORNERS = ["tl", "tr", "bl", "br"] as const;

/**
 * A squared-off field with an icon and a label inside the box. The label rests
 * where the placeholder would be and lifts into a small mono caption on focus or
 * once there's a value; on focus, four corner brackets snap in around the box
 * like a viewfinder locking on (`.auth-field` in globals.css). Password fields
 * get a show/hide toggle. `aside` renders under the box, right-aligned.
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
        {CORNERS.map((corner) => (
          <span key={corner} aria-hidden className="auth-corner" data-corner={corner} />
        ))}
        <Icon
          aria-hidden
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within:text-lime"
        />
        <input
          id={id}
          type={isPassword && revealed ? "text" : type}
          placeholder=" "
          className={cn(
            "peer h-14 w-full rounded-md border border-border bg-background/60 pb-1.5 pl-10 pt-5 text-base text-foreground lg:text-sm outline-none transition-colors",
            "hover:border-foreground/20 focus:border-lime/40 focus:bg-background/80 disabled:opacity-50",
            isPassword ? "pr-11" : "pr-3.5"
          )}
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
            className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded text-muted-foreground transition-colors hover:text-foreground"
          >
            {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        ) : null}
      </div>
      {aside ? <div className="flex justify-end">{aside}</div> : null}
    </div>
  );
}

/**
 * The submit, as the app's primary `<Button>`: the BitBin logo as the prompt,
 * the label, and a blinking caret. While loading it shows a spinner instead.
 */
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
    <Button type="submit" disabled={loading} className="h-12 w-full gap-2.5 text-[15px]">
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {loadingText}…
        </>
      ) : (
        <>
          <LogoMark className="size-5" />
          {children}
          <span aria-hidden className="btn-caret ml-0 block shrink-0" />
        </>
      )}
    </Button>
  );
}

/** "don't have an account? register" under the form. */
export function AuthSwitch({ children }: { children: React.ReactNode }) {
  return <p className="text-center text-sm text-muted-foreground">{children}</p>;
}

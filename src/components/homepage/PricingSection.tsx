"use client";

import { useRef, useState } from "react";
import { Check, ChevronDown, Infinity as InfinityIcon, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInView } from "@/hooks/use-motion";
import { Accent, CtaLink, Section } from "./ui";

// Free and Pro, side by side, then a row-by-row comparison. Prices and limits
// match the app's upgrade page (components/settings/upgrade-pricing.tsx) and
// lib/usage.ts: 50 items and 3 collections on Free; $8 a month or $72 a year.

const FREE = ["50 items and 3 collections", "Snippets, prompts, commands, notes, links", "⌘K search, tags and favorites", "JSON export and import"];

const PRO = [
  "Unlimited items and collections",
  "Files and images, stored with your items",
  "AI tags, descriptions, explanations and prompt rewrites",
  "API tokens for agents and scripts",
  "The browser extension",
  "ZIP export, with your files",
];

// [feature, Free, Pro]: true/false for a tick or a dash, or text
const COMPARE: [string, boolean | string, boolean | string][] = [
  ["Items", "50", "Unlimited"],
  ["Collections", "3", "Unlimited"],
  ["Snippets, prompts, commands, notes, links", true, true],
  ["Files and images", false, true],
  ["⌘K search, tags, favorites", true, true],
  ["AI helpers", false, true],
  ["Agents and API tokens", false, true],
  ["Browser extension", false, true],
  ["JSON export and import", true, true],
  ["ZIP export with files", false, true],
];

export default function PricingSection() {
  const [yearly, setYearly] = useState(false);
  const [comparing, setComparing] = useState(false);
  const meterRef = useRef<HTMLDivElement>(null);
  const meterSeen = useInView(meterRef, { once: true, threshold: 0.6 });

  return (
    <Section
      id="pricing"
      index="02"
      label="pricing"
      align="center"
      title={
        <>
          Free to start. <Accent>Cheap to keep.</Accent>
        </>
      }
      description="Upgrade when your bin gets full. Cancel whenever you like."
    >
      {/* Billing: a pill slides under the chosen option */}
      <div
        data-reveal
        className="relative mx-auto -mt-4 mb-10 grid w-fit grid-cols-2 rounded-[10px] border border-border bg-card p-1 font-mono text-[13px]"
      >
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-md border border-lime/30 bg-lime/10 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            yearly && "translate-x-full",
          )}
        />
        {[
          { label: "Monthly", value: false },
          { label: "Yearly", value: true },
        ].map((opt) => (
          <button
            key={opt.label}
            type="button"
            aria-pressed={yearly === opt.value}
            onClick={() => setYearly(opt.value)}
            className={cn(
              "relative flex items-center justify-center gap-2 rounded-md px-5 py-2 transition-colors",
              yearly === opt.value ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
            {opt.value ? <span className="rounded bg-lime/15 px-1.5 text-[10.5px] font-bold text-lime">-25%</span> : null}
          </button>
        ))}
      </div>

      <div className="mx-auto grid max-w-4xl items-stretch gap-5 text-left md:grid-cols-2">
        {/* Free */}
        <div data-reveal className="flex flex-col rounded-2xl border border-border bg-card p-7">
          <p className="font-mono text-[12px] tracking-[0.2em] text-muted-foreground uppercase">Free</p>
          <p className="mt-4 flex items-baseline gap-1.5">
            <span className="font-display text-5xl font-extrabold tracking-tight">$0</span>
            <span className="text-muted-foreground">/month</span>
          </p>
          <p className="mt-1 h-5 text-sm text-muted-foreground">For getting your bin started.</p>

          {/* How the limit feels */}
          <div ref={meterRef} className="mt-6 rounded-lg border border-border bg-background px-3 py-2.5">
            <p className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
              Your bin
              <span>
                <span className="text-foreground">38</span> / 50 items
              </span>
            </p>
            <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full origin-left rounded-full bg-gradient-to-r from-lime to-coral transition-transform duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ transform: `scaleX(${meterSeen ? 0.76 : 0})` }}
              />
            </span>
          </div>

          <ul className="my-7 flex-1 space-y-3">
            {FREE.map((text) => (
              <li key={text} className="flex items-start gap-3 text-[15px] text-foreground/85">
                <Check className="mt-0.5 size-4 shrink-0 text-lime" strokeWidth={2.5} />
                {text}
              </li>
            ))}
          </ul>
          <CtaLink href="/register" variant="terminal" prompt className="w-full">
            Start for free
          </CtaLink>
        </div>

        {/* Pro: a light runs slowly round its border */}
        <div data-reveal style={{ "--d": "100ms" } as React.CSSProperties} className="relative overflow-hidden rounded-2xl p-px">
          <span
            aria-hidden
            className="absolute inset-[-60%] animate-spin-slow bg-[conic-gradient(from_0deg,transparent_0deg,transparent_220deg,var(--brand-lime)_300deg,var(--brand-cyan)_360deg)]"
          />
          <div className="relative flex h-full flex-col rounded-[15px] bg-card p-7">
            <div className="relative flex items-center justify-between">
              <p className="font-mono text-[12px] tracking-[0.2em] text-lime uppercase">Pro</p>
              <span className="rounded-md border border-lime/30 bg-lime/10 px-2 py-0.5 font-mono text-[10.5px] font-semibold text-lime">
                Recommended
              </span>
            </div>
            <p className="relative mt-4 flex items-baseline gap-1.5">
              <span
                key={String(yearly)}
                className="font-display text-5xl font-extrabold tracking-tight animate-[fade-up_0.35s_cubic-bezier(0.22,1,0.36,1)_both]"
              >
                {yearly ? "$6" : "$8"}
              </span>
              {yearly ? <span className="font-display text-xl text-muted-foreground/60 line-through">$8</span> : null}
              <span className="text-muted-foreground">/month</span>
            </p>
            <p className="relative mt-1 h-5 text-sm text-muted-foreground">
              {yearly ? (
                <span key="y" className="animate-fade-in">
                  Billed $72 a year · <span className="text-lime">save $24</span>
                </span>
              ) : (
                <span key="m" className="animate-fade-in">
                  For developers who keep everything.
                </span>
              )}
            </p>

            <div className="relative mt-6 flex items-center justify-between rounded-lg border border-lime/20 bg-lime/[0.04] px-3 py-2.5 font-mono text-[11px] text-muted-foreground">
              Your bin
              <span className="flex items-center gap-1.5 text-lime">
                <InfinityIcon className="size-4" /> no limits
              </span>
            </div>

            <ul className="relative my-7 flex-1 space-y-3">
              {PRO.map((text) => (
                <li key={text} className="flex items-start gap-3 text-[15px] text-foreground/90">
                  <Check className="mt-0.5 size-4 shrink-0 text-lime" strokeWidth={2.5} />
                  {text}
                </li>
              ))}
            </ul>
            <CtaLink
              href="/register"
              variant="terminal"
              prompt
              // The same button as Free's, turned up: more green, a brighter edge, a stronger glow
              className="btn-featured relative w-full"
            >
              {yearly ? "Go Pro for $72 a year" : "Go Pro for $8 a month"}
            </CtaLink>
          </div>
        </div>
      </div>

      {/* Compare, row by row, folded away behind a toggle */}
      <div className="mt-10 flex justify-center">
        <button
          type="button"
          aria-expanded={comparing}
          aria-controls="compare-plans"
          onClick={() => setComparing((v) => !v)}
          className="flex items-center gap-2 rounded-[10px] border border-border bg-card px-4 py-2 font-mono text-[13px] text-muted-foreground transition-colors hover:border-lime/40 hover:text-foreground"
        >
          {comparing ? "Hide comparison" : "Compare plans"}
          <ChevronDown className={cn("size-4 transition-transform duration-300", comparing && "rotate-180")} />
        </button>
      </div>
      <div
        id="compare-plans"
        className={cn(
          "grid transition-[grid-template-columns,grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          comparing ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="mx-auto mt-6 max-w-4xl overflow-hidden rounded-2xl border border-border bg-card/60 text-left backdrop-blur-sm">
            <div className="grid grid-cols-[minmax(0,1fr)_88px_88px] items-center border-b border-border bg-surface/60 px-5 py-3 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase sm:grid-cols-[minmax(0,1fr)_140px_140px]">
              <span>Compare plans</span>
              <span className="text-center">Free</span>
              <span className="text-center text-lime">Pro</span>
            </div>
            {COMPARE.map(([feature, free, pro]) => (
              <div
                key={feature}
                className="grid grid-cols-[minmax(0,1fr)_88px_88px] items-center border-b border-border/60 px-5 py-2.5 text-[14px] last:border-b-0 hover:bg-muted/30 sm:grid-cols-[minmax(0,1fr)_140px_140px]"
              >
                <span className="text-foreground/85">{feature}</span>
                <Cell value={free} />
                <Cell value={pro} pro />
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-6 text-center font-mono text-xs text-muted-foreground">Prices in USD · payments by Stripe · cancel any time from Settings</p>
    </Section>
  );
}

function Cell({ value, pro = false }: { value: boolean | string; pro?: boolean }) {
  if (typeof value === "string") {
    return <span className={cn("text-center font-mono text-[13px]", pro ? "text-lime" : "text-muted-foreground")}>{value}</span>;
  }
  return (
    <span className="grid place-items-center">
      {value ? (
        <Check className={cn("size-4", pro ? "text-lime" : "text-foreground/70")} strokeWidth={2.5} />
      ) : (
        <Minus className="size-4 text-muted-foreground/40" />
      )}
    </span>
  );
}

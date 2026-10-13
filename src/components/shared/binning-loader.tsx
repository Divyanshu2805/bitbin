import { useId } from "react";
import { AgentSpinner } from "@/components/shared/agent-spinner";
import { ITEM_TYPE_COLORS } from "@/lib/constants/item-types";

// One bit per type, dropped in turn (`.binning` in globals.css)
const BITS = ["snippet", "prompt", "command", "note", "image", "link"] as const;

/**
 * The loading scene: the logo's bin, large. Bits in the item types' colours tumble
 * one after another into it; the lid swings open to catch each one and snaps shut,
 * the bin squashes and squints as it lands, over a row of dots that light up in
 * step. Still under reduced motion.
 */
export function BinningLoader() {
  const gradient = useId();

  return (
    <div className="binning flex flex-col items-center gap-6" style={{ "--bits": BITS.length } as React.CSSProperties}>
      <svg viewBox="0 0 64 76" aria-hidden className="h-28 w-28 overflow-visible">
        <defs>
          <linearGradient id={gradient} x1="32" y1="22" x2="32" y2="71.7" gradientUnits="userSpaceOnUse">
            <stop offset="0" style={{ stopColor: "var(--logo-light)" }} />
            <stop offset="1" style={{ stopColor: "var(--logo-deep)" }} />
          </linearGradient>
        </defs>
        {/* lid, hinged at its left end */}
        <rect x="6" y="22" width="52" height="7" rx="3.5" className="binning__lid" fill={`url(#${gradient})`} />
        {/* the bits, drawn over the lid and before the bin, so its body hides them as they drop in */}
        {BITS.map((type, i) => (
          <rect
            key={type}
            x="28"
            y="2"
            width="8"
            height="8"
            rx="2"
            className="binning__bit"
            style={{ fill: ITEM_TYPE_COLORS[type], "--i": i } as React.CSSProperties}
          />
        ))}
        {/* the bin: body and face, as on the logo */}
        <g className="binning__bin">
          <path d="M11 33h42l-3.6 34.2a5 5 0 0 1-5 4.5H19.6a5 5 0 0 1-5-4.5L11 33Z" fill={`url(#${gradient})`} />
          <g className="binning__eyes">
            {[19.8, 36.6].map((x) => (
              <rect key={x} x={x} y="39.3" width="7.6" height="7.6" rx="1.7" style={{ fill: "var(--background)" }} />
            ))}
          </g>
          <rect x="28.2" y="50.2" width="7.6" height="7.6" rx="1.7" className="binning__mouth" style={{ fill: "var(--background)" }} />
        </g>
      </svg>

      <div className="flex flex-col items-center gap-3">
        <AgentSpinner verb={["Binning", "Stashing", "Filing"]} className="text-xs" />
        <div className="flex items-center gap-1.5" aria-hidden>
          {BITS.map((type, i) => (
            <span
              key={type}
              className="binning__dot size-1.5 rounded-full"
              style={{ backgroundColor: ITEM_TYPE_COLORS[type], "--i": i } as React.CSSProperties}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

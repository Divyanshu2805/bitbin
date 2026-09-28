import { AgentSpinner } from "@/components/shared/agent-spinner";
import { ITEM_TYPE_COLORS } from "@/lib/constants/item-types";

// One bit per type, dropped in turn (`.binning` in globals.css)
const BITS = ["snippet", "prompt", "command", "note", "image", "link"] as const;

/**
 * The loading scene: bits in the item types' colours fall one after another
 * into a big bin whose lid swings open to catch each one and snaps shut, over
 * a row of dots that light up in step. Still under reduced motion.
 */
export function BinningLoader() {
  return (
    <div className="binning flex flex-col items-center gap-6" style={{ "--bits": BITS.length } as React.CSSProperties}>
      <svg viewBox="0 0 64 76" aria-hidden className="h-28 w-28 overflow-visible drop-shadow-[0_18px_40px_color-mix(in_srgb,var(--brand-lime)_25%,transparent)]">
        {/* the bits, drawn before the bin so its body hides them as they drop in */}
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
        {/* lid, hinged at its left end */}
        <rect x="6" y="22" width="52" height="7" rx="3.5" className="binning__lid" style={{ fill: "var(--brand-lime)" }} />
        {/* body */}
        <path
          d="M11 33h42l-3.6 34.2a5 5 0 0 1-5 4.5H19.6a5 5 0 0 1-5-4.5L11 33Z"
          className="binning__body"
          style={{ fill: "var(--brand-lime)" }}
        />
        {/* slots on the body */}
        {[22, 32, 42].map((x) => (
          <rect key={x} x={x - 1.6} y="40" width="3.2" height="24" rx="1.6" style={{ fill: "var(--background)", opacity: 0.55 }} />
        ))}
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

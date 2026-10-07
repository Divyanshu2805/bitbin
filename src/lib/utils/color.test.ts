import { describe, expect, it } from "vitest";
import { readableColor, readableTint } from "./color";

function lightHalf(value: string): string {
  const match = /^light-dark\((#[0-9a-f]{6}), /.exec(value);
  if (!match) throw new Error(`not a light-dark pair: ${value}`);
  return match[1];
}

function contrastOnWhite(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 1.05 / (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05);
}

function luminanceOf(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastBetween(a: string, b: string): number {
  const [hi, lo] = [luminanceOf(a), luminanceOf(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("readableColor", () => {
  it("returns a light-dark pair for hex colours", () => {
    expect(readableColor("#3b82f6")).toMatch(/^light-dark\(#[0-9a-f]{6}, #3b82f6\)$/);
  });

  it("lifts dark colours towards white for the dark theme", () => {
    expect(readableColor("#6b7280")).toContain("color-mix(in srgb, #6b7280 55%, white)");
  });

  it("darkens bright colours until they read on white", () => {
    for (const hex of ["#fde047", "#10b981", "#ec4899", "#3b82f6", "#f97316"]) {
      expect(contrastOnWhite(lightHalf(readableColor(hex)))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("still reads on a 15% wash of its own colour, as in a type chip", () => {
    const wash = (hex: string, text: string) => {
      const n = parseInt(hex.slice(1), 16);
      const mixed = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(c * 0.15 + 255 * 0.85));
      return contrastBetween(text, "#" + mixed.map((c) => c.toString(16).padStart(2, "0")).join(""));
    };
    for (const hex of ["#fde047", "#10b981", "#ec4899", "#3b82f6", "#f97316", "#8b5cf6"]) {
      expect(wash(hex, lightHalf(readableColor(hex)))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps colours that already read on white", () => {
    expect(lightHalf(readableColor("#1e3a8a"))).toBe("#1e3a8a");
  });

  it("accepts hex without a leading #", () => {
    expect(readableColor("10b981")).toMatch(/, #10b981\)$/);
  });

  it("passes non-hex values through", () => {
    expect(readableColor("var(--brand-lime)")).toBe("var(--brand-lime)");
  });
});

describe("readableTint", () => {
  it("mixes the readable pair with transparent at the given percent", () => {
    expect(readableTint("#60a5fa", 12)).toBe(`color-mix(in srgb, ${readableColor("#60a5fa")} 12%, transparent)`);
  });

  it("passes non-hex colours through the mix", () => {
    expect(readableTint("var(--brand-lime)", 20)).toBe("color-mix(in srgb, var(--brand-lime) 20%, transparent)");
  });
});

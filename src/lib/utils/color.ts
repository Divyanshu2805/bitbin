/**
 * Item-type and collection colours are data and stay as stored, but no single
 * value reads on both themes: file's slate grey vanishes on near-black, note's
 * yellow vanishes on white. This returns a CSS `light-dark()` pair — a shade
 * darkened until it reads on the light surfaces, and one lifted towards white
 * for the dark ones — so the browser picks per theme (see `color-scheme` in
 * globals.css). Non-hex input is returned unchanged.
 */
export function readableColor(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const value = `#${hex.trim().replace(/^#/, "")}`;
  const dark = luminance(rgb) < 0.2 ? `color-mix(in srgb, ${value} 55%, white)` : value;
  return `light-dark(${toHex(darkenForLight(rgb))}, ${dark})`;
}

/**
 * A type colour at `percent` opacity, for tinted fills, borders and rings:
 * `readableColor` mixed with transparent, so it follows the theme too.
 */
export function readableTint(hex: string, percent: number): string {
  return `color-mix(in srgb, ${readableColor(hex)} ${percent}%, transparent)`;
}

type Rgb = [number, number, number];

// Contrast of 4.5:1 against white needs a relative luminance of at most ~0.183.
const LIGHT_MAX_LUMINANCE = 0.18;

function parseHex(hex: string): Rgb | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const n = parseInt(match[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance([r, g, b]: Rgb): number {
  const [lr, lg, lb] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/** Mixes towards black in small steps until the colour reads on white. */
function darkenForLight(rgb: Rgb): Rgb {
  let current = rgb;
  for (let keep = 1; keep > 0.3 && luminance(current) > LIGHT_MAX_LUMINANCE; keep -= 0.04) {
    current = rgb.map((c) => Math.round(c * keep)) as Rgb;
  }
  return current;
}

function toHex(rgb: Rgb): string {
  return `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

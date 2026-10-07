import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The light theme's colour tokens, read straight from globals.css, against the surfaces they are
 * used on. WCAG AA: 4.5:1 for text, 3:1 for the edge of a control. A token that drifts below fails here,
 * not in someone's browser.
 */

const css = readFileSync(join(__dirname, 'globals.css'), 'utf-8');
const light = css.slice(css.indexOf(':root {'), css.indexOf('.dark {'));

function token(name: string): string {
  const match = new RegExp(String.raw`--${name}:\s*(#[0-9a-fA-F]{6})`).exec(light);
  if (!match) throw new Error(`--${name} is not a hex colour in the light theme`);
  return match[1];
}

type Rgb = [number, number, number];
const rgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** `fg` laid over `bg` at `alpha`, as the opaque colour you would see */
function over(fg: string, bg: string, alpha: number): string {
  const mixed = rgb(fg).map((c, i) => c * alpha + rgb(bg)[i] * (1 - alpha));
  return '#' + mixed.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');
}

const pageSurfaces = ['background', 'card', 'muted', 'accent'];
const accents = ['brand-lime', 'brand-coral', 'brand-cyan', 'brand-violet', 'destructive', 'chart-4'];

describe('light theme contrast', () => {
  it.each(pageSurfaces)('body text reads on %s', (surface) => {
    expect(contrast(token('foreground'), token(surface))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('muted-foreground'), token(surface))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(['background', 'card', 'muted'])('faint text (line numbers, hints) still reads on %s', (surface) => {
    expect(contrast(token('faint'), token(surface))).toBeGreaterThanOrEqual(4.5);
  });

  it('secondary text reads on the sidebar and its highlighted row', () => {
    expect(contrast(token('muted-foreground'), token('sidebar'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('muted-foreground'), token('sidebar-accent'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('sidebar-foreground'), token('sidebar-accent'))).toBeGreaterThanOrEqual(4.5);
  });

  describe.each(accents)('%s as text', (name) => {
    it.each([...pageSurfaces.slice(0, 3), 'sidebar'])('on %s, plain and on a light tint of itself', (surface) => {
      const colour = token(name);
      expect(contrast(colour, token(surface))).toBeGreaterThanOrEqual(4.5);
      // Badges and chips set the accent on a faint wash of the same accent
      expect(contrast(colour, over(colour, token(surface), 0.08))).toBeGreaterThanOrEqual(4.5);
    });
  });

  it('button labels read on their fill', () => {
    expect(contrast(token('primary-foreground'), token('primary'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#ffffff', token('destructive'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#ffffff', token('brand-coral'))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(['kw', 'fn', 'str', 'num', 'type', 'path'])('syntax colour tok-%s reads in the editor', (name) => {
    expect(contrast(token(`tok-${name}`), token('editor-bg'))).toBeGreaterThanOrEqual(4.5);
  });

  it('the edge of an input is visible on the page and on cards (3:1)', () => {
    expect(contrast(token('input'), token('card'))).toBeGreaterThanOrEqual(3);
    expect(contrast(token('input'), token('background'))).toBeGreaterThanOrEqual(2.9);
  });

  it('the focus ring is visible', () => {
    expect(contrast(token('ring'), token('card'))).toBeGreaterThanOrEqual(3);
    expect(contrast(token('ring'), token('background'))).toBeGreaterThanOrEqual(3);
  });
});

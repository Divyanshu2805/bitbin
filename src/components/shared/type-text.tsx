import { Children, isValidElement } from "react";

/** How many characters a node renders, so the typing takes one step per character. */
function textLength(node: React.ReactNode): number {
  if (typeof node === "string" || typeof node === "number") return String(node).length;
  if (Array.isArray(node)) return node.reduce<number>((sum, child) => sum + textLength(child), 0);
  if (isValidElement<{ children?: React.ReactNode }>(node)) {
    return Children.toArray(node.props.children).reduce<number>((sum, child) => sum + textLength(child), 0);
  }
  return 0;
}

/**
 * Types its content in, one character per step, behind a lime caret that blinks
 * a few times and fades (`.type-text` in globals.css). Works for mixed content
 * (a gradient name in the dashboard's title) because it reveals the rendered
 * line rather than rewriting the text; the display face is monospaced, so each
 * step is one character. Screen readers get the text at once.
 */
export function TypeText({ children }: { children: React.ReactNode }) {
  const chars = Math.max(textLength(children), 1);
  return (
    <span className="type-text" style={{ "--chars": chars } as React.CSSProperties}>
      <span className="type-text__line">{children}</span>
      <span aria-hidden className="type-text__caret" />
    </span>
  );
}

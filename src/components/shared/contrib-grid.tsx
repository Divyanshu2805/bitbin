import { cn } from "@/lib/utils";

// A GitHub contribution graph to sit behind a button's label: square cells at
// deterministic "activity" levels (0–4), laid out in columns. Idle, the edges
// show dimly and a few cells "commit" now and then; on hover (`.gh-button:hover`)
// a wave lights every cell, left to right. Styles: `.gh-grid` in globals.css.
// The grid is wider than any button and clipped, so cells stay square at any size.

const COLS = 64;

function makeCells(rows: number) {
  return Array.from({ length: rows * COLS }, (_, i) => {
    const hash = Math.imul(i + 1, 2654435761) >>> 0;
    const level = hash % 7 < 3 ? 0 : (hash % 4) + 1;
    return { level, col: Math.floor(i / rows), commit: hash % 11 === 0, delay: (hash % 60) / 10 };
  });
}

const CELLS: Record<number, ReturnType<typeof makeCells>> = {
  2: makeCells(2),
  3: makeCells(3),
  4: makeCells(4),
  5: makeCells(5),
};

export function ContribGrid({ rows = 4, className }: { rows?: 2 | 3 | 4 | 5; className?: string }) {
  return (
    <span aria-hidden className={cn("gh-grid", className)} style={{ "--rows": rows } as React.CSSProperties}>
      {CELLS[rows].map((cell, i) => (
        <span
          key={i}
          data-level={cell.level}
          data-commit={cell.commit || undefined}
          style={{ "--c": cell.col, "--d": `${cell.delay}s` } as React.CSSProperties}
        />
      ))}
    </span>
  );
}

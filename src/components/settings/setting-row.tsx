import { cn } from "@/lib/utils";

interface SettingRowProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Red title, for the row that deletes something */
  danger?: boolean;
  /** The control: a button or two, on the right from sm up */
  children: React.ReactNode;
}

/**
 * One line of a settings card: what it is on the left, its control on the
 * right, ruled off from the next. Wrap a run of them in `<SettingRows>`.
 */
export function SettingRow({ title, description, danger, children }: SettingRowProps) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <h3 className={cn("text-sm font-medium", danger && "text-destructive")}>{title}</h3>
        {description && <p className="text-desc mt-0.5 text-sm">{description}</p>}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

/** A run of rows with hairlines between them, flush with the card's padding. */
export function SettingRows({ children }: { children: React.ReactNode }) {
  return <div className="-my-4 divide-y divide-[color-mix(in_srgb,var(--border)_60%,var(--card))]">{children}</div>;
}

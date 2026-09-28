import { LogoMark } from "@/components/shared/logo";

interface EmptyStateProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

/** Placeholder for lists with nothing in them yet: the bin, a title and what to do next. */
export default function EmptyState({ title, description, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-border bg-card/40 px-6 py-12 text-center animate-fade-up">
      <LogoMark animated className="mb-4 h-10 w-10 animate-float opacity-90" />
      <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
      {description && <p className="text-desc mt-1.5 max-w-sm text-[15px] leading-relaxed">{description}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

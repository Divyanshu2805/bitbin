import { LogoMark } from "@/components/shared/logo";

interface EmptyStateProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

/** Friendly placeholder for lists with nothing in them yet */
export default function EmptyState({ title, description, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-14 text-center animate-fade-up">
      <div className="mb-5 animate-float">
        <LogoMark animated className="h-10 w-10 opacity-80" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

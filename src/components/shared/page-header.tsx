interface PageHeaderProps {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  count?: number;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

/** Standard heading block for app pages (eyebrow, title, optional count/actions) */
export default function PageHeader({ eyebrow, title, description, count, icon, children }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 animate-fade-up">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-lime">{eyebrow}</p>
        <div className="mt-2 flex items-center gap-3">
          {icon}
          <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          {count !== undefined && (
            <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
              {count}
            </span>
          )}
        </div>
        {description && <p className="mt-1 text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

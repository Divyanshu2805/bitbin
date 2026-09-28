'use client';

import { useEffect } from 'react';
import { ResultLine, ToolLine } from '@/components/shared/agent-spinner';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/** A failed load, reported like a command that exited non-zero, with a retry. */
export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-lift)] animate-fade-up">
        <div className="flex h-10 items-center gap-2 border-b border-border bg-surface px-4">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
          <span className="ml-3 font-mono text-xs text-muted-foreground">~/bin/dashboard</span>
        </div>
        <div className="space-y-2 p-5">
          <p className="font-mono text-[13px]">
            <span className="text-lime">$</span> bitbin open dashboard
          </p>
          <ToolLine name="Load" args="dashboard" state="error" />
          <ResultLine>
            <span className="text-destructive">Something went wrong</span> while loading your bin. Nothing was lost.
          </ResultLine>
          {error.digest && <ResultLine>ref {error.digest}</ResultLine>}
          <div className="pt-4">
            <Button onClick={reset} className="font-mono">
              <RefreshCw className="h-4 w-4" />
              retry
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="max-w-6xl mx-auto flex min-h-[50vh] items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center animate-fade-up">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-destructive/30 bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="mt-5 text-lg font-semibold text-foreground">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We hit an error while loading your dashboard. Give it another go.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-[11px] text-muted-foreground/60">
            ref: {error.digest}
          </p>
        )}
        <Button onClick={reset} className="mt-6 gap-2">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    </div>
  );
}

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LogoMark } from '@/components/shared/logo';

export default function NotFound() {
  return (
    <main className="noise relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="bg-grid mask-radial absolute inset-0" aria-hidden />
      <div className="relative animate-fade-up">
        <div className="mx-auto mb-8 w-fit animate-float">
          <LogoMark animated className="h-16 w-16" />
        </div>
        <p className="font-mono text-sm text-coral">404 · not in the bin</p>
        <h1 className="mt-3 text-4xl font-bold sm:text-5xl">This page got thrown out.</h1>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground">
          The link might be broken, or the page may have moved. Let&apos;s get you back
          to something useful.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

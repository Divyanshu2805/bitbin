import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { AUTH_LIGHT_STRENGTH, AUTH_LIGHT_STRENGTH_LIGHT, AuthFormBackdrop } from "@/components/auth/auth-form-backdrop";
import { AuthTagline } from "@/components/auth/auth-tagline";
import LandingBackdrop from "@/components/homepage/LandingBackdrop";
import { BRAND_SURFACE } from "@/components/homepage/brand-surface";
import { TransitionLink } from "@/components/shared/transition-link";
import { cn } from "@/lib/utils";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-page grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel: the homepage's falling bits and pointer light. Follows the theme, like the homepage */}
      <aside
        className={cn(
          "relative isolate hidden flex-col justify-between overflow-hidden border-r border-border bg-background p-10 text-foreground lg:flex",
          BRAND_SURFACE
        )}
      >
        <LandingBackdrop contained glow={1} darkGlow={0.65} lightStrength={AUTH_LIGHT_STRENGTH_LIGHT} darkLightStrength={AUTH_LIGHT_STRENGTH} />

        <p className="text-center font-mono text-xs text-muted-foreground">~/bitbin</p>

        <div className="mx-auto flex max-w-md flex-col items-center space-y-6 text-center">
          <Link href="/" className="block w-fit">
            <Logo
              animated
              className="gap-4 [&>svg]:h-14 [&>svg]:w-14"
              wordmarkClassName="text-5xl"
            />
          </Link>

          <AuthTagline />

          <p className="text-muted-foreground">
            Snippets, prompts, commands, notes and links — saved once, tagged
            by AI, found with ⌘K.
          </p>
        </div>

        {/* keeps the brand block centred under justify-between */}
        <span aria-hidden />
      </aside>

      {/* Form panel */}
      <main className="relative isolate flex min-h-screen flex-col overflow-hidden bg-card [&_[data-slot=card]]:border-0 [&_[data-slot=card]]:bg-transparent [&_[data-slot=card]]:shadow-none">
        <AuthFormBackdrop />

        <div className="flex items-center justify-between p-6">
          <Link href="/" className="lg:invisible">
            <Logo />
          </Link>
          <TransitionLink
            href="/"
            back
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-lime"
          >
            <ArrowLeft className="h-4 w-4" />
            Back home
          </TransitionLink>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 pb-16">
          {children}
        </div>
      </main>
    </div>
  );
}

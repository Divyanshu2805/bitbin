import { Suspense } from "react";
import { SignInForm } from "@/components/auth/sign-in-form";
import { AuthFallback } from "@/components/auth/auth-fallback";

export const metadata = {
  title: "Sign in",
  description: "Sign in to your BitBin account",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ via?: string }> }) {
  // Back from GitHub the page is only pictured while it slides to the dashboard: no fade-in
  const { via } = await searchParams;
  return (
    <div className={via === "github" ? "w-full max-w-md" : "w-full max-w-md animate-fade-up"}>
      <Suspense fallback={<AuthFallback />}>
        <SignInForm />
      </Suspense>
    </div>
  );
}

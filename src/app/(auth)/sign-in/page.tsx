import { Suspense } from "react";
import { SignInForm } from "@/components/auth/sign-in-form";
import { AuthFallback } from "@/components/auth/auth-fallback";

export const metadata = {
  title: "Sign in",
  description: "Sign in to your BitBin account",
};

export default function SignInPage() {
  return (
    <div className="w-full max-w-md animate-fade-up">
      <Suspense fallback={<AuthFallback />}>
        <SignInForm />
      </Suspense>
    </div>
  );
}

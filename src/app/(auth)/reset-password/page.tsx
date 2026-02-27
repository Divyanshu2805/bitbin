import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { AuthFallback } from "@/components/auth/auth-fallback";

export const metadata = {
  title: "Reset password",
  description: "Set a new password for your BitBin account",
};

export default function ResetPasswordPage() {
  return (
    <div className="w-full max-w-md animate-fade-up">
      <Suspense fallback={<AuthFallback />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}

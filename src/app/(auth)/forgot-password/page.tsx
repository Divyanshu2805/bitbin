import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata = {
  title: "Forgot password",
  description: "Reset your BitBin password",
};

export default function ForgotPasswordPage() {
  return (
    <div className="w-full max-w-md animate-fade-up">
      <ForgotPasswordForm />
    </div>
  );
}

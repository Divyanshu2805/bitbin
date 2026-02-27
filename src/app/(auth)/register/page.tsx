import { RegisterForm } from "@/components/auth/register-form";

export const metadata = {
  title: "Create account",
  description: "Create your BitBin account",
};

export default function RegisterPage() {
  return (
    <div className="w-full max-w-md animate-fade-up">
      <RegisterForm />
    </div>
  );
}

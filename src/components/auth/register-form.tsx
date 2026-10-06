"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, Lock, Mail, User } from "lucide-react";
import { AuthAccent, AuthField, AuthHeader, AuthSubmit, AuthSwitch } from "@/components/auth/auth-ui";
import FormError from "@/components/shared/form-error";
import GitHubAuthSection from "@/components/shared/github-auth-section";
import { TURNSTILE_ENABLED, TurnstileWidget } from "@/components/auth/turnstile-widget";

export function RegisterForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReset, setTurnstileReset] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setIsLoading(false);
      return;
    }

    if (TURNSTILE_ENABLED && !turnstileToken) {
      setError("Please complete the verification check");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, confirmPassword, turnstileToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Registration failed");
        setIsLoading(false);
        setTurnstileReset((n) => n + 1); // a token works once
        return;
      }

      router.push("/verify-email");
    } catch {
      setError("An unexpected error occurred");
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full space-y-7">
      <AuthHeader
        path="register"
        title={<>Start your <AuthAccent>bin.</AuthAccent></>}
        description="Free for your first 50 items. No card needed."
      />

      <div className="space-y-5">
        <FormError message={error} />

        <GitHubAuthSection />

        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthField
            id="name"
            label="Name"
            icon={User}
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
          />
          <AuthField
            id="email"
            label="Email"
            icon={Mail}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <AuthField
              id="password"
              label="Password"
              icon={Lock}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
            <AuthField
              id="confirmPassword"
              label="Confirm"
              icon={KeyRound}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <TurnstileWidget onToken={setTurnstileToken} resetKey={turnstileReset} />
          <div className="pt-1">
            <AuthSubmit loading={isLoading} loadingText="Creating account">
              Create account
            </AuthSubmit>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            By creating an account you agree to the{" "}
            <Link href="/terms" className="underline hover:text-lime">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-lime">
              Privacy Policy
            </Link>.
          </p>
        </form>
      </div>

      <AuthSwitch>
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-lime hover:underline">
          Sign in
        </Link>
      </AuthSwitch>
    </div>
  );
}

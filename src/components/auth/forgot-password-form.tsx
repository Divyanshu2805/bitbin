"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { AuthAccent, AuthField, AuthHeader, AuthSubmit, AuthSwitch } from "@/components/auth/auth-ui";
import FormError from "@/components/shared/form-error";

function BackToSignIn() {
  return (
    <AuthSwitch>
      <Link
        href="/sign-in"
        className="inline-flex items-center gap-1.5 transition-colors hover:text-lime"
      >
        <ArrowLeft className="size-4" />
        Back to sign in
      </Link>
    </AuthSwitch>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Something went wrong");
        setIsLoading(false);
        return;
      }

      setIsSubmitted(true);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="w-full space-y-7">
        <AuthHeader
          path="forgot-password"
          title={<>Check your <AuthAccent>inbox.</AuthAccent></>}
          description={
            <>
              If an account exists for{" "}
              <span className="font-medium text-foreground">{email}</span>,
              a reset link is on its way. It expires in 1 hour — check spam if
              it doesn&apos;t show up.
            </>
          }
        />
        <button
          type="button"
          onClick={() => {
            setIsSubmitted(false);
            setEmail("");
          }}
          className="btn btn-secondary h-12 w-full rounded-md text-sm"
        >
          Try a different email
        </button>
        <BackToSignIn />
      </div>
    );
  }

  return (
    <div className="w-full space-y-7">
      <AuthHeader
        path="forgot-password"
        title={<>Forgot your <AuthAccent>password?</AuthAccent></>}
        description="Enter your email and we'll send you a link to set a new one."
      />

      <div className="space-y-5">
        <FormError message={error} />

        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="pt-1">
            <AuthSubmit loading={isLoading} loadingText="Sending link">
              Send reset link
            </AuthSubmit>
          </div>
        </form>
      </div>

      <BackToSignIn />
    </div>
  );
}

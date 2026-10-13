"use client";

import { useState, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { AuthAccent, AuthField, AuthHeader, AuthSubmit, AuthSwitch } from "@/components/auth/auth-ui";
import FormError from "@/components/shared/form-error";
import GitHubAuthSection from "@/components/shared/github-auth-section";
import { slideTo } from "@/lib/view-transition";
import { safeCallbackPath } from "@/lib/validation";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackPath(searchParams.get("callbackUrl"));
  const error = searchParams.get("error");
  const registered = searchParams.get("registered");

  const [email, setEmail] = useState("");
  const toastShown = useRef(false);

  useEffect(() => {
    if (registered === "true" && !toastShown.current) {
      toastShown.current = true;
      toast.success("Account created successfully! You can now sign in.");
      router.replace("/sign-in", { scroll: false });
    }
  }, [registered, router]);

  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setFormError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      if (result.code === "rate_limited") {
        setFormError("Too many sign-in attempts. Please try again in a few minutes.");
        setNeedsVerification(false);
      } else if (result.code === "credentials" && result.error.includes("EmailNotVerified")) {
        setFormError("Please verify your email before signing in.");
        setNeedsVerification(true);
      } else {
        setFormError("Invalid email or password");
        setNeedsVerification(false);
      }
      setIsLoading(false);
    } else {
      slideTo(() => router.push(callbackUrl), callbackUrl);
    }
  }

  async function handleResendVerification() {
    if (!email) {
      toast.error("Please enter your email address first");
      return;
    }
    setIsResending(true);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message);
      } else {
        toast.error(data.error || "Failed to resend verification email");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="w-full space-y-7">
      <AuthHeader
        title={<>Welcome <AuthAccent>back.</AuthAccent></>}
        description="Your snippets, prompts and commands are right where you left them."
      />

      <div className="space-y-5">
        <FormError
          message={
            formError ||
            (error === "OAuthAccountNotLinked"
              ? "This email is already registered with a password. Please sign in with your email and password instead."
              : error
                ? "An error occurred. Please try again."
                : null)
          }
        >
          {needsVerification && (
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={isResending}
              className="brand-link mt-2 disabled:opacity-50"
            >
              {isResending ? "Sending..." : "Resend verification email"}
            </button>
          )}
        </FormError>

        <GitHubAuthSection />

        <form onSubmit={handleCredentialsSubmit} className="space-y-4">
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
          <AuthField
            id="password"
            label="Password"
            icon={Lock}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            aside={
              <Link href="/forgot-password" className="brand-link brand-link-quiet text-xs">
                Forgot password?
              </Link>
            }
          />
          <div className="pt-1">
            <AuthSubmit loading={isLoading} loadingText="Signing in">
              Sign in
            </AuthSubmit>
          </div>
        </form>
      </div>

      <AuthSwitch>
        New to BitBin?{" "}
        <Link href="/register" className="brand-link">
          Create an account
        </Link>
      </AuthSwitch>
    </div>
  );
}

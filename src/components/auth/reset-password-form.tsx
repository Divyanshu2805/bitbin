"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, KeyRound, Lock } from "lucide-react";
import { CtaLink } from "@/components/homepage/ui";
import { AuthAccent, AuthField, AuthHeader, AuthSubmit, AuthSwitch } from "@/components/auth/auth-ui";

type ResetStatus = "form" | "loading" | "success" | "error" | "no-token";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<ResetStatus>(token ? "form" : "no-token");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      setStatus("error");
      return;
    }

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters");
      setStatus("error");
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(data.message);
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to reset password");
      }
    } catch {
      setStatus("error");
      setMessage("An unexpected error occurred");
    }
  }

  if (status === "no-token") {
    return (
      <div className="w-full space-y-7">
        <AuthHeader
          path="reset-password"
          title={<>This link <AuthAccent>expired.</AuthAccent></>}
          description="This password reset link is invalid or has already been used."
        />
        <CtaLink href="/forgot-password" variant="terminal" prompt className="h-12 w-full rounded-md">
          request a new link
        </CtaLink>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="w-full space-y-7">
        <AuthHeader
          path="reset-password"
          title={<>Password <AuthAccent>updated.</AuthAccent></>}
          description={message}
        />
        <CtaLink href="/sign-in" variant="terminal" prompt className="h-12 w-full rounded-md">
          sign in
        </CtaLink>
      </div>
    );
  }

  const loading = status === "loading";

  return (
    <div className="w-full space-y-7">
      <AuthHeader
        path="reset-password"
        title={<>Set a new <AuthAccent>password.</AuthAccent></>}
        description="At least 8 characters. You'll use it to sign in from now on."
      />

      <div className="space-y-5">
        {status === "error" && message && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {message}
            {message.includes("expired") && (
              <Link
                href="/forgot-password"
                className="mt-2 block text-primary hover:underline"
              >
                Request a new reset link
              </Link>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthField
            id="password"
            label="New password"
            icon={Lock}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            disabled={loading}
          />
          <AuthField
            id="confirmPassword"
            label="Confirm new password"
            icon={KeyRound}
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            disabled={loading}
          />
          <div className="pt-1">
            <AuthSubmit loading={loading} loadingText="Updating password">
              Reset password
            </AuthSubmit>
          </div>
        </form>
      </div>

      <AuthSwitch>
        <Link
          href="/sign-in"
          className="inline-flex items-center gap-1.5 transition-colors hover:text-lime"
        >
          <ArrowLeft className="size-4" />
          Back to sign in
        </Link>
      </AuthSwitch>
    </div>
  );
}

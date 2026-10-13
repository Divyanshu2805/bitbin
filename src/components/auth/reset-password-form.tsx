"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { KeyRound, Lock } from "lucide-react";
import { AuthAccent, AuthAction, AuthBackLink, AuthField, AuthHeader, AuthSubmit, AuthSwitch } from "@/components/auth/auth-ui";

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
          title={<>This link <AuthAccent>expired.</AuthAccent></>}
          description="This password reset link is invalid or has already been used."
        />
        <AuthAction href="/forgot-password">Request a new link</AuthAction>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="w-full space-y-7">
        <AuthHeader
          title={<>Password <AuthAccent>updated.</AuthAccent></>}
          description={message}
        />
        <AuthAction href="/sign-in">Sign in</AuthAction>
      </div>
    );
  }

  const loading = status === "loading";

  return (
    <div className="w-full space-y-7">
      <AuthHeader
        title={<>Set a new <AuthAccent>password.</AuthAccent></>}
        description="At least 8 characters. You'll use it to sign in from now on."
      />

      <div className="space-y-5">
        {status === "error" && message && (
          <div role="alert" className="rounded-[10px] border border-destructive/20 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
            {message}
            {message.includes("expired") && (
              <Link href="/forgot-password" className="brand-link mt-2 inline-block">
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
        <AuthBackLink href="/sign-in">Back to sign in</AuthBackLink>
      </AuthSwitch>
    </div>
  );
}

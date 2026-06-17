"use client";

import React, { useState, useEffect } from "react";
import { message } from "antd";
import { Mail, Loader2, ArrowLeft, KeyRound, CheckCircle2 } from "lucide-react";
import { authApi } from "@/api/auth.api";
import { getLogoForApp, getForcedMode } from "@/lib/getLogo";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import AuthShell from "@/components/auth/AuthShell";
import DesktopAuthShell from "@/components/auth/DesktopAuthShell";
import PillInput from "@/components/auth/PillInput";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [logoSrc, setLogoSrc] = useState("/images/image.png");

  // Full logo — Pro vs standard by app context.
  useEffect(() => {
    const appParam = new URLSearchParams(window.location.search).get("app");
    const mode =
      appParam === "pro"
        ? "pro"
        : appParam === "team"
          ? "team"
          : getForcedMode();
    setLogoSrc(getLogoForApp(mode));
  }, []);

  const isDesktop = useIsDesktop();
  const Shell = isDesktop ? DesktopAuthShell : AuthShell;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message || "Failed to send reset email";
      message.error(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell
      logoSrc={logoSrc}
      title="Forgot password?"
      subtitle="We'll email you a link to reset it"
      footer={
        <p className="text-center text-sm">
          <a
            href="/login"
            className="inline-flex items-center gap-1.5 font-bold text-primary-deep"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </a>
        </p>
      }
    >
      {sent ? (
        <div className="flex flex-col items-center py-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F0FDF4]">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-foreground">
            Check your email
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            If an account exists for{" "}
            <span className="font-semibold text-foreground">{email}</span>,
            we&apos;ve sent a password reset link.
          </p>
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setEmail("");
            }}
            className="mt-5 appearance-none border-0 bg-transparent text-[13px] font-semibold text-primary-deep"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <>
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F0FDF4]">
              <KeyRound className="h-6 w-6 text-primary" />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2.5">
              <svg
                className="h-4 w-4 shrink-0 text-[#EF4444]"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-[13px] text-[#DC2626]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[13px] font-bold text-foreground">
                Email address
              </label>
              <PillInput
                icon={Mail}
                error={!!error}
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                placeholder="you@example.com"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-primary to-primary-deep text-[15px] font-bold text-white shadow-[var(--shadow-fab)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:from-[#A0D4BA] disabled:to-[#A0D4BA] disabled:shadow-none"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </button>
          </form>
        </>
      )}
    </Shell>
  );
}

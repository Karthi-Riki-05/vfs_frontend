"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Mail, Loader2, ArrowLeft, KeyRound, CheckCircle2 } from "lucide-react";
import { authApi } from "@/api/auth.api";
import { getLogoForApp } from "@/lib/getLogo";
import { useAppBrand } from "@/hooks/useAppBrand";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import AuthShell from "@/components/auth/AuthShell";
import DesktopAuthShell from "@/components/auth/DesktopAuthShell";
import PillInput from "@/components/auth/PillInput";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  // Validation messages are delivered by TOAST ONLY (2026-08-21) — the error
  // banner used to repeat the same sentence the toast already showed. This flag
  // is all that remains: it drives the field's red BORDER, not a message.
  const [invalid, setInvalid] = useState(false);

  // Full logo follows the app SHELL (WebView UA), read post-mount via the
  // hydration-safe useAppBrand hook (UA wins over ?app= / stored). Web visitors
  // (brand="web") keep the standard logo.
  const brand = useAppBrand();
  const logoSrc = getLogoForApp(brand === "web" ? null : brand);

  const isDesktop = useIsDesktop();
  const Shell = isDesktop ? DesktopAuthShell : AuthShell;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email");
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message || "Failed to send reset email";
      toast.error(msg);
      setInvalid(true);
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              {/* sr-only, not deleted: a placeholder is not an accessible name
                  (it vanishes on type and is unreliable for screen readers). */}
              <label htmlFor="forgot-email" className="sr-only">
                Email address
              </label>
              <PillInput
                id="forgot-email"
                icon={Mail}
                error={invalid}
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (invalid) setInvalid(false);
                }}
                placeholder="Email"
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

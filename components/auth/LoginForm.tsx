"use client";

import React, { useEffect, useState } from "react";
import { message } from "antd";
import { signIn, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { getLogoForApp } from "@/lib/getLogo";
import { useAppBrand } from "@/hooks/useAppBrand";
import { getPostLoginDashboardUrl } from "@/lib/postLoginRedirect";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import AuthShell from "./AuthShell";
import DesktopAuthShell from "./DesktopAuthShell";
import PillInput from "./PillInput";
import { SocialRow, OrDivider } from "./AuthSocial";

function detectWebView(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    // Android in-app WebView flag
    /\bwv\b/.test(ua) ||
    // Social / messaging in-app browsers
    /FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|Twitter|Snapchat|TikTok|BytedanceWebview/.test(
      ua,
    ) ||
    // iOS in-app browsers: have AppleWebKit but NOT "Safari"
    (/iPhone|iPad|iPod/.test(ua) &&
      /AppleWebKit/.test(ua) &&
      !/Safari/.test(ua)) ||
    // Generic WebView strings
    /WebView|webview/.test(ua)
  );
}

export default function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [fieldErr, setFieldErr] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [info, setInfo] = useState("");
  const [showResend, setShowResend] = useState(false);
  const [isWebView, setIsWebView] = useState(false);
  const [pageUrl, setPageUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const verified = searchParams?.get("verified") ?? null;
  const isDesktop = useIsDesktop();

  // Full logo for the hero follows the app SHELL (WebView UA), read post-mount
  // via the hydration-safe useAppBrand hook (UA wins over ?app= / stored). On a
  // genuine web visitor (brand="web") we keep the standard logo — there is no
  // billing context to consult pre-login. This fixes the wrong-shell logo flash
  // when a Pro/Team app opens /login with no seeded sessionStorage.
  const brand = useAppBrand();
  const logoSrc = getLogoForApp(brand === "web" ? null : brand);

  useEffect(() => {
    if (verified === "1") setInfo("Your email is verified. Please log in.");
  }, [verified]);

  // Pre-fill email when redirected from registration duplicate-account flow
  useEffect(() => {
    const emailParam = searchParams?.get("email");
    if (emailParam) setEmail(decodeURIComponent(emailParam));
  }, [searchParams]);

  useEffect(() => {
    setIsWebView(detectWebView());
    setPageUrl(window.location.href);
  }, []);

  const handleVerifyRedirect = () => {
    if (!email.trim()) {
      setError("Enter your email first to receive a verification code.");
      return;
    }
    router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
  };

  // Per-field validation — far more visible on mobile / WebView than a single
  // toast or a banner that scrolls off-screen. Errors render right at the field.
  const validate = () => {
    const errs: { email?: string; password?: string } = {};
    const e = email.trim();
    if (!e) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
      errs.email = "Enter a valid email address";
    // Login only checks presence — never enforce length/policy here or legacy
    // users with shorter passwords get locked out. Policy lives on registration.
    if (!password) errs.password = "Password is required";
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setFieldErr(errs);
    if (Object.keys(errs).length) {
      setError("");
      // Surface the first error as a toast too — belt-and-suspenders for WebView
      message.error(errs.email || errs.password);
      return;
    }
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
      // Desktop honors the checkbox; mobile has no checkbox and defaults to a
      // persistent 30-day session.
      remember: String(rememberMe || !isDesktop),
    });

    setLoading(false);

    if (result?.error) {
      const raw = result.error || "";
      // Map raw backend/NextAuth error strings to user-friendly copy. The
      // verify-email case keeps its existing OTP-resend flow.
      let friendly: string;
      if (/verify|verified/i.test(raw)) {
        friendly = raw; // keep the backend's verify-email wording for the OTP flow
        setShowResend(true);
      } else if (/credential|invalid/i.test(raw)) {
        friendly = "Invalid email or password. Please try again.";
      } else if (/inactive|suspend/i.test(raw)) {
        friendly = "This account is inactive. Please contact support.";
      } else {
        friendly = "Login failed. Please try again.";
      }
      message.error(friendly);
      setError(friendly);
    } else {
      // Block super admins from using the user login page — they must log
      // in via /super-admin/login so the admin portal is a distinct entry.
      try {
        const res = await fetch("/api/auth/session");
        const sess = await res.json();
        const role = sess?.user?.role;
        if (role === "super_admin") {
          try {
            sessionStorage.removeItem("vc_app_context");
          } catch {
            // sessionStorage may be blocked
          }
          await signOut({ redirect: false });
          setError("Super admin accounts must log in at /super-admin/login.");
          message.error("Redirecting to the admin portal…");
          setTimeout(() => router.push("/super-admin/login"), 1500);
          return;
        }
        message.success("Logged in successfully!");
        window.location.href = getPostLoginDashboardUrl();
      } catch {
        window.location.href = getPostLoginDashboardUrl();
      }
    }
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(pageUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const socialLogin = (provider: "google" | "linkedin" | "facebook") =>
    signIn(provider, { callbackUrl: getPostLoginDashboardUrl() });

  const Shell = isDesktop ? DesktopAuthShell : AuthShell;
  const desktopTitle = isDesktop ? "Holla, Welcome Back" : "Welcome back";
  const desktopSubtitle = isDesktop
    ? "Hey, welcome back to your special place"
    : "Sign in to your account to continue";

  // Shared status banners — identical on mobile and desktop.
  const banners = (
    <>
      {/* WebView banner — Google blocks OAuth in in-app browsers */}
      {isWebView && (
        <div className="rounded-xl border border-[#FED7AA] bg-[#FFF7ED] p-4">
          <div className="mb-2.5 flex items-start gap-2.5">
            <span className="shrink-0 text-lg">⚠️</span>
            <div>
              <p className="mb-1 text-[13px] font-semibold text-[#92400E]">
                Google sign-in blocked in this browser
              </p>
              <p className="text-xs text-[#B45309]">
                You&apos;re in an in-app browser. Open the link below in Chrome
                or Safari to continue.
              </p>
            </div>
          </div>
          <div className="mb-2 break-all rounded-lg bg-[#FEF3C7] px-3 py-2 font-mono text-[11px] text-[#78350F]">
            {pageUrl}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className={`h-9 w-full rounded-lg text-[13px] font-semibold text-white transition-colors ${
              copied ? "bg-primary" : "bg-[#F59E0B]"
            }`}
          >
            {copied ? "✓ Copied!" : "Copy link — open in Chrome / Safari"}
          </button>
        </div>
      )}

      {/* Info banner */}
      {info && (
        <div className="flex items-start gap-2 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2.5">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0 text-primary"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 10-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-[13px] text-[#15803D]">{info}</p>
        </div>
      )}

      {/* Error banner */}
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
    </>
  );

  // ── Desktop form (matches new_design split-screen left panel) ──
  // rounded-lg inputs (no label), Remember-me row, solid auto-width Sign-In
  // button, social pills below — distinct from the mobile pill layout.
  const desktopForm = (
    <>
      {banners}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex h-12 items-center gap-2 rounded-lg border border-border bg-card px-4 transition-colors focus-within:border-primary">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErr.email)
                setFieldErr((f) => ({ ...f, email: undefined }));
            }}
            placeholder="Email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        {fieldErr.email && (
          <p className="px-1 text-[12px] font-medium text-[#DC2626]">
            {fieldErr.email}
          </p>
        )}

        <div className="flex h-12 items-center gap-2 rounded-lg border border-border bg-card px-4 transition-colors focus-within:border-primary">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErr.password)
                setFieldErr((f) => ({ ...f, password: undefined }));
            }}
            placeholder="Password"
            autoComplete="current-password"
            className="flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="appearance-none border-0 bg-transparent text-muted-foreground"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {fieldErr.password && (
          <p className="px-1 text-[12px] font-medium text-[#DC2626]">
            {fieldErr.password}
          </p>
        )}

        {/* Remember me / Forgot password */}
        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 text-muted-foreground">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded accent-primary"
            />
            Remember me
          </label>
          <a
            href="/forgot-password"
            className="font-semibold text-primary-deep"
          >
            Forgot Password?
          </a>
        </div>

        {/* Resend verification */}
        {showResend && (
          <button
            type="button"
            onClick={handleVerifyRedirect}
            className="h-10 w-full rounded-lg border-[1.5px] border-primary bg-[#F0FDF4] text-[13px] font-semibold text-primary"
          >
            Enter verification code
          </button>
        )}

        {/* Submit — solid, auto-width per new_design */}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-10 font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </button>

        {/* Social pills below the button */}
        <div className="pt-2">
          <SocialRow disabled={isWebView} onProvider={socialLogin} />
        </div>
      </form>
    </>
  );

  return (
    <Shell
      logoSrc={logoSrc}
      title={desktopTitle}
      subtitle={desktopSubtitle}
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <a href="/register" className="font-bold text-primary-deep">
            Create account
          </a>
        </p>
      }
    >
      {isDesktop ? (
        desktopForm
      ) : (
        <>
          {/* WebView banner — Google blocks OAuth in in-app browsers */}
          {isWebView && (
            <div className="rounded-xl border border-[#FED7AA] bg-[#FFF7ED] p-4">
              <div className="mb-2.5 flex items-start gap-2.5">
                <span className="shrink-0 text-lg">⚠️</span>
                <div>
                  <p className="mb-1 text-[13px] font-semibold text-[#92400E]">
                    Google sign-in blocked in this browser
                  </p>
                  <p className="text-xs text-[#B45309]">
                    You&apos;re in an in-app browser. Open the link below in
                    Chrome or Safari to continue.
                  </p>
                </div>
              </div>
              <div className="mb-2 break-all rounded-lg bg-[#FEF3C7] px-3 py-2 font-mono text-[11px] text-[#78350F]">
                {pageUrl}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className={`h-9 w-full rounded-lg text-[13px] font-semibold text-white transition-colors ${
                  copied ? "bg-primary" : "bg-[#F59E0B]"
                }`}
              >
                {copied ? "✓ Copied!" : "Copy link — open in Chrome / Safari"}
              </button>
            </div>
          )}

          {/* Info banner */}
          {info && (
            <div className="flex items-start gap-2 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2.5">
              <svg
                className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 10-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-[13px] text-[#15803D]">{info}</p>
            </div>
          )}

          {/* Error banner */}
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

          {/* Social buttons — 3-col grid */}
          <SocialRow disabled={isWebView} onProvider={socialLogin} />

          {/* OR divider */}
          <OrDivider label="OR CONTINUE WITH EMAIL" />

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-[13px] font-bold text-foreground">
                Email
              </label>
              <PillInput
                icon={Mail}
                error={!!fieldErr.email}
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErr.email)
                    setFieldErr((f) => ({ ...f, email: undefined }));
                }}
                placeholder="Enter your email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              {fieldErr.email && (
                <p className="mt-1.5 px-4 text-[12px] font-medium text-[#DC2626]">
                  {fieldErr.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[13px] font-bold text-foreground">
                  Password
                </label>
                <a
                  href="/forgot-password"
                  className="text-[12px] font-semibold text-primary-deep"
                >
                  Forgot password?
                </a>
              </div>
              <PillInput
                icon={Lock}
                error={!!fieldErr.password}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErr.password)
                    setFieldErr((f) => ({ ...f, password: undefined }));
                }}
                placeholder="Enter your password"
                autoComplete="current-password"
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="appearance-none border-0 bg-transparent text-muted-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                }
              />
              {fieldErr.password && (
                <p className="mt-1.5 px-4 text-[12px] font-medium text-[#DC2626]">
                  {fieldErr.password}
                </p>
              )}
            </div>

            {/* Resend verification */}
            {showResend && (
              <button
                type="button"
                onClick={handleVerifyRedirect}
                className="h-10 w-full rounded-full border-[1.5px] border-primary bg-[#F0FDF4] text-[13px] font-semibold text-primary"
              >
                Enter verification code
              </button>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-primary to-primary-deep text-[15px] font-bold text-white shadow-[var(--shadow-fab)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:from-[#A0D4BA] disabled:to-[#A0D4BA] disabled:shadow-none"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Login"
              )}
            </button>
          </form>
        </>
      )}
    </Shell>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import axios from "@/lib/axios";
import { getLogoForApp } from "@/lib/getLogo";
import { useAppBrand } from "@/hooks/useAppBrand";
import { getPostLoginDashboardUrl } from "@/lib/postLoginRedirect";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import AuthShell from "./AuthShell";
import DesktopAuthShell from "./DesktopAuthShell";
import PillInput from "./PillInput";
import PasswordHintTip from "./PasswordHintTip";
import { SocialRow, OrDivider } from "./AuthSocial";
import {
  nativeGoogleAvailable,
  startNativeGoogleSignIn,
} from "@/lib/nativeGoogleBridge";
import {
  nativeFacebookAvailable,
  startNativeFacebookSignIn,
} from "@/lib/nativeFacebookBridge";

// Password strength: +1 each for length>=8, uppercase, number, special char.
const getPasswordStrength = (pwd: string) => {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score; // 0-4
};

const STRENGTH_META = [
  { label: "Weak", color: "#EF4444" }, // 0-1
  { label: "Weak", color: "#EF4444" },
  { label: "Fair", color: "#F59E0B" }, // 2
  { label: "Good", color: "#EAB308" }, // 3
  { label: "Strong", color: "#22C55E" }, // 4
];

function PasswordStrengthBar({ password }: { password: string }) {
  if (!password) return null;
  const score = getPasswordStrength(password);
  const meta = STRENGTH_META[score];
  return (
    <div className="mt-2">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full"
            style={{ background: i < score ? meta.color : "#E5E7EB" }}
          />
        ))}
      </div>
      <p
        className="mt-1 text-[11px] font-semibold"
        style={{ color: meta.color }}
      >
        {meta.label}
      </p>
    </div>
  );
}

export default function RegisterForm() {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isWebView, setIsWebView] = useState(false);
  const [nativeGoogle, setNativeGoogle] = useState(false);
  const [nativeFacebook, setNativeFacebook] = useState(false);
  const [pageUrl, setPageUrl] = useState("");
  const [copied, setCopied] = useState(false);
  // Same one-tap guard as LoginForm — a second signIn() cancels WKWebView's
  // native Sign in with Apple hand-off and drops the user on Apple's web
  // login form instead (reported 2026-08-22).
  const [socialPending, setSocialPending] = useState<string | null>(null);
  const [existsCode, setExistsCode] = useState<
    "PRO_USER_EXISTS" | "TEAM_USER_EXISTS" | "USER_EXISTS" | null
  >(null);
  const router = useRouter();

  // Full logo follows the app SHELL (WebView UA), read post-mount via the
  // hydration-safe useAppBrand hook (UA wins over ?app= / stored). Web visitors
  // (brand="web") keep the standard logo — no billing context exists pre-signup.
  const brand = useAppBrand();
  const logoSrc = getLogoForApp(brand === "web" ? null : brand);

  useEffect(() => {
    const ua = navigator.userAgent;
    const webview =
      /\bwv\b/.test(ua) ||
      /FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|Twitter|Snapchat|TikTok|BytedanceWebview/.test(
        ua,
      ) ||
      (/iPhone|iPad|iPod/.test(ua) &&
        /AppleWebKit/.test(ua) &&
        !/Safari/.test(ua)) ||
      /WebView|webview/.test(ua);
    setIsWebView(webview);
    setPageUrl(window.location.href);
  }, []);

  // Whether the shell can run Google sign-in natively. Mirrors LoginForm: the
  // flag is published on every settled load and can land after mount.
  useEffect(() => {
    const sync = () => setNativeGoogle(nativeGoogleAvailable());
    sync();
    window.addEventListener("flutterGoogleSignInAvailable", sync);
    return () =>
      window.removeEventListener("flutterGoogleSignInAvailable", sync);
  }, []);

  // Same publication pattern as the Google flag — the shell fires it on every
  // settled load, which can land after this component mounts.
  useEffect(() => {
    const sync = () => setNativeFacebook(nativeFacebookAvailable());
    sync();
    window.addEventListener("flutterFacebookSignInAvailable", sync);
    return () =>
      window.removeEventListener("flutterFacebookSignInAvailable", sync);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!password || password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setExistsCode(null);
    setLoading(true);
    try {
      await axios.post("/auth/register", { name, email, password });
      toast.success("We've sent a 6-digit code to your email.");
      router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      const code = err.response?.data?.error?.code as string | undefined;
      const msg = err.response?.data?.error?.message || "Registration failed";
      if (
        code === "PRO_USER_EXISTS" ||
        code === "TEAM_USER_EXISTS" ||
        code === "USER_EXISTS"
      ) {
        setExistsCode(code);
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const isDesktop = useIsDesktop();

  const socialSignup = (
    provider: "google" | "apple" | "linkedin" | "facebook",
  ) => {
    if (socialPending) return;
    setSocialPending(provider);
    // Same hand-off as LoginForm: in the shell, Google goes to the OS account
    // picker rather than web OAuth, which Google blocks in a WebView. Signing
    // up and signing in are the same call — the backend creates the account on
    // first sight. See docs/be-auth-native-google.md.
    if (provider === "facebook" && nativeFacebookAvailable()) {
      return startNativeFacebookSignIn().then((result) => {
        if (result.ok) return; // navigating away
        setSocialPending(null);
        // SOCIAL_NO_EMAIL is worth naming: the account genuinely cannot be used
        // here, and "try again" would send the user round a loop that can never
        // succeed. Everything else is a dismissed sheet or a transient failure.
        toast.error(
          result.reason === "SOCIAL_NO_EMAIL"
            ? "That Facebook account has no email address to sign in with. Use email instead."
            : "Could not continue with Facebook. Use your password.",
        );
      });
    }
    if (provider === "google" && nativeGoogleAvailable()) {
      return startNativeGoogleSignIn().then((ok) => {
        if (ok) return; // navigating away
        setSocialPending(null);
        toast.error("Could not continue with Google. Try email instead.");
      });
    }
    return signIn(provider, { callbackUrl: getPostLoginDashboardUrl() }).catch(
      () => {
        setSocialPending(null);
      },
    );
  };

  const Shell = isDesktop ? DesktopAuthShell : AuthShell;

  return (
    <Shell
      logoSrc={logoSrc}
      title={isDesktop ? "Create Account" : "Create account"}
      subtitle={
        isDesktop
          ? "Join Value Charts and start mapping your flows"
          : "Join Value Charts and start mapping your flows"
      }
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <a href="/login" className="font-bold text-primary-deep">
            Sign in
          </a>
        </p>
      }
    >
      {/* WebView banner — social sign-up blocked in in-app browsers */}
      {isWebView && !nativeGoogle && (
        <div className="rounded-xl border border-[#FED7AA] bg-[#FFF7ED] p-4">
          <div className="mb-2.5 flex items-start gap-2.5">
            <span className="shrink-0 text-lg">⚠️</span>
            <div>
              <p className="mb-1 text-[13px] font-semibold text-[#92400E]">
                Social sign-up blocked in this browser
              </p>
              <p className="text-xs text-[#B45309]">
                You&apos;re in an in-app browser. Open the link below in Chrome
                or Safari — or use email/password instead.
              </p>
            </div>
          </div>
          <div className="mb-2 break-all rounded-lg bg-[#FEF3C7] px-3 py-2 font-mono text-[11px] text-[#78350F]">
            {pageUrl}
          </div>
          <button
            type="button"
            onClick={() =>
              navigator.clipboard?.writeText(pageUrl).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              })
            }
            className={`h-9 w-full appearance-none rounded-lg border-0 text-[13px] font-semibold text-white transition-colors ${
              copied ? "bg-primary" : "bg-[#F59E0B]"
            }`}
          >
            {copied ? "✓ Copied!" : "Copy link — open in Chrome / Safari"}
          </button>
        </div>
      )}

      {/* Account-exists banner — context-aware per error code */}
      {existsCode && (
        <div className="rounded-xl border border-[#FED7AA] bg-[#FFF7ED] px-4 py-3">
          <p className="mb-2 text-[13px] font-medium text-[#92400E]">
            {existsCode === "PRO_USER_EXISTS"
              ? "You already have a Pro account. Use the same credentials to log in — your Pro features will be available in this app too."
              : existsCode === "TEAM_USER_EXISTS"
                ? "You already have a Team account. Use the same credentials to log in — your Team features will be available in this app too."
                : "An account with this email already exists. Please log in instead."}
          </p>
          <a
            href={`/login?email=${encodeURIComponent(email)}`}
            className="inline-block rounded-lg bg-primary px-3.5 py-1.5 text-[13px] font-semibold text-white"
          >
            Go to Login →
          </a>
        </div>
      )}


      {/* Social buttons */}
      <SocialRow
        disabled={isWebView || socialPending !== null}
        googleEnabled={nativeGoogle && socialPending === null}
        facebookEnabled={nativeFacebook && socialPending === null}
        onProvider={socialSignup}
      />

      <OrDivider label="OR SIGN UP WITH EMAIL" />

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name — placeholder-only, matching Sign In. The visible <label>
            is replaced by an `sr-only` one so the field keeps an accessible
            name; a placeholder alone is not an accessible name. */}
        <div>
          <label htmlFor="register-name" className="sr-only">
            Full Name
          </label>
          <PillInput
            id="register-name"
            icon={User}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full Name"
            autoComplete="name"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="register-email" className="sr-only">
            Email
          </label>
          <PillInput
            id="register-email"
            icon={Mail}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="register-password" className="sr-only">
            Password
          </label>
          <PillInput
            id="register-password"
            icon={Lock}
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="new-password"
            trailing={
              <>
              <PasswordHintTip />
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
              </>
            }
          />
          <PasswordStrengthBar password={password} />
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="register-confirm" className="sr-only">
            Confirm Password
          </label>
          <PillInput
            id="register-confirm"
            icon={Lock}
            error={confirmPassword.length > 0 && password !== confirmPassword}
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm Password"
            autoComplete="new-password"
          />
          {confirmPassword.length > 0 && password !== confirmPassword && (
            <p className="mt-1.5 px-4 text-[12px] font-medium text-[#DC2626]">
              Passwords do not match
            </p>
          )}
        </div>

        {/* Terms */}
        <p className="text-center text-[12px] leading-relaxed text-muted-foreground">
          By signing up, you agree to our{" "}
          <a href="/terms" className="font-semibold text-primary-deep">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" className="font-semibold text-primary-deep">
            Privacy Policy
          </a>
        </p>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-primary to-primary-deep text-[15px] font-bold text-white shadow-[var(--shadow-fab)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:from-[#A0D4BA] disabled:to-[#A0D4BA] disabled:shadow-none"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create New Account"
          )}
        </button>
      </form>
    </Shell>
  );
}

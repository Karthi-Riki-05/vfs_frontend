"use client";

import React, { useState, useEffect } from "react";
import { message } from "antd";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import axios from "@/lib/axios";
import { getLogoForApp, getForcedMode } from "@/lib/getLogo";
import { getPostLoginDashboardUrl } from "@/lib/postLoginRedirect";

const GREEN = "#3CB371";

const inputBase: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  height: 46,
  paddingLeft: 36,
  paddingRight: 12,
  backgroundColor: "#EFF6FF",
  border: "1.5px solid #DBEAFE",
  borderRadius: 10,
  fontSize: 14,
  color: "#1a1a2e",
  fontFamily: "inherit",
  transition: "border-color 0.2s, background-color 0.2s",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 14,
  fontWeight: 500,
  color: "#374151",
  marginBottom: 6,
};

const iconWrap: React.CSSProperties = {
  position: "absolute",
  left: 12,
  top: "50%",
  transform: "translateY(-50%)",
  color: "#9CA3AF",
  pointerEvents: "none",
  display: "flex",
  alignItems: "center",
};

// ── Mobile hero (phones) styles — website green (#3CB371), gray inputs ──
const HERO_GREEN = "#3CB371";

const mInput: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  height: 46,
  paddingLeft: 40,
  paddingRight: 16,
  backgroundColor: "#F9FAFB",
  border: "1px solid #E5E7EB",
  borderRadius: 12,
  fontSize: 13.5,
  color: "#1a1a2e",
  fontFamily: "inherit",
  transition: "border-color 0.2s, background-color 0.2s, box-shadow 0.2s",
};

const mLabel: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: "#6B7280",
  marginBottom: 5,
  letterSpacing: "0.02em",
};

const mIconWrap: React.CSSProperties = {
  position: "absolute",
  left: 14,
  top: "50%",
  transform: "translateY(-50%)",
  color: "#9CA3AF",
  pointerEvents: "none",
  display: "flex",
  alignItems: "center",
};

const mFocus = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = HERO_GREEN;
  e.currentTarget.style.backgroundColor = "#f0faf5";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(76,175,80,0.12)";
};
const mBlur = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = "#E5E7EB";
  e.currentTarget.style.backgroundColor = "#F9FAFB";
  e.currentTarget.style.boxShadow = "none";
};

export default function RegisterForm() {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isWebView, setIsWebView] = useState(false);
  const [pageUrl, setPageUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [existsCode, setExistsCode] = useState<
    "PRO_USER_EXISTS" | "TEAM_USER_EXISTS" | "USER_EXISTS" | null
  >(null);
  const [logoSrc, setLogoSrc] = useState("/images/image.png");
  const router = useRouter();

  // Full logo for the mobile hero — Pro vs standard by app context.
  // ?app= is most explicit; fall back to the per-tab sessionStorage context.
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setError("");
    setExistsCode(null);
    setLoading(true);
    try {
      await axios.post("/auth/register", { name, email, password });
      message.success("We've sent a 6-digit code to your email.");
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
        message.error(msg);
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const focusHandler = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = GREEN;
    e.currentTarget.style.backgroundColor = "#F0FDF4";
  };
  const blurHandler = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "#DBEAFE";
    e.currentTarget.style.backgroundColor = "#EFF6FF";
  };

  return (
    <>
      {/* ══════════ DESKTOP (≥1024px) — UNCHANGED ══════════ */}
      <div className="vc-auth-desktop" style={{ width: "100%" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#111827",
              margin: "0 0 4px",
            }}
          >
            Create your account
          </h1>
          <p style={{ color: "#6B7280", fontSize: 14, margin: 0 }}>
            Join Value Charts and start mapping your flows
          </p>
        </div>

        {/* WebView banner — Google/LinkedIn/Facebook block OAuth in in-app browsers */}
        {isWebView && (
          <div
            style={{
              background: "#FFF7ED",
              border: "1px solid #FED7AA",
              borderRadius: 12,
              padding: "14px 16px",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                marginBottom: 10,
              }}
            >
              <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
              <div>
                <p
                  style={{
                    margin: "0 0 4px",
                    fontWeight: 600,
                    fontSize: 13,
                    color: "#92400E",
                  }}
                >
                  Social sign-up blocked in this browser
                </p>
                <p style={{ margin: 0, fontSize: 12, color: "#B45309" }}>
                  You&apos;re in an in-app browser. Google requires Chrome or
                  Safari to sign up. Copy the link below and open it there — or
                  use email/password instead.
                </p>
              </div>
            </div>
            <div
              style={{
                background: "#FEF3C7",
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 11,
                color: "#78350F",
                wordBreak: "break-all",
                marginBottom: 8,
                fontFamily: "monospace",
              }}
            >
              {pageUrl}
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(pageUrl).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                });
              }}
              style={{
                width: "100%",
                height: 36,
                borderRadius: 8,
                background: copied ? "#3CB371" : "#F59E0B",
                color: "#fff",
                border: "none",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "background 0.2s",
              }}
            >
              {copied ? "✓ Copied!" : "Copy link — open in Chrome / Safari"}
            </button>
          </div>
        )}

        {/* Social buttons — disabled when inside a WebView */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 20,
            width: "100%",
            opacity: isWebView ? 0.4 : 1,
            pointerEvents: isWebView ? "none" : "auto",
          }}
        >
          {/* Google — red, flex-1 */}
          <button
            type="button"
            disabled={isWebView}
            onClick={() =>
              signIn("google", { callbackUrl: getPostLoginDashboardUrl() })
            }
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              height: 44,
              borderRadius: 12,
              border: "none",
              backgroundColor: "#DB4437",
              color: "#fff",
              cursor: isWebView ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: 500,
              fontFamily: "inherit",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!isWebView) e.currentTarget.style.opacity = "0.9";
            }}
            onMouseLeave={(e) => {
              if (!isWebView) e.currentTarget.style.opacity = "1";
            }}
          >
            <svg
              style={{ width: 16, height: 16, flexShrink: 0 }}
              viewBox="0 0 24 24"
            >
              <path
                fill="white"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="white"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="white"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="white"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Google</span>
          </button>
          {/* LinkedIn — blue, 44x44 */}
          <button
            type="button"
            disabled={isWebView}
            onClick={() =>
              signIn("linkedin", { callbackUrl: getPostLoginDashboardUrl() })
            }
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 44,
              width: 44,
              minWidth: 44,
              borderRadius: 12,
              border: "none",
              backgroundColor: "#0A66C2",
              color: "#fff",
              cursor: isWebView ? "not-allowed" : "pointer",
              transition: "opacity 0.15s",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              if (!isWebView) e.currentTarget.style.opacity = "0.9";
            }}
            onMouseLeave={(e) => {
              if (!isWebView) e.currentTarget.style.opacity = "1";
            }}
          >
            <svg
              style={{ width: 16, height: 16 }}
              fill="white"
              viewBox="0 0 24 24"
            >
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </button>
          {/* Facebook — blue, 44x44 */}
          <button
            type="button"
            disabled={isWebView}
            onClick={() =>
              signIn("facebook", { callbackUrl: getPostLoginDashboardUrl() })
            }
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 44,
              width: 44,
              minWidth: 44,
              borderRadius: 12,
              border: "none",
              backgroundColor: "#1877F2",
              color: "#fff",
              cursor: isWebView ? "not-allowed" : "pointer",
              transition: "opacity 0.15s",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              if (!isWebView) e.currentTarget.style.opacity = "0.9";
            }}
            onMouseLeave={(e) => {
              if (!isWebView) e.currentTarget.style.opacity = "1";
            }}
          >
            <svg
              style={{ width: 16, height: 16 }}
              fill="white"
              viewBox="0 0 24 24"
            >
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </button>
        </div>

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
          <span style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 500 }}>
            OR
          </span>
          <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div style={{ width: "100%", marginBottom: 14 }}>
            <label style={labelStyle}>Full Name</label>
            <div style={{ position: "relative", width: "100%" }}>
              <div style={iconWrap}>
                <svg
                  style={{ width: 16, height: 16 }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                style={inputBase}
                onFocus={focusHandler}
                onBlur={blurHandler}
              />
            </div>
          </div>

          {/* Email */}
          <div style={{ width: "100%", marginBottom: 14 }}>
            <label style={labelStyle}>Email</label>
            <div style={{ position: "relative", width: "100%" }}>
              <div style={iconWrap}>
                <svg
                  style={{ width: 16, height: 16 }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={inputBase}
                onFocus={focusHandler}
                onBlur={blurHandler}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ width: "100%", marginBottom: 14 }}>
            <label style={labelStyle}>Password</label>
            <div style={{ position: "relative", width: "100%" }}>
              <div style={iconWrap}>
                <svg
                  style={{ width: 16, height: 16 }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                style={{ ...inputBase, paddingRight: 44 }}
                onFocus={focusHandler}
                onBlur={blurHandler}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#9CA3AF",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <svg
                  style={{ width: 16, height: 16 }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Terms */}
          <p
            style={{
              fontSize: 12,
              color: "#9CA3AF",
              textAlign: "center",
              lineHeight: 1.6,
              margin: "0 0 14px",
            }}
          >
            By signing up, you agree to our{" "}
            <a href="/terms" style={{ color: GREEN, textDecoration: "none" }}>
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" style={{ color: GREEN, textDecoration: "none" }}>
              Privacy Policy
            </a>
          </p>

          {/* Account-exists banner — context-aware per error code */}
          {existsCode && (
            <div
              style={{
                marginBottom: 14,
                background: "#FFF7ED",
                border: "1px solid #FED7AA",
                borderRadius: 10,
                padding: "12px 14px",
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  color: "#92400E",
                  margin: "0 0 8px",
                  fontWeight: 500,
                }}
              >
                {existsCode === "PRO_USER_EXISTS"
                  ? "You already have a Pro account. Use the same credentials to log in — your Pro features will be available in this app too."
                  : existsCode === "TEAM_USER_EXISTS"
                    ? "You already have a Team account. Use the same credentials to log in — your Team features will be available in this app too."
                    : "An account with this email already exists. Please log in instead."}
              </p>
              <a
                href={`/login?email=${encodeURIComponent(email)}`}
                style={{
                  display: "inline-block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#fff",
                  background: GREEN,
                  borderRadius: 8,
                  padding: "6px 14px",
                  textDecoration: "none",
                }}
              >
                Go to Login →
              </a>
            </div>
          )}

          {/* Generic error (non-duplicate errors) */}
          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 14,
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                borderRadius: 10,
                padding: "10px 12px",
              }}
            >
              <svg
                style={{
                  width: 16,
                  height: 16,
                  color: "#EF4444",
                  flexShrink: 0,
                }}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <p style={{ fontSize: 13, color: "#DC2626", margin: 0 }}>
                {error}
              </p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              height: 46,
              borderRadius: 12,
              color: "#fff",
              fontWeight: 600,
              fontSize: 15,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              background: loading ? "#9CA3AF" : GREEN,
              transition: "opacity 0.2s",
              fontFamily: "inherit",
              opacity: loading ? 0.6 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {loading ? (
              <>
                <svg
                  style={{
                    width: 16,
                    height: 16,
                    animation: "spin 1s linear infinite",
                  }}
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    style={{ opacity: 0.25 }}
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    style={{ opacity: 0.75 }}
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Creating account...
              </>
            ) : (
              "Create New Account"
            )}
          </button>
        </form>

        {/* Login link */}
        <p
          style={{
            textAlign: "center",
            fontSize: 14,
            color: "#6B7280",
            marginTop: 20,
            marginBottom: 0,
          }}
        >
          Already have an account?{" "}
          <a
            href="/login"
            style={{ color: GREEN, fontWeight: 600, textDecoration: "none" }}
          >
            Sign in
          </a>
        </p>
      </div>

      {/* ══════════ MOBILE / TABLET (<1024px) — hero design ══════════ */}
      <div className="vc-auth-mobile">
        {/* ── Green hero band ───────────────────────────── */}
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            background: "linear-gradient(145deg, #2d8a56, #3CB371, #4dbf7e)",
            padding: "40px 24px 28px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          {/* Decorative orb */}
          <div
            style={{
              position: "absolute",
              top: -32,
              right: -32,
              width: 128,
              height: 128,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.08)",
              pointerEvents: "none",
            }}
          />

          {/* Full logo (Pro / standard by app context) on a white pill */}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              background: "#fff",
              borderRadius: 16,
              padding: "9px 18px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={logoSrc}
              alt="Value Charts"
              style={{
                height: 56,
                width: "auto",
                maxWidth: 270,
                objectFit: "contain",
                display: "block",
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>

          {/* Headline */}
          <h1
            style={{
              position: "relative",
              zIndex: 1,
              color: "#fff",
              fontWeight: 800,
              fontSize: 22,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              textAlign: "center",
              margin: 0,
            }}
          >
            Create your account
          </h1>
          <p
            style={{
              position: "relative",
              zIndex: 1,
              color: "rgba(255,255,255,0.7)",
              fontSize: 11.5,
              textAlign: "center",
              margin: 0,
            }}
          >
            Join Value Charts and start mapping your flows
          </p>
        </div>

        {/* ── White card slides up ──────────────────────── */}
        <div
          style={{
            background: "#fff",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            marginTop: -16,
            flex: 1,
            padding: "20px 20px 24px",
            boxShadow: "0 -4px 20px rgba(0,0,0,0.06)",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* WebView banner — social sign-up blocked in in-app browsers */}
          {isWebView && (
            <div
              style={{
                background: "#FFF7ED",
                border: "1px solid #FED7AA",
                borderRadius: 12,
                padding: "14px 16px",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
                <div>
                  <p
                    style={{
                      margin: "0 0 4px",
                      fontWeight: 600,
                      fontSize: 13,
                      color: "#92400E",
                    }}
                  >
                    Social sign-up blocked in this browser
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: "#B45309" }}>
                    Open the link below in Chrome or Safari — or use
                    email/password instead.
                  </p>
                </div>
              </div>
              <div
                style={{
                  background: "#FEF3C7",
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontSize: 11,
                  color: "#78350F",
                  wordBreak: "break-all",
                  marginBottom: 8,
                  fontFamily: "monospace",
                }}
              >
                {pageUrl}
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(pageUrl).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  });
                }}
                style={{
                  width: "100%",
                  height: 36,
                  borderRadius: 8,
                  background: copied ? "#3CB371" : "#F59E0B",
                  color: "#fff",
                  border: "none",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "background 0.2s",
                }}
              >
                {copied ? "✓ Copied!" : "Copy link — open in Chrome / Safari"}
              </button>
            </div>
          )}

          {/* Social buttons */}
          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 16,
              opacity: isWebView ? 0.4 : 1,
              pointerEvents: isWebView ? "none" : "auto",
            }}
          >
            <button
              type="button"
              disabled={isWebView}
              onClick={() =>
                signIn("google", { callbackUrl: getPostLoginDashboardUrl() })
              }
              aria-label="Continue with Google"
              style={{
                flex: 1,
                height: 44,
                borderRadius: 12,
                border: "1px solid #E5E7EB",
                background: "#F9FAFB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: isWebView ? "not-allowed" : "pointer",
              }}
            >
              <svg style={{ width: 18, height: 18 }} viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            </button>
            <button
              type="button"
              disabled={isWebView}
              onClick={() =>
                signIn("linkedin", { callbackUrl: getPostLoginDashboardUrl() })
              }
              aria-label="Continue with LinkedIn"
              style={{
                flex: 1,
                height: 44,
                borderRadius: 12,
                border: "1px solid #E5E7EB",
                background: "#F9FAFB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: isWebView ? "not-allowed" : "pointer",
              }}
            >
              <svg
                style={{ width: 18, height: 18 }}
                fill="#0A66C2"
                viewBox="0 0 24 24"
              >
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </button>
            <button
              type="button"
              disabled={isWebView}
              onClick={() =>
                signIn("facebook", { callbackUrl: getPostLoginDashboardUrl() })
              }
              aria-label="Continue with Facebook"
              style={{
                flex: 1,
                height: 44,
                borderRadius: 12,
                border: "1px solid #E5E7EB",
                background: "#F9FAFB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: isWebView ? "not-allowed" : "pointer",
              }}
            >
              <svg
                style={{ width: 18, height: 18 }}
                fill="#1877F2"
                viewBox="0 0 24 24"
              >
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </button>
          </div>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "#9CA3AF",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              or sign up with email
            </span>
            <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Full Name */}
            <div style={{ marginBottom: 10 }}>
              <label style={mLabel}>Full Name</label>
              <div style={{ position: "relative" }}>
                <div style={mIconWrap}>
                  <svg
                    style={{ width: 16, height: 16 }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  style={mInput}
                  onFocus={mFocus}
                  onBlur={mBlur}
                />
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: 10 }}>
              <label style={mLabel}>Email</label>
              <div style={{ position: "relative" }}>
                <div style={mIconWrap}>
                  <svg
                    style={{ width: 16, height: 16 }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={mInput}
                  onFocus={mFocus}
                  onBlur={mBlur}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 10 }}>
              <label style={mLabel}>Password</label>
              <div style={{ position: "relative" }}>
                <div style={mIconWrap}>
                  <svg
                    style={{ width: 16, height: 16 }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  style={{ ...mInput, paddingRight: 44 }}
                  onFocus={mFocus}
                  onBlur={mBlur}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#9CA3AF",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {showPassword ? (
                    <svg
                      style={{ width: 16, height: 16 }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg
                      style={{ width: 16, height: 16 }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Terms */}
            <p
              style={{
                fontSize: 10.5,
                color: "#9CA3AF",
                textAlign: "center",
                lineHeight: 1.6,
                margin: "12px 0",
              }}
            >
              By signing up, you agree to our{" "}
              <a
                href="/terms"
                style={{
                  color: HERO_GREEN,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="/privacy"
                style={{
                  color: HERO_GREEN,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Privacy Policy
              </a>
            </p>

            {/* Account-exists banner — context-aware per error code */}
            {existsCode && (
              <div
                style={{
                  marginBottom: 12,
                  background: "#FFF7ED",
                  border: "1px solid #FED7AA",
                  borderRadius: 10,
                  padding: "12px 14px",
                }}
              >
                <p
                  style={{
                    fontSize: 13,
                    color: "#92400E",
                    margin: "0 0 8px",
                    fontWeight: 500,
                  }}
                >
                  {existsCode === "PRO_USER_EXISTS"
                    ? "You already have a Pro account. Use the same credentials to log in — your Pro features will be available in this app too."
                    : existsCode === "TEAM_USER_EXISTS"
                      ? "You already have a Team account. Use the same credentials to log in — your Team features will be available in this app too."
                      : "An account with this email already exists. Please log in instead."}
                </p>
                <a
                  href={`/login?email=${encodeURIComponent(email)}`}
                  style={{
                    display: "inline-block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#fff",
                    background: HERO_GREEN,
                    borderRadius: 8,
                    padding: "6px 14px",
                    textDecoration: "none",
                  }}
                >
                  Go to Login →
                </a>
              </div>
            )}

            {/* Generic error (non-duplicate errors) */}
            {error && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 12,
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  borderRadius: 10,
                  padding: "10px 12px",
                }}
              >
                <svg
                  style={{
                    width: 16,
                    height: 16,
                    color: "#EF4444",
                    flexShrink: 0,
                  }}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <p style={{ fontSize: 13, color: "#DC2626", margin: 0 }}>
                  {error}
                </p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                height: 48,
                borderRadius: 14,
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                background: loading ? "#9CA3AF" : "#3CB371",
                boxShadow: loading ? "none" : "0 8px 24px rgba(76,175,80,0.30)",
                transition: "opacity 0.2s",
                fontFamily: "inherit",
                opacity: loading ? 0.6 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {loading ? (
                <>
                  <svg
                    style={{
                      width: 16,
                      height: 16,
                      animation: "spin 1s linear infinite",
                    }}
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      style={{ opacity: 0.25 }}
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      style={{ opacity: 0.75 }}
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Creating account...
                </>
              ) : (
                "Create New Account"
              )}
            </button>
          </form>

          {/* Sign in link */}
          <p
            style={{
              textAlign: "center",
              marginTop: 14,
              fontSize: 12,
              color: "#9CA3AF",
            }}
          >
            Already have an account?{" "}
            <a
              href="/login"
              style={{
                color: HERO_GREEN,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Sign in
            </a>
          </p>
        </div>
      </div>

      <style>{`
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .vc-auth-mobile { display: none; }
      @media (max-width: 600px) {
        .vc-auth-desktop { display: none !important; }
        .vc-auth-mobile {
          display: flex;
          flex-direction: column;
          min-height: 100dvh;
          background: #fff;
        }
      }
    `}</style>
    </>
  );
}

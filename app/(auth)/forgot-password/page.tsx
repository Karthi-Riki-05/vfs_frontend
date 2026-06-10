"use client";

import React, { useState, useEffect } from "react";
import { message } from "antd";
import { authApi } from "@/api/auth.api";
import { getLogoForApp, getForcedMode } from "@/lib/getLogo";

const GREEN = "#3CB371";
// Mobile hero accent — website green (#3CB371)
const HERO_GREEN = "#3CB371";

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

// ── Mobile hero (phones) styles — gray inputs, green focus ──
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

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [logoSrc, setLogoSrc] = useState("/images/image.png");

  // Full logo for the mobile hero — Pro vs standard by app context.
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
      {/* ══════════ DESKTOP (≥601px) — UNCHANGED ══════════ */}
      <div className="vc-auth-desktop" style={{ width: "100%" }}>
        {sent ? (
          <div style={{ textAlign: "center", width: "100%" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "#E8F5E9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <svg
                style={{ width: 28, height: 28, color: GREEN }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "#111827",
                margin: "0 0 8px",
              }}
            >
              Check your email
            </h1>
            <p
              style={{
                color: "#6B7280",
                fontSize: 14,
                lineHeight: 1.6,
                marginBottom: 20,
              }}
            >
              We sent a password reset link to{" "}
              <strong style={{ color: "#374151" }}>{email}</strong>. Check your
              inbox and follow the link.
            </p>
            <p style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 24 }}>
              Didn&apos;t receive it? Check your spam folder.
            </p>
            <a
              href="/login"
              style={{
                fontSize: 14,
                color: GREEN,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              &larr; Back to sign in
            </a>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: "#E8F5E9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <svg
                  style={{ width: 24, height: 24, color: GREEN }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
              </div>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#111827",
                  margin: "0 0 4px",
                }}
              >
                Forgot your password?
              </h1>
              <p style={{ color: "#6B7280", fontSize: 14, margin: 0 }}>
                No worries. Enter your email and we&apos;ll send you a reset
                link.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div style={{ width: "100%", marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#374151",
                    marginBottom: 6,
                  }}
                >
                  Email address
                </label>
                <div style={{ position: "relative", width: "100%" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#9CA3AF",
                      pointerEvents: "none",
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

              {/* Error */}
              {error && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 16,
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
                    Sending...
                  </>
                ) : (
                  <>
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
                    Send Reset Link
                  </>
                )}
              </button>
            </form>

            {/* Back link */}
            <p
              style={{
                textAlign: "center",
                fontSize: 14,
                color: "#6B7280",
                marginTop: 20,
                marginBottom: 0,
              }}
            >
              <a
                href="/login"
                style={{
                  color: GREEN,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                &larr; Back to sign in
              </a>
            </p>
          </>
        )}
      </div>

      {/* ══════════ MOBILE / TABLET (≤600px) — hero design ══════════ */}
      <div className="vc-auth-mobile">
        {/* ── Green hero band ───────────────────────────── */}
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            background: "#3CB371",
            padding: "40px 24px 32px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          {/* Decorative orbs */}
          <div
            style={{
              position: "absolute",
              top: -40,
              right: -40,
              width: 160,
              height: 160,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.08)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -32,
              left: -32,
              width: 112,
              height: 112,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.06)",
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
              padding: "10px 18px",
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
                height: 60,
                width: "auto",
                maxWidth: 280,
                objectFit: "contain",
                display: "block",
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>

          {/* Headline */}
          <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
            <h1
              style={{
                color: "#fff",
                fontWeight: 800,
                fontSize: 24,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              {sent ? "Check your email" : "Forgot password?"}
            </h1>
            <p
              style={{
                color: "rgba(255,255,255,0.78)",
                fontSize: 12,
                margin: "5px 0 0",
                lineHeight: 1.5,
              }}
            >
              {sent
                ? "We sent you a reset link"
                : "Enter your email and we'll send you a reset link"}
            </p>
          </div>
        </div>

        {/* ── White card slides up ──────────────────────── */}
        <div
          style={{
            background: "#fff",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            marginTop: -16,
            flex: 1,
            padding: "28px 24px",
            boxShadow: "0 -4px 20px rgba(0,0,0,0.06)",
            position: "relative",
            zIndex: 1,
          }}
        >
          {sent ? (
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "#E8F5E9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 18px",
                }}
              >
                <svg
                  style={{ width: 28, height: 28, color: HERO_GREEN }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p
                style={{
                  color: "#374151",
                  fontSize: 14,
                  lineHeight: 1.6,
                  margin: "0 0 8px",
                }}
              >
                We sent a password reset link to <strong>{email}</strong>. Check
                your inbox and follow the link.
              </p>
              <p style={{ fontSize: 12, color: "#9CA3AF", margin: "0 0 22px" }}>
                Didn&apos;t receive it? Check your spam folder.
              </p>
              <a
                href="/login"
                style={{
                  fontSize: 13.5,
                  color: HERO_GREEN,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                &larr; Back to sign in
              </a>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit}>
                {/* Email */}
                <div style={{ marginBottom: 14 }}>
                  <label style={mLabel}>Email address</label>
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

                {/* Error */}
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
                    height: 50,
                    borderRadius: 14,
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 14.5,
                    border: "none",
                    cursor: loading ? "not-allowed" : "pointer",
                    background: loading ? "#9CA3AF" : "#3CB371",
                    boxShadow: loading
                      ? "none"
                      : "0 8px 24px rgba(76,175,80,0.30)",
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
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
              </form>

              {/* Back link */}
              <p
                style={{
                  textAlign: "center",
                  marginTop: 18,
                  fontSize: 12.5,
                  color: "#9CA3AF",
                }}
              >
                <a
                  href="/login"
                  style={{
                    color: HERO_GREEN,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  &larr; Back to sign in
                </a>
              </p>
            </>
          )}
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

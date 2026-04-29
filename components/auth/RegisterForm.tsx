"use client";

import React, { useState } from "react";
import { message } from "antd";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import axios from "@/lib/axios";

const GREEN = "#4CAF50";

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
  outline: "none",
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

export default function RegisterForm() {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

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
    setLoading(true);
    try {
      await axios.post("/auth/register", { name, email, password });
      message.success("We've sent a 6-digit code to your email.");
      router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || "Registration failed";
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
    <div style={{ width: "100%" }}>
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

      {/* Social buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, width: "100%" }}>
        {/* Google — red, flex-1 */}
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
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
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 500,
            fontFamily: "inherit",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.9";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
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
          onClick={() => signIn("linkedin", { callbackUrl: "/dashboard" })}
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
            cursor: "pointer",
            transition: "opacity 0.15s",
            fontFamily: "inherit",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.9";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
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
          onClick={() => signIn("facebook", { callbackUrl: "/dashboard" })}
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
            cursor: "pointer",
            transition: "opacity 0.15s",
            fontFamily: "inherit",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.9";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
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
              style={{ width: 16, height: 16, color: "#EF4444", flexShrink: 0 }}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <p style={{ fontSize: 13, color: "#DC2626", margin: 0 }}>{error}</p>
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

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

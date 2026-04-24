"use client";

import React, { useState } from "react";
import { message } from "antd";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

const GREEN = "#4CAF50";
const NAVY = "#1F3864";

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

export default function SuperAdminLoginPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const focusHandler = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = GREEN;
    e.currentTarget.style.backgroundColor = "#F0FDF4";
  };
  const blurHandler = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "#DBEAFE";
    e.currentTarget.style.backgroundColor = "#EFF6FF";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }
    if (!password) {
      setError("Please enter your password");
      return;
    }
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (result?.error) {
      setLoading(false);
      setError("Invalid credentials or insufficient permissions");
      message.error("Login failed");
      return;
    }

    // Login succeeded — verify the session belongs to a super admin.
    try {
      const res = await fetch("/api/auth/session");
      const sess = await res.json();
      const role = sess?.user?.role;

      if (role !== "super_admin") {
        // Sign them out of NextAuth immediately — they should not keep a
        // session that only works for the regular app while on this page.
        await fetch("/api/auth/signout", { method: "POST" }).catch(() => {});
        setLoading(false);
        setError(
          "Access denied. This panel is restricted to super administrators only.",
        );
        return;
      }

      message.success("Signed in as super admin");
      router.push("/super-admin/dashboard");
    } catch {
      setLoading(false);
      setError("Could not verify session. Please try again.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: GREEN,
        padding: 16,
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
        boxSizing: "border-box",
      }}
    >
      <div
        className="sa-login-card"
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          borderRadius: 20,
          padding: "32px 28px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {/* ValueCharts logo — same asset + sizing as user login */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 18,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/image.png"
            alt="Value Charts"
            style={{ height: 64, width: "auto", objectFit: "contain" }}
          />
        </div>

        {/* Super Admin badge — shield in a navy-tinted pill */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 999,
              background: `${NAVY}10`,
              border: `1px solid ${NAVY}25`,
            }}
          >
            <svg
              width="16"
              height="16"
              fill="none"
              stroke={NAVY}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: NAVY,
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              Super Admin
            </span>
          </div>
        </div>

        {/* Heading + tagline */}
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#111827",
              margin: "0 0 4px",
            }}
          >
            Admin portal
          </h1>
          <p style={{ color: "#6B7280", fontSize: 13, margin: 0 }}>
            Restricted access — authorized personnel only
          </p>
        </div>

        <form onSubmit={handleSubmit}>
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
                placeholder="admin@example.com"
                style={inputBase}
                onFocus={focusHandler}
                onBlur={blurHandler}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ width: "100%", marginBottom: 16 }}>
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
                placeholder="Enter your password"
                style={{ ...inputBase, paddingRight: 44 }}
                onFocus={focusHandler}
                onBlur={blurHandler}
                autoComplete="current-password"
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
                aria-label={showPassword ? "Hide password" : "Show password"}
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
                Signing in…
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Warning footer */}
        <p
          style={{
            textAlign: "center",
            fontSize: 11,
            color: "#9CA3AF",
            marginTop: 20,
            marginBottom: 0,
            lineHeight: 1.6,
          }}
        >
          This panel is for administrators only.
          <br />
          Unauthorized access attempts are logged.
        </p>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 380px) {
          .sa-login-card { padding: 24px 16px !important; }
        }
      `}</style>
    </div>
  );
}

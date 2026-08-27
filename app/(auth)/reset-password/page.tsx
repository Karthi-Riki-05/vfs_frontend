"use client";

import React, { useState, Suspense } from "react";
import { toast } from "sonner";
import { authApi } from "@/api/auth.api";
import { useSearchParams } from "next/navigation";
import { Lock, Eye, EyeOff } from "lucide-react";
import PillInput from "@/components/auth/PillInput";
import PasswordHintTip from "@/components/auth/PasswordHintTip";

const GREEN = "#3CB371";

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
  { label: "Weak", color: "#EF4444" },
  { label: "Weak", color: "#EF4444" },
  { label: "Fair", color: "#F59E0B" },
  { label: "Good", color: "#EAB308" },
  { label: "Strong", color: "#22C55E" },
];

function PasswordStrengthBar({ password }: { password: string }) {
  if (!password) return null;
  const score = getPasswordStrength(password);
  const meta = STRENGTH_META[score];
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", gap: 6 }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: 6,
              flex: 1,
              borderRadius: 9999,
              background: i < score ? meta.color : "#E5E7EB",
            }}
          />
        ))}
      </div>
      <p
        style={{
          marginTop: 4,
          fontSize: 11,
          fontWeight: 600,
          color: meta.color,
        }}
      >
        {meta.label}
      </p>
    </div>
  );
}

function ResetPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // Validation messages go to the TOAST only (2026-08-21); this flag just
  // drives the field's red border.
  const [invalid, setInvalid] = useState(false);
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error("Invalid or missing reset token");
      return;
    }
    if (!password || password.length < 8) {
      toast.error("Password must be at least 8 characters");
      setInvalid(true);
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message || "Failed to reset password";
      toast.error(msg);
      setInvalid(true);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
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
          Password reset successfully
        </h1>
        <p
          style={{
            color: "#6B7280",
            fontSize: 14,
            lineHeight: 1.6,
            marginBottom: 24,
          }}
        >
          You can now log in with your new password.
        </p>
        <a
          href="/login"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "12px 32px",
            borderRadius: 12,
            color: "#fff",
            fontWeight: 600,
            fontSize: 15,
            textDecoration: "none",
            background: GREEN,
          }}
        >
          Go to Login
        </a>
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
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
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
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
          Reset your password
        </h1>
        <p style={{ color: "#6B7280", fontSize: 14, margin: 0 }}>
          Enter your new password below
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {/* New Password — PillInput + placeholder, matching Sign In / Sign Up /
            forgot-password. The old markup was a hand-rolled input with inline
            styles and inline SVGs. */}
        <div style={{ width: "100%", marginBottom: 14 }}>
          <label htmlFor="reset-password" className="sr-only">
            New Password
          </label>
          <PillInput
            id="reset-password"
            icon={Lock}
            error={invalid}
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (invalid) setInvalid(false);
            }}
            placeholder="New Password"
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
        <div style={{ width: "100%", marginBottom: 16 }}>
          <label htmlFor="reset-confirm" className="sr-only">
            Confirm Password
          </label>
          <PillInput
            id="reset-confirm"
            icon={Lock}
            error={
              invalid || (confirmPassword.length > 0 && password !== confirmPassword)
            }
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (invalid) setInvalid(false);
            }}
            placeholder="Confirm Password"
            autoComplete="new-password"
          />
        </div>


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
              Resetting...
            </>
          ) : (
            "Reset Password"
          )}
        </button>
      </form>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 40,
          }}
        >
          <svg
            style={{
              width: 24,
              height: 24,
              animation: "spin 1s linear infinite",
              color: GREEN,
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
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}

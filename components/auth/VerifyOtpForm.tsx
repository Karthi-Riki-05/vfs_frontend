"use client";

import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "@/lib/axios";
import { ArrowLeft } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import DesktopAuthShell from "@/components/auth/DesktopAuthShell";
import { getLogoForApp } from "@/lib/getLogo";
import { useAppBrand } from "@/hooks/useAppBrand";
import { useIsDesktop } from "@/hooks/useMediaQuery";

const GREEN = "#3CB371";
const OTP_LEN = 6;

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 14,
  fontWeight: 500,
  color: "#374151",
  marginBottom: 6,
};

export default function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams?.get("email") || "";

  const brand = useAppBrand();
  const logoSrc = getLogoForApp(brand === "web" ? null : brand);
  const isDesktop = useIsDesktop();
  const Shell = isDesktop ? DesktopAuthShell : AuthShell;

  const [email, setEmail] = useState(emailFromQuery);
  const [digits, setDigits] = useState<string[]>(Array(OTP_LEN).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (emailFromQuery) {
      setInfo(`We sent a 6-digit code to ${emailFromQuery}. Enter it below.`);
    }
    inputs.current[0]?.focus();
  }, [emailFromQuery]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleDigit = (i: number, val: string) => {
    const v = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v && i < OTP_LEN - 1) inputs.current[i + 1]?.focus();
    // Auto-submit once all six boxes are filled.
    const otp = next.join("");
    if (otp.length === OTP_LEN) submitOtp(otp);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LEN);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(OTP_LEN).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    inputs.current[Math.min(pasted.length, OTP_LEN - 1)]?.focus();
    // Auto-submit when a full code is pasted.
    const otp = next.join("");
    if (otp.length === OTP_LEN) submitOtp(otp);
  };

  const handleKeyDown = (
    i: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const submitOtp = async (otp: string) => {
    if (loading) return; // guard against double-submit (auto + manual)
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (otp.length !== OTP_LEN) {
      setError("Enter the 6-digit code");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await axios.post("/auth/verify-otp", { email, otp });
      toast.success("Email verified! You can log in now.");
      router.push("/login?verified=1");
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || "Verification failed";
      toast.error(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitOtp(digits.join(""));
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setError("Enter your email first");
      return;
    }
    setError("");
    setResending(true);
    try {
      await axios.post("/auth/resend-verification", { email });
      toast.success(
        "If your account exists and is unverified, a code was sent.",
      );
      setInfo(`A new code was sent to ${email}.`);
      setCooldown(45);
    } catch {
      toast.error("Could not send a new code. Try again later.");
    } finally {
      setResending(false);
    }
  };

  return (
    <Shell
      logoSrc={logoSrc}
      title="Verify your email"
      subtitle="Enter the 6-digit code we emailed you"
      footer={
        <p className="text-center text-sm">
          <a
            href="/login"
            className="inline-flex items-center gap-1.5 font-bold text-primary-deep"
          >
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </a>
        </p>
      }
    >
      {info && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            marginBottom: 14,
            background: "#F0FDF4",
            border: "1px solid #BBF7D0",
            borderRadius: 10,
            padding: "10px 12px",
          }}
        >
          <p style={{ fontSize: 13, color: "#15803D", margin: 0 }}>{info}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{
              width: "100%",
              boxSizing: "border-box",
              height: 44,
              padding: "0 12px",
              backgroundColor: "#EFF6FF",
              border: "1.5px solid #DBEAFE",
              borderRadius: 10,
              fontSize: 14,
              color: "#1a1a2e",
              fontFamily: "inherit",
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Verification Code</label>
          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "space-between",
              width: "100%",
              maxWidth: 320,
              margin: "0 auto",
            }}
          >
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputs.current[i] = el;
                }}
                value={d}
                onChange={(e) => handleDigit(i, e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e) => handleKeyDown(i, e)}
                inputMode="numeric"
                maxLength={1}
                style={{
                  flex: 1,
                  minWidth: 0,
                  maxWidth: 52,
                  aspectRatio: "1",
                  boxSizing: "border-box",
                  textAlign: "center",
                  fontSize: 22,
                  fontWeight: 600,
                  color: "#111827",
                  border: "1.5px solid #DBEAFE",
                  borderRadius: 10,
                  backgroundColor: "#EFF6FF",
                  fontFamily: "inherit",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = GREEN;
                  e.currentTarget.style.backgroundColor = "#F0FDF4";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#DBEAFE";
                  e.currentTarget.style.backgroundColor = "#EFF6FF";
                }}
              />
            ))}
          </div>
        </div>

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
            <p style={{ fontSize: 13, color: "#DC2626", margin: 0 }}>{error}</p>
          </div>
        )}

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
            fontFamily: "inherit",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Verifying..." : "Verify Email"}
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending || cooldown > 0}
          style={{
            width: "100%",
            minHeight: 44,
            borderRadius: 10,
            marginTop: 12,
            background: "#F0FDF4",
            border: `1px solid ${GREEN}`,
            color: GREEN,
            fontWeight: 500,
            fontSize: 13,
            cursor: resending || cooldown > 0 ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            opacity: resending || cooldown > 0 ? 0.6 : 1,
          }}
        >
          {cooldown > 0
            ? `Resend code in ${cooldown}s`
            : resending
              ? "Sending..."
              : "Resend code"}
        </button>
      </form>
    </Shell>
  );
}

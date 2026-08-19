"use client";

import React, { ReactNode } from "react";

/** Icon-only social sign-in pills (Google / Apple / LinkedIn / Facebook) + OR
 *  divider. Shared across auth forms. Render inside a `.tw` root.
 *  Apple is required alongside Google/Facebook by App Store Guideline 4.8 —
 *  added 2026-08-18. */
export function SocialRow({
  disabled,
  onProvider,
}: {
  disabled?: boolean;
  onProvider: (p: "google" | "apple" | "linkedin" | "facebook") => void;
}) {
  return (
    <div
      className={`grid grid-cols-4 gap-3 ${
        disabled ? "pointer-events-none opacity-40" : ""
      }`}
    >
      <SocialPill
        icon={<GoogleIcon />}
        label="Continue with Google"
        disabled={disabled}
        onClick={() => onProvider("google")}
      />
      <SocialPill
        icon={<AppleIcon />}
        label="Continue with Apple"
        disabled={disabled}
        onClick={() => onProvider("apple")}
      />
      <SocialPill
        icon={<LinkedinSquare />}
        label="Continue with LinkedIn"
        disabled={disabled}
        onClick={() => onProvider("linkedin")}
      />
      <SocialPill
        icon={<FacebookCircle />}
        label="Continue with Facebook"
        disabled={disabled}
        onClick={() => onProvider("facebook")}
      />
    </div>
  );
}

export function OrDivider({ label }: { label: string }) {
  return (
    <div className="my-1 flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[10px] font-semibold tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function SocialPill({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-11 items-center justify-center rounded-full border border-border bg-card shadow-sm transition active:scale-95 disabled:cursor-not-allowed sm:h-12"
    >
      {icon}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24">
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
  );
}

function AppleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#000">
      <path d="M16.365 1.43c0 1.14-.416 2.06-1.25 2.86-.9.87-2.03 1.37-3.2 1.28-.03-1.11.42-2.13 1.24-2.9C14.06 1.86 15.14 1.4 16.365 1.43zM20.5 17.13c-.36.83-.79 1.6-1.3 2.31-.7.98-1.42 1.94-2.44 1.96-1 .02-1.32-.62-2.47-.62-1.15 0-1.5.6-2.46.64-1 .04-1.76-1-2.47-1.98-1.51-2.1-2.66-5.95-1.11-8.55.77-1.29 2.15-2.11 3.65-2.13 1.03-.02 1.87.66 2.47.66.6 0 1.62-.82 2.75-.7.47.02 1.79.19 2.63 1.43-.07.04-1.57.92-1.55 2.74.02 2.18 1.9 2.9 1.94 2.92-.02.06-.3 1.03-1.34 2.32z" />
    </svg>
  );
}

function LinkedinSquare() {
  return (
    <div className="flex h-6 w-6 items-center justify-center rounded bg-[#0A66C2] text-[12px] font-extrabold text-white">
      in
    </div>
  );
}

function FacebookCircle() {
  return (
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1877F2] text-[14px] font-extrabold text-white">
      f
    </div>
  );
}

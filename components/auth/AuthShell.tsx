"use client";

import React, { ReactNode } from "react";

/**
 * Shared auth visual shell — green gradient hero band (logo + title) above a
 * white form panel that overlaps the hero. Used by Login, Register and
 * Forgot-password so all three share one design. Must render inside a `.tw`
 * root (Tailwind is scoped here, preflight off).
 */
export default function AuthShell({
  logoSrc,
  title,
  subtitle,
  children,
  footer,
}: {
  logoSrc: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="tw min-h-[100dvh] w-full bg-background flex flex-col sm:items-center sm:justify-center sm:py-8">
      <div className="w-full flex-1 sm:flex-none sm:max-w-md flex flex-col bg-card overflow-hidden sm:rounded-[28px] sm:shadow-card">
        {/* ── HERO BAND ── */}
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-[#2A9272] via-primary to-primary-deep px-6 pt-16 pb-16 text-white">
          <div className="absolute -left-10 top-4 h-44 w-44 rounded-full bg-white/10" />
          <div className="absolute right-6 top-28 h-20 w-20 rounded-full bg-white/10" />
          <div className="absolute right-20 -top-6 h-16 w-16 rounded-full bg-white/10" />
          <div className="absolute -right-10 bottom-10 h-32 w-32 rounded-full bg-white/10" />

          <div className="relative z-10 mx-auto w-fit rounded-2xl bg-card px-5 py-4 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.25)]">
            <img
              src={logoSrc}
              alt="Value Charts"
              className="h-14 w-auto max-w-[240px] object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>

          <div className="relative z-10 mt-6 text-center">
            <h1 className="text-[32px] font-extrabold leading-tight tracking-tight">
              {title}
            </h1>
            <p className="mt-1 text-sm text-white/85">{subtitle}</p>
          </div>
        </div>

        {/* ── FORM PANEL (overlaps hero by 8px) ── */}
        <div className="relative -mt-8 flex-1 space-y-4 rounded-t-[28px] bg-card px-6 pt-6 pb-8">
          {children}
          {footer}
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { ReactNode } from "react";

/**
 * Desktop-only split-screen auth shell (≥1024px).
 * Left: white form panel. Right: green gradient branding panel.
 * Same props interface as AuthShell so form components can swap between the two.
 */
export default function DesktopAuthShell({
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
    <div className="tw flex h-screen w-full overflow-hidden">
      {/* ── LEFT: form panel ── */}
      <div className="flex w-1/2 flex-col items-center justify-center overflow-y-auto bg-card px-12 py-10">
        <div className="w-full max-w-[380px]">
          <h1 className="text-[2rem] font-extrabold leading-tight tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>

          <div className="mt-8 space-y-4">{children}</div>

          {footer && <div className="mt-6">{footer}</div>}
        </div>
      </div>

      {/* ── RIGHT: branding panel ── */}
      <div className="relative flex w-1/2 items-center justify-center overflow-hidden bg-gradient-to-br from-[#2A9272] via-primary to-primary-deep">
        {/* Decorative circles */}
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-white/10" />
        <div className="absolute right-8 top-[30%] h-28 w-28 rounded-full bg-white/10" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center px-12 text-center">
          {/* Logo card */}
          <div className="mb-8 rounded-2xl bg-card px-6 py-4 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)]">
            <img
              src={logoSrc}
              alt="Value Charts"
              className="h-14 w-auto max-w-[200px] object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>

          <h2 className="text-[2rem] font-extrabold leading-tight text-white">
            We Add Value To
            <br />
            Your Business
          </h2>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/80">
            Plan smarter, collaborate faster, and transform ideas into outcomes
            — all in one connected workspace.
          </p>
        </div>
      </div>
    </div>
  );
}

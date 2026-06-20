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
      <div className="flex w-1/2 flex-col justify-center overflow-y-auto bg-card px-20 py-12 xl:px-28">
        <div className="mx-auto w-full max-w-2xl">
          <h1 className="text-[44px] font-extrabold leading-[1.1] tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">{subtitle}</p>

          <div className="mt-10 space-y-4">{children}</div>

          {footer && <div className="pt-6">{footer}</div>}
        </div>
      </div>

      {/* ── RIGHT: branding panel ── */}
      <div className="relative flex w-1/2 items-center justify-center overflow-hidden bg-gradient-to-br from-[#2A9272] via-primary to-primary-deep">
        {/* Decorative circles */}
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-white/10" />
        <div className="absolute right-8 top-[30%] h-28 w-28 rounded-full bg-white/10" />

        {/* Content */}
        <div className="relative z-10 flex max-w-sm flex-col items-center px-10 text-center text-white">
          {/* Logo card */}
          <div className="mx-auto w-fit rounded-2xl bg-white/95 px-6 py-5 shadow-2xl">
            <img
              src={logoSrc}
              alt="Value Charts"
              className="h-16 w-auto max-w-[200px] object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>

          <h2 className="mt-8 text-3xl font-extrabold text-white">
            We Add Value To Your Business
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/85">
            Plan smarter, collaborate faster, and turn ideas into outcomes — all
            in one connected workspace.
          </p>
        </div>
      </div>
    </div>
  );
}

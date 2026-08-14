"use client";

import React from "react";

/**
 * The branded full-bleed splash panel: gradient, zooming logo, wordmark,
 * pulsing dots, bottom caption.
 *
 * Extracted from AppContextLoader so every full-screen "please wait" in the
 * app is literally the same pixels rather than a look-alike. There is already
 * a third hand-built copy of this design in the native shell
 * (`_LoadingScreen` in flutter_webview-main/lib/webview_native.dart) that has
 * to be kept in sync by hand — that one cannot share code across the language
 * boundary, which is exactly why the two WEB copies should not have drifted
 * apart as well.
 *
 * Renders only the panel. Callers own the positioning: AppContextLoader lays it
 * over its own children, the native-auth route pins it over the whole viewport.
 */
export function BrandSplash({
  caption = "Loading your workspace…",
}: {
  /** Bottom-anchored line. The only thing that varies between uses. */
  caption?: string;
}) {
  return (
    <div className="h-full bg-gradient-to-br from-primary via-primary to-[#1F7D5E] flex flex-col items-center justify-center text-white">
      {/* Logo — zoom-in on mount */}
      <div className="animate-in zoom-in duration-700">
        <img
          src="/Logo/logo.png"
          alt="Value Charts"
          style={{ width: 120, height: "auto", objectFit: "contain" }}
        />
      </div>

      {/* Wordmark */}
      <div className="mt-6 text-2xl font-extrabold tracking-tight">
        Value Charts
      </div>
      <div className="mt-1 text-sm text-white/85">
        We Add Value To Your Business
      </div>

      {/* Pulsing dots */}
      <div className="mt-12 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-white/70 animate-pulse"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>

      {/* Footer caption */}
      <div className="absolute bottom-10 text-xs text-white/70">{caption}</div>
    </div>
  );
}

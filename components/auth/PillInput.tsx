"use client";

import React, { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Shared rounded-full input row for auth forms (icon + input + optional
 * trailing slot). `border-0` on the native <input>/<button> is required because
 * Tailwind preflight is off here — without it they show the UA default border.
 */
export default function PillInput({
  icon: Icon,
  error,
  trailing,
  ...inputProps
}: {
  icon: LucideIcon;
  error?: boolean;
  trailing?: ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div
      className={`mt-1.5 flex h-12 items-center gap-2 rounded-full border bg-card px-4 focus-within:border-primary ${
        error ? "border-[#EF4444]" : "border-border"
      }`}
    >
      <Icon
        className={`h-4 w-4 shrink-0 ${
          error ? "text-[#EF4444]" : "text-muted-foreground"
        }`}
      />
      <input
        {...inputProps}
        aria-invalid={error}
        className="flex-1 min-w-0 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      {trailing}
    </div>
  );
}

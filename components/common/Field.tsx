"use client";

import { ReactNode, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * Shared form atoms ported from the new_design prototype (DESIGN.md §3,
 * prototype lines 1550–1570). Used by the migrated modals + Profile screen.
 */
export function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mb-3">
      <label className="text-xs font-semibold text-foreground">
        {required && <span className="text-coral">* </span>}
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export function FieldInput({
  icon,
  eye,
  disabled,
  ...props
}: {
  icon?: ReactNode;
  eye?: boolean;
  disabled?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  const type = eye ? (show ? "text" : "password") : props.type;
  return (
    <div
      className={`flex items-center gap-2 h-11 px-3 rounded-xl border border-border ${
        disabled ? "bg-secondary" : "bg-background"
      }`}
    >
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <input
        {...props}
        type={type}
        disabled={disabled}
        className="flex-1 bg-transparent outline-none text-sm font-sans appearance-none border-0 p-0 disabled:text-muted-foreground"
      />
      {eye && (
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="appearance-none cursor-pointer outline-none bg-transparent border-0 text-muted-foreground"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}

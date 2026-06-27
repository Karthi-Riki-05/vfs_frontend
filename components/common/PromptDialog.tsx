"use client";

import { ReactNode, useState } from "react";
import { createRoot } from "react-dom/client";
import { ModalShell, ModalHeader, ModalFooter } from "./Modal";
import { Field, FieldInput } from "./Field";

/**
 * Imperative single-input prompt — the new_design replacement for
 * `Modal.confirm({ content: <Input/> })`. Resolves the entered string on
 * confirm, or `null` on cancel/dismiss.
 *
 *   const pwd = await promptDialog({ title: "Reset password", password: true, minLength: 8 });
 *   if (pwd != null) { ... }
 */
export interface PromptOptions {
  title: string;
  label?: string;
  description?: ReactNode;
  placeholder?: string;
  /** Render the input as a password field (with show/hide toggle). */
  password?: boolean;
  /** Render a multi-line textarea instead of a single-line input. */
  multiline?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  initialValue?: string;
  required?: boolean;
  minLength?: number;
  /** Custom validator — return an error message to block, or null to allow. */
  validate?: (value: string) => string | null;
}

export function promptDialog(opts: PromptOptions): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(null);
      return;
    }
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const finish = (val: string | null) => {
      root.unmount();
      container.remove();
      resolve(val);
    };

    function Host() {
      const [value, setValue] = useState(opts.initialValue || "");
      const [error, setError] = useState<string | null>(null);

      const submit = () => {
        if (opts.required && !value.trim()) {
          setError("This field is required");
          return;
        }
        if (opts.minLength && value.length < opts.minLength) {
          setError(`Must be at least ${opts.minLength} characters`);
          return;
        }
        if (opts.validate) {
          const e = opts.validate(value);
          if (e) {
            setError(e);
            return;
          }
        }
        finish(value);
      };

      return (
        <ModalShell open onClose={() => finish(null)}>
          <ModalHeader title={opts.title} close={() => finish(null)} />
          <div className="px-5 pb-5 space-y-3">
            {opts.description && (
              <div className="text-sm text-muted-foreground">
                {opts.description}
              </div>
            )}
            <Field label={opts.label || ""}>
              {opts.multiline ? (
                <textarea
                  autoFocus
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    setError(null);
                  }}
                  placeholder={opts.placeholder}
                  className="w-full min-h-20 rounded-xl border border-border bg-background p-3 text-sm font-sans outline-none resize-none"
                />
              ) : (
                <FieldInput
                  autoFocus
                  eye={opts.password}
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    setError(null);
                  }}
                  placeholder={opts.placeholder}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
              )}
            </Field>
            {error && <div className="text-sm text-coral">{error}</div>}
          </div>
          <ModalFooter
            close={() => finish(null)}
            primary={submit}
            primaryLabel={opts.confirmLabel || "Confirm"}
            cancelLabel={opts.cancelLabel}
            danger={opts.danger}
          />
        </ModalShell>
      );
    }

    root.render(<Host />);
  });
}

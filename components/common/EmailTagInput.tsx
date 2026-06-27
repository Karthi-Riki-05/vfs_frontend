"use client";

import { KeyboardEvent, useState } from "react";
import { X } from "lucide-react";

/**
 * new_design replacement for antd's `<Select mode="tags">` email entry.
 * Type an email and press Enter/comma/space to add a chip; Backspace on an
 * empty input removes the last chip. Invalid emails are flagged coral.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EmailTagInputProps {
  value: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
}

export function EmailTagInput({
  value,
  onChange,
  placeholder,
}: EmailTagInputProps) {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const parts = raw
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const next = [...value];
    for (const p of parts) if (!next.includes(p)) next.push(p);
    onChange(next);
    setDraft("");
  };

  const remove = (email: string) => onChange(value.filter((e) => e !== email));

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (draft.trim()) add(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      remove(value[value.length - 1]);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 min-h-11 px-2 py-1.5 rounded-xl border border-border bg-background">
      {value.map((email) => {
        const valid = EMAIL_RE.test(email);
        return (
          <span
            key={email}
            className={`inline-flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-full text-xs font-medium ${
              valid ? "bg-secondary text-foreground" : "bg-coral/10 text-coral"
            }`}
          >
            {email}
            <button
              type="button"
              onClick={() => remove(email)}
              className="appearance-none cursor-pointer outline-none border-0 bg-transparent w-5 h-5 rounded-full flex items-center justify-center hover:bg-black/10"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        );
      })}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => draft.trim() && add(draft)}
        placeholder={value.length ? "" : placeholder}
        className="flex-1 min-w-[120px] bg-transparent outline-none border-0 p-0 h-7 text-sm font-sans"
      />
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * The password policy, behind an info icon instead of a permanent paragraph
 * under the field (removed 2026-08-21 — it was three lines of small grey text
 * on every signup).
 *
 * Popover, not Tooltip: Radix Tooltip opens on hover/focus only and never opens
 * on a touch tap, so on a phone the hint would be unreachable. Popover handles
 * the tap; the mouse handlers add hover for desktop.
 */
export default function PasswordHintTip() {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Password requirements"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className="appearance-none border-0 bg-transparent text-muted-foreground"
        >
          <Info className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        className="tw w-64 text-[12px] leading-relaxed text-muted-foreground"
      >
        At least 8 characters. Adding an uppercase letter, a number, and a
        symbol makes it stronger.
      </PopoverContent>
    </Popover>
  );
}


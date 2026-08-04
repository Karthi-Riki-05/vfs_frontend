"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

// Animated staged progress shown WHILE a diagram is generating. The backend
// job gives no fine-grained progress (no SSE), so these stages are client-timed
// to convey momentum — a "live" feel like Claude/Gemini without any streaming.
// It just narrates; it never claims a stage is truly complete.

const CREATE_STAGES = [
  "Understanding your request…",
  "Planning the layout…",
  "Choosing icons & colours…",
  "Drawing the diagram…",
  "Finalizing…",
];
const EDIT_STAGES = [
  "Reading your current diagram…",
  "Working out the changes…",
  "Redrawing the affected parts…",
  "Finalizing…",
];

export default function GeneratingProgress({
  isEdit = false,
}: {
  isEdit?: boolean;
}) {
  const stages = isEdit ? EDIT_STAGES : CREATE_STAGES;
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Advance through stages, then hold on the last one until the result lands
    // (this component unmounts when generation finishes).
    const id = setInterval(() => {
      setStep((s) => (s < stages.length - 1 ? s + 1 : s));
    }, 1800);
    return () => clearInterval(id);
  }, [stages.length]);

  const pct = Math.round(((step + 1) / stages.length) * 100);

  return (
    <div className="mt-2 rounded-xl border border-[#FFD9A0] bg-[#FFF8EF] p-3">
      <div className="flex items-center gap-2 text-[13px] font-medium text-foreground">
        <Loader2 className="w-4 h-4 animate-spin text-[#FF9A30]" />
        <span>{stages[step]}</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#FFE7C7]">
        <div
          className="h-full rounded-full bg-[#FF9A30] transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

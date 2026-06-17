"use client";

import { Crown } from "lucide-react";

/* Role badge — matches prototype RoleBadge tones (837-892) extended for our roles. */
export default function RoleBadge({ role }: { role: string }) {
  const r = (role || "MEMBER").toUpperCase();
  let cls = "bg-secondary text-muted-foreground";
  let label = "Member";
  if (r === "OWNER") {
    cls = "bg-[#FEF3C7] text-[#B45309]";
    label = "Owner";
  } else if (r === "ADMIN") {
    cls = "bg-secondary text-primary-deep";
    label = "Admin";
  } else if (r === "EDITOR") {
    cls = "bg-[#E2EEF8] text-blue";
    label = "Editor";
  } else if (r === "VIEWER") {
    label = "Viewer";
  }
  return (
    <span
      className={`text-[10px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${cls}`}
    >
      {r === "OWNER" && <Crown className="w-3 h-3" />}
      {label}
    </span>
  );
}

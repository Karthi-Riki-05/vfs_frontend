"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import BackButton from "@/components/shared/BackButton";

// Only the true home screens — no back button needed here.
const ROOT_PATHS = [
  "/dashboard",
  "/dashboard/pro",
  "/dashboard/team",
  // Post-checkout: router.back() would land on the expired Stripe URL.
  "/dashboard/subscription/success",
  "/upgrade-pro/success",
];

interface MobileBackButtonProps {
  /** @deprecated icon-only design — label is no longer rendered */
  label?: string;
  className?: string;
}

/**
 * Chevron back button for mobile/tablet PWA (Flutter WebView).
 * Rendered globally at the top of the mobile content area in DashboardLayout.
 * Auto-hides on root pages so it only shows on sub-pages where the user would
 * otherwise be stuck.
 */
export default function MobileBackButton({
  className = "",
}: MobileBackButtonProps) {
  const router = useRouter();
  const pathname = usePathname() || "";

  // Hide on root pages.
  if (ROOT_PATHS.some((p) => pathname === p)) return null;

  // Pages that render their OWN back control (avoid a double back button).
  // These detail pages have a built-in chevron that also works on desktop,
  // where this mobile-only global button does not render. They all render the
  // shared <BackButton>, so the size matches this one exactly.
  const OWN_BACK_PATTERNS = [
    /^\/dashboard\/projects\/[^/]+$/, // project detail (has own back button)
    /^\/dashboard\/settings\/billing$/, // billing (has own back button)
    // Settings is view-based: the hub AND each sub-view render their own back
    // button, so this global one stays out of the way on every settings screen.
    /^\/dashboard\/settings$/,
  ];
  if (OWN_BACK_PATTERNS.some((re) => re.test(pathname))) return null;

  return (
    <div className="tw" style={{ marginBottom: 12 }}>
      <BackButton onClick={() => router.back()} />
    </div>
  );
}

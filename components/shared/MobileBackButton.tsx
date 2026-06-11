"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { LeftOutlined } from "@ant-design/icons";

// Root/top-level pages reachable from the sidebar — no back button here.
const ROOT_PATHS = [
  "/dashboard",
  "/dashboard/pro",
  "/dashboard/team",
  "/dashboard/flows",
  "/dashboard/teams",
  "/dashboard/chat",
  "/dashboard/shapes",
  "/dashboard/projects",
  "/dashboard/trash",
  "/dashboard/recents",
  // Post-checkout pages: router.back() would land on the expired Stripe
  // checkout URL ("You're all done here"). Only forward nav is allowed.
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
  // where this mobile-only global button does not render.
  const OWN_BACK_PATTERNS = [
    /^\/dashboard\/projects\/[^/]+$/, // project detail
    /^\/dashboard\/teams\/[^/]+$/, // team detail
    /^\/dashboard\/shapes\/[^/]+$/, // shape group detail
  ];
  if (OWN_BACK_PATTERNS.some((re) => re.test(pathname))) return null;

  return (
    <button
      onClick={() => router.back()}
      aria-label="Go back"
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
        width: 40,
        height: 40,
        padding: 0,
        background: "#FFFFFF",
        border: "1px solid #F0F0F0",
        borderRadius: "50%",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        color: "#595959",
        cursor: "pointer",
        touchAction: "manipulation",
        WebkitTapHighlightColor: "rgba(61,179,113,0.15)",
      }}
    >
      <LeftOutlined style={{ fontSize: 16 }} />
    </button>
  );
}

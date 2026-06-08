"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Tooltip, Dropdown } from "antd";
import type { MenuProps } from "antd";
import {
  PlusOutlined,
  ProfileOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import { usePathname, useRouter } from "next/navigation";
import { createNewFlow } from "@/lib/flow";
import { useIsMobile } from "@/hooks/useMediaQuery";

const IS_EDITOR_RE = /^\/dashboard\/flows\/(?!new$)[a-zA-Z0-9_-]+$/;

// Pages where the FAB would overlap the page's primary CTA (e.g. the
// post-checkout success screen's "Go to Dashboard" button).
const HIDE_FAB_PATHS = [
  "/dashboard/subscription/success",
  "/upgrade-pro/success",
];

export default function FloatingActionButton({
  hidden = false,
}: {
  hidden?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    },
    [],
  );

  // Global keyboard shortcut: press "c" to open menu
  useEffect(() => {
    const onWindowKeyDown = (e: KeyboardEvent) => {
      if (open) return;
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key === "c" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onWindowKeyDown);
    return () => window.removeEventListener("keydown", onWindowKeyDown);
  }, [open]);

  // Hide entirely on editor pages
  if (IS_EDITOR_RE.test(pathname ?? "")) return null;
  // Hide on post-checkout success pages (would overlap the CTA)
  if (HIDE_FAB_PATHS.some((p) => (pathname ?? "").startsWith(p))) return null;

  const buttonSize = isMobile ? 48 : 48;
  const iconSize = isMobile ? 20 : 20;
  // On mobile the AI assistant button sits at bottom:24 right:20 (48px tall).
  // Stack the FAB above it: 24 + 48 + 12 = 84px from bottom.
  const bottom = isMobile ? 84 : 24;
  const right = isMobile ? 20 : 24;

  const menuItems: MenuProps["items"] = [
    {
      key: "create-flow",
      label: "Create Flow",
      icon: <ProfileOutlined style={{ color: "#3CB371", fontSize: 16 }} />,
      style: { minHeight: 44, alignItems: "center", display: "flex" },
      onClick: async () => {
        setOpen(false);
        await createNewFlow();
      },
    },
    {
      key: "create-shape",
      label: "Create Shape",
      icon: <AppstoreOutlined style={{ color: "#6366f1", fontSize: 16 }} />,
      style: { minHeight: 44, alignItems: "center", display: "flex" },
      onClick: () => {
        setOpen(false);
        router.push("/dashboard/shapes?action=new");
      },
    },
  ];

  const button = (
    <div
      role="button"
      tabIndex={0}
      aria-label="Create new"
      aria-haspopup="true"
      aria-expanded={open}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: buttonSize,
        height: buttonSize,
        borderRadius: "50%",
        background: hovered ? "#2ea562" : "#3CB371",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow:
          "0 4px 16px rgba(60,179,113,0.45), 0 2px 6px rgba(0,0,0,0.15)",
        transition: "background 0.2s ease, transform 0.2s ease",
        transform: hovered ? "scale(1.08)" : "scale(1)",
        outline: "none",
        userSelect: "none",
      }}
    >
      <PlusOutlined
        style={{
          fontSize: iconSize,
          color: "#fff",
          transition: "transform 0.25s ease",
          transform: open ? "rotate(45deg)" : "rotate(0deg)",
          display: "block",
        }}
      />
    </div>
  );

  const dropdown = (
    <Dropdown
      menu={{ items: menuItems }}
      placement="topRight"
      trigger={["click"]}
      open={open}
      onOpenChange={setOpen}
    >
      {button}
    </Dropdown>
  );

  return (
    <div
      style={{
        position: "fixed",
        bottom,
        right,
        zIndex: 1000,
        // Fade out (matching the AI button) when the mobile sidebar is open.
        opacity: hidden ? 0 : 1,
        pointerEvents: hidden ? "none" : "auto",
        transform: hidden ? "scale(0.9)" : "scale(1)",
        transition: "opacity 0.3s ease, transform 0.3s ease",
      }}
    >
      {isMobile ? (
        dropdown
      ) : (
        <Tooltip
          title="Create new flow or shape"
          placement="left"
          mouseEnterDelay={0.5}
        >
          {dropdown}
        </Tooltip>
      )}
    </div>
  );
}

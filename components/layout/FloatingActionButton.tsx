"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, FileText, Folder, Shapes } from "lucide-react";
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
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const handler = (e: Event) =>
      setSheetOpen((e as CustomEvent<boolean>).detail);
    window.addEventListener("vc:sheet-open", handler);
    return () => window.removeEventListener("vc:sheet-open", handler);
  }, []);

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
  // The AI assistant button sits bottom-right on both breakpoints (mobile 48px
  // @ bottom:24/right:20; desktop 56px @ bottom:24/right:24). Stack the FAB
  // above it: mobile 24+48+12=84, desktop 24+56+12=92.
  const bottom = isMobile ? 84 : 92;
  const right = isMobile ? 20 : 24;

  const dropdown = (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
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
            background: hovered ? "#2a9960" : "#3CB371",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 10px 24px -6px rgba(60,179,113,0.45)",
            transition: "background 0.2s ease, transform 0.2s ease",
            transform: hovered ? "scale(1.08)" : "scale(1)",
            outline: "none",
            userSelect: "none",
          }}
        >
          <Plus
            style={{
              width: iconSize,
              height: iconSize,
              color: "#fff",
              transition: "transform 0.25s ease",
              transform: open ? "rotate(45deg)" : "rotate(0deg)",
              display: "block",
            }}
          />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="tw mb-2">
        <DropdownMenuItem
          onSelect={async () => {
            setOpen(false);
            await createNewFlow();
          }}
          className="min-h-[44px]"
        >
          <FileText className="w-4 h-4 text-primary" />
          New Flow
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            setOpen(false);
            router.push("/dashboard/projects?create=1");
          }}
          className="min-h-[44px]"
        >
          <Folder className="w-4 h-4 text-[#FF9A30]" />
          New Project
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            setOpen(false);
            router.push("/dashboard/shapes?action=new");
          }}
          className="min-h-[44px]"
        >
          <Shapes className="w-4 h-4 text-[#6366f1]" />
          New Shape
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div
      style={{
        position: "fixed",
        bottom,
        right,
        zIndex: 1000,
        // Fade out (matching the AI button) when the mobile sidebar is open.
        opacity: hidden || (isMobile && sheetOpen) ? 0 : 1,
        pointerEvents: hidden || (isMobile && sheetOpen) ? "none" : "auto",
        transform:
          hidden || (isMobile && sheetOpen) ? "scale(0.9)" : "scale(1)",
        transition: "opacity 0.3s ease, transform 0.3s ease",
      }}
    >
      {isMobile ? (
        dropdown
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>{dropdown}</TooltipTrigger>
          <TooltipContent side="left" className="tw">
            Create new flow, project or shape
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

"use client";

/**
 * The ONE flow card / flow row.
 *
 * Owner decision (2026-08-09): *"all this places i need the same design and
 * options showing in dashboard/flows page must be present in above pages also,
 * in list and card view"*. Before this, five pages drew a flow five different
 * ways — `/dashboard/flows` had four bespoke renderers, `/dashboard/projects/[id]`
 * and the dashboard's Recent Documents used `FlowCard`, and trash / recents /
 * favourites each inlined their own markup. They had already drifted (the
 * desktop list row grew a favourite star the mobile one never got; only the
 * flows page ever showed "Created by X").
 *
 * This file is now the only place a flow is rendered. `/dashboard/flows` is the
 * reference design and its markup moved here verbatim, so nothing about that
 * page changed — every other surface was brought up to it.
 *
 * Desktop vs mobile is decided here, not by the caller: the two have different
 * column counts and different thumbnail treatments (mobile tints by row index,
 * desktop uses the brand wash), and making each page pick would reintroduce the
 * drift this replaces.
 */

import React from "react";
import { MoreHorizontal, Star, Lock } from "lucide-react";
import MiniFlow from "@/components/dashboard/MiniFlow";
import SharedWithAvatars from "@/components/flows/SharedWithAvatars";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { BRAND_GREEN } from "@/lib/theme";

const MOBILE_THUMB_GRADIENTS = [
  "linear-gradient(135deg, #E7F6F0 0%, #CFEDE0 100%)",
  "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)",
  "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)",
];

/**
 * Relative time as the flows page words it ("5 mins ago", "3 days ago", then an
 * absolute date). Deliberately NOT `lib/flowUtils.timeAgo`, which is the terse
 * "5m ago" form used elsewhere; adopting that here would silently restyle the
 * reference design.
 */
export function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} mins ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * "Created by X" attribution. Shows the creator's face when the API sends one
 * (`createdByImage` = `image || photo` — the OAuth field or the in-app upload),
 * initials otherwise.
 *
 * Rendered only where `createdBySelf` is false. The server sets that flag on
 * exactly the rows where it is true, so no page needs a `showCreator` prop:
 * ALL FLOWS is member-created by definition, MY FLOWS never is, and the
 * project-detail list is mixed — which is precisely where attribution was
 * missing before this component existed.
 */
export function CreatedByLine({ flow }: { flow: any }) {
  const name = flow.createdByName || "Member";
  // Size via INLINE STYLE, not `w-4 h-4`. globals.css has an UNLAYERED
  // `img { height: auto }`, and an unlayered rule beats every @layer — including
  // Tailwind's utilities — so `h-4` loses and the avatar renders at its natural
  // aspect ratio. Caught live: a 28×200 upload came out 16px wide and 114px
  // tall, stretching the card.
  const chip: React.CSSProperties = { width: 16, height: 16 };
  return (
    <div
      className="flex items-center gap-1.5 mt-1"
      title={`Created by ${name}`}
    >
      {flow.createdByImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={flow.createdByImage}
          alt=""
          style={chip}
          className="rounded-full object-cover shrink-0"
        />
      ) : (
        <span
          className="rounded-full shrink-0 flex items-center justify-center text-[8px] font-bold text-white"
          style={{ ...chip, background: BRAND_GREEN }}
        >
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="text-[11px] truncate" style={{ color: "var(--blue)" }}>
        Created by {name}
      </span>
    </div>
  );
}

export interface FlowCollectionProps {
  flows: any[];
  view: "grid" | "list";
  /** Row/card click — opens the flow. */
  onOpen: (id: string, flow: any) => void;
  /** ⋯ button click. Omit only when `renderActions` supplies its own control. */
  onMenu?: (flow: any) => void;
  /**
   * Replaces the ⋯ button entirely. Trash uses it for Restore / Delete forever,
   * which are not FlowMenuModal actions.
   */
  renderActions?: (flow: any) => React.ReactNode;
  /** Draws the lock overlay on every thumbnail (over-limit state). */
  isLocked?: boolean;
  /** "+ New Flow" placeholder tile. Grid view only, and only where creating
   *  a flow in place makes sense (MY FLOWS). */
  newTile?: boolean;
  onNewFlow?: () => void;
  /** Secondary line under the name. Defaults to "Edited <relative time>". */
  metaLabel?: (flow: any) => string;
}

const defaultMeta = (flow: any) => `Edited ${timeAgo(flow.updatedAt)}`;

export default function FlowCollection({
  flows,
  view,
  onOpen,
  onMenu,
  renderActions,
  isLocked = false,
  newTile = false,
  onNewFlow,
  metaLabel = defaultMeta,
}: FlowCollectionProps) {
  const isMobile = useIsMobile();

  const locked = (flow: any) => isLocked || !!flow?.markedForDowngrade;

  // Compact ⋯ used inside cards; the row variant is a touch larger.
  const actions = (flow: any, size: "sm" | "md") => {
    if (renderActions) return renderActions(flow);
    if (!onMenu) return null;
    const box = size === "sm" ? "w-7 h-7" : "w-9 h-9";
    const icon = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
    return (
      <button
        aria-label={`Actions for ${flow?.name || "flow"}`}
        onClick={(e) => {
          e.stopPropagation();
          onMenu(flow);
        }}
        className={`${box} rounded-lg flex items-center justify-center border-0 p-0 appearance-none cursor-pointer bg-secondary hover:bg-border transition`}
      >
        <MoreHorizontal className={`${icon} text-muted-foreground`} />
      </button>
    );
  };

  const body = (flow: any, nameClass: string, withStar: boolean) => (
    <>
      <div
        className={`${nameClass} truncate text-foreground flex items-center gap-1`}
      >
        {flow.name}
        {withStar && flow.isFavorite && (
          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 shrink-0" />
        )}
      </div>
      <div className="text-[11px] text-muted-foreground">{metaLabel(flow)}</div>
      <SharedWithAvatars users={flow.sharedWith} total={flow.shareCount} />
      {!flow.createdBySelf && flow.createdByName && (
        <CreatedByLine flow={flow} />
      )}
    </>
  );

  const thumb = (flow: any, className: string, style: React.CSSProperties) => (
    <div className={className} style={style}>
      {flow.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={flow.thumbnail}
          alt={flow?.name ? `${flow.name} thumbnail` : "Flow thumbnail"}
          className="w-full h-full object-contain"
        />
      ) : (
        <MiniFlow color={BRAND_GREEN} />
      )}
      {locked(flow) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/40 backdrop-blur-[1px]">
          <Lock className="w-6 h-6 text-white drop-shadow" />
          <span className="text-white text-[10px] font-semibold drop-shadow">
            Locked
          </span>
        </div>
      )}
    </div>
  );

  const newTileEl = newTile && onNewFlow && (
    <div
      onClick={onNewFlow}
      className="border-2 border-dashed border-border rounded-2xl h-44 flex flex-col items-center justify-center bg-background cursor-pointer gap-1"
    >
      <span className="text-2xl text-primary font-bold">+</span>
      <span className="text-sm font-semibold text-primary">New Flow</span>
    </div>
  );

  // ── List (desktop and mobile share the row; only the thumbnail tint and the
  //    favourite star differ, exactly as the reference design had them) ───────
  if (view === "list") {
    return (
      <div className={isMobile ? "mt-3 space-y-2" : "space-y-2"}>
        {flows.map((flow: any, index: number) => (
          <div
            key={flow.id}
            className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border shadow-[var(--shadow-card)]"
          >
            <div
              className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center cursor-pointer"
              style={{
                background: isMobile
                  ? MOBILE_THUMB_GRADIENTS[
                      index % MOBILE_THUMB_GRADIENTS.length
                    ]
                  : `${BRAND_GREEN}1a`,
              }}
              onClick={() => onOpen(flow.id, flow)}
            >
              {flow.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={flow.thumbnail}
                  alt={flow?.name ? `${flow.name} thumbnail` : "Flow thumbnail"}
                  className="w-full h-full object-contain"
                />
              ) : (
                <MiniFlow color={BRAND_GREEN} />
              )}
              {locked(flow) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                  <Lock className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => onOpen(flow.id, flow)}
            >
              {body(flow, "font-semibold text-sm", !isMobile)}
            </div>
            {actions(flow, isMobile ? "md" : "sm")}
          </div>
        ))}
      </div>
    );
  }

  // ── Grid ──────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-3">
        {flows.map((flow: any, index: number) => (
          <div
            key={flow.id}
            className="relative rounded-2xl bg-card border border-border overflow-hidden shadow-[var(--shadow-card)]"
          >
            <button
              onClick={() => onOpen(flow.id, flow)}
              className="w-full text-left bg-transparent border-0 p-0 appearance-none cursor-pointer"
            >
              {thumb(
                flow,
                "h-36 w-full relative overflow-hidden flex items-center justify-center text-3xl",
                {
                  background:
                    MOBILE_THUMB_GRADIENTS[
                      index % MOBILE_THUMB_GRADIENTS.length
                    ],
                },
              )}
              <div className="p-3 pr-9">
                {body(flow, "font-semibold text-[13px]", false)}
              </div>
            </button>
            <div className="absolute bottom-2 right-2">
              {actions(flow, "sm")}
            </div>
          </div>
        ))}
        {newTileEl}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
      {flows.map((flow: any) => (
        <div
          key={flow.id}
          className="relative rounded-2xl bg-card border border-border overflow-hidden shadow-[var(--shadow-card)] hover:-translate-y-0.5 transition"
        >
          <button
            onClick={() => onOpen(flow.id, flow)}
            className="w-full text-left appearance-none border-0 p-0 bg-transparent cursor-pointer"
          >
            {thumb(
              flow,
              "h-28 relative flex items-center justify-center overflow-hidden",
              { background: `${BRAND_GREEN}14` },
            )}
            <div className="p-3 pr-10">
              {body(flow, "font-semibold text-[13px]", true)}
            </div>
          </button>
          <div className="absolute bottom-2 right-2">{actions(flow, "sm")}</div>
        </div>
      ))}
      {newTileEl}
    </div>
  );
}

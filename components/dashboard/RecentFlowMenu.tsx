"use client";

/**
 * RecentFlowMenu — the three-dot (⋯) options menu for a "recent flow" card on
 * the Pro / Team dashboards (bug B19/B25). The dashboards render their own
 * bespoke recent-flow cards (a MiniFlow strip) that previously had NO menu, so
 * rename/delete/duplicate/favourite forced a detour to the My Flows page. This
 * overlays the same actions those cards were missing.
 *
 * Design: this shares the *logic* (menu + mutation handlers + rename/assign
 * modals), NOT the card visual — each dashboard keeps its own card markup and
 * just drops <RecentFlowMenu> into the thumbnail corner + renders the hook's
 * {modals} once. Mutations refresh the dashboard via the `onChanged` callback
 * (wire it to useDashboard().refresh) — the flow list lives in a different hook
 * (useDashboard), so we call the API directly instead of reusing useFlows.
 */

import React from "react";
import {
  MoreVertical,
  Pencil,
  PenLine,
  Heart,
  FolderInput,
  Copy,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { flowsApi } from "@/api/flows.api";
import api from "@/lib/axios";
import {
  ModalShell,
  ModalHeader,
  ModalFooter,
} from "@/components/common/Modal";
import { Field, FieldInput } from "@/components/common/Field";
import AssignProjectModal from "@/components/flows/AssignProjectModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface RecentFlowLite {
  id: string;
  name: string;
  isFavorite?: boolean;
  projectId?: string | null;
}

export function RecentFlowMenu({
  flow,
  onChanged,
  onRename,
  onAssign,
  locked = false,
  onEdit,
}: {
  flow: RecentFlowLite;
  /** Refresh the dashboard's recent-flows list after a mutation. */
  onChanged: () => void;
  onRename: (flow: RecentFlowLite) => void;
  onAssign: (flow: RecentFlowLite) => void;
  /** When locked, all items except Delete are suppressed (matches FlowMenuModal). */
  locked?: boolean;
  /** Override the Edit action — the dashboards pass a gated open that shows the lock modal. */
  onEdit?: (flow: RecentFlowLite) => void;
}) {
  const openEditor = () =>
    onEdit
      ? onEdit(flow)
      : window.open(`/dashboard/flows/${flow.id}`, "_blank");

  const favorite = async () => {
    try {
      await flowsApi.toggleFavorite(flow.id, !flow.isFavorite);
      onChanged();
    } catch {
      toast.error("Failed to update favorite");
    }
  };
  const duplicate = async () => {
    try {
      await flowsApi.duplicate(flow.id);
      toast.success("Flow duplicated");
      onChanged();
    } catch {
      toast.error("Failed to duplicate flow");
    }
  };
  const remove = async () => {
    try {
      await flowsApi.delete(flow.id);
      toast.success("Flow deleted");
      onChanged();
    } catch {
      toast.error("Failed to delete flow");
    }
  };

  return (
    // stopPropagation so opening the menu never triggers the card's open-in-editor click
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Flow options"
            className="tw appearance-none cursor-pointer outline-none border-0 w-7 h-7 rounded-lg bg-white/90 backdrop-blur flex items-center justify-center text-muted-foreground hover:bg-white shadow-sm"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="tw">
          {!locked && (
            <>
              <DropdownMenuItem onSelect={openEditor}>
                <Pencil className="w-4 h-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={favorite}>
                <Heart
                  className={`w-4 h-4 ${flow.isFavorite ? "fill-current text-[#FF4D6A]" : ""}`}
                />
                {flow.isFavorite ? "Remove Favorite" : "Mark as Favorite"}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onRename(flow)}>
                <PenLine className="w-4 h-4" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onAssign(flow)}>
                <FolderInput className="w-4 h-4" /> Assign to Project
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={duplicate}>
                <Copy className="w-4 h-4" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            onSelect={remove}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/**
 * Owns the Rename + Assign-to-Project modals so both dashboards share one
 * instance each (not one per card). Render {modals} once in the page and pass
 * openRename/openAssign to every <RecentFlowMenu>.
 */
export function useRecentFlowModals(onChanged: () => void) {
  const [rename, setRename] = React.useState<{
    open: boolean;
    id: string;
    name: string;
  }>({ open: false, id: "", name: "" });
  const [assign, setAssign] = React.useState<{
    open: boolean;
    flowId: string | null;
    currentProjectId?: string | null;
  }>({ open: false, flowId: null });

  const openRename = (flow: RecentFlowLite) =>
    setRename({ open: true, id: flow.id, name: flow.name });
  const openAssign = (flow: RecentFlowLite) =>
    setAssign({
      open: true,
      flowId: flow.id,
      currentProjectId: flow.projectId ?? null,
    });
  const closeRename = () => setRename({ open: false, id: "", name: "" });

  const saveRename = async () => {
    if (!rename.name.trim()) return;
    try {
      await api.put(`/flows/${rename.id}`, { name: rename.name.trim() });
      toast.success("Flow renamed");
      closeRename();
      onChanged();
    } catch {
      toast.error("Failed to rename flow");
    }
  };

  const modals = (
    <>
      <ModalShell open={rename.open} onClose={closeRename}>
        <ModalHeader title="Rename Flow" close={closeRename} />
        <div className="px-5 pb-5">
          <Field label="New name" required>
            <FieldInput
              autoFocus
              maxLength={255}
              value={rename.name}
              onChange={(e) => setRename({ ...rename, name: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && saveRename()}
            />
          </Field>
        </div>
        <ModalFooter
          close={closeRename}
          primary={saveRename}
          primaryLabel="Save"
          disabled={!rename.name.trim()}
        />
      </ModalShell>
      <AssignProjectModal
        open={assign.open}
        flowId={assign.flowId}
        currentProjectId={assign.currentProjectId}
        onClose={() => setAssign({ open: false, flowId: null })}
        onSuccess={onChanged}
      />
    </>
  );

  return { openRename, openAssign, modals };
}

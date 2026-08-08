"use client";

/**
 * The ONE flow option set: Edit · Favourite · Rename · Assign to Project ·
 * Share · Duplicate · Delete.
 *
 * Owner decision (2026-08-09): the same options must be present on every page
 * that lists flows, not just `/dashboard/flows`. Before this, favourites offered
 * two of the seven (Edit, Remove from Favourites), project detail and Recent
 * Documents offered whatever `FlowCard` happened to build, and recents had its
 * own copy of the modals. Same object, four different capability sets.
 *
 * This hook owns the menu, the three modals behind it, and the mutations. A page
 * wires it in three lines:
 *
 *   const actions = useFlowActions({ onChanged: refetch, onEdit: open });
 *   <FlowCollection … onMenu={actions.openMenu} />
 *   {actions.modals}
 *
 * `/dashboard/flows` keeps its own wiring: its mutations come from `useFlows`
 * and update that hook's list optimistically, which this hook cannot do from
 * outside. The menu and modals it renders are the same components, so the two
 * paths stay visually identical — but the reference page was left alone rather
 * than rewritten under a refactor whose point was to change nothing about it.
 */

import React, { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { flowsApi } from "@/api/flows.api";
import {
  ModalShell,
  ModalHeader,
  ModalFooter,
} from "@/components/common/Modal";
import { Field, FieldInput } from "@/components/common/Field";
import FlowMenuModal from "@/components/flows/FlowMenuModal";
import ShareFlowModal from "@/components/flows/ShareFlowModal";
import AssignProjectModal from "@/components/flows/AssignProjectModal";

interface UseFlowActionsOptions {
  /** Refetch the page's list after any mutation. */
  onChanged: () => void;
  /** Open the flow. The page decides the target (new tab, router push, …). */
  onEdit: (id: string, flow: any) => void;
  /** Over-limit lock — greys out Edit in the menu, same as the flows page. */
  isLocked?: boolean;
  /** Hide Share when the plan has no sharing entitlement. */
  canShare?: boolean;
  /** Page-specific menu entries appended to the standard seven. */
  extraItems?: (flow: any) => {
    key: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    danger?: boolean;
  }[];
}

export function useFlowActions({
  onChanged,
  onEdit,
  isLocked = false,
  canShare = true,
  extraItems,
}: UseFlowActionsOptions) {
  const [flowMenu, setFlowMenu] = useState<{ open: boolean; flow: any | null }>(
    {
      open: false,
      flow: null,
    },
  );
  const [renameModal, setRenameModal] = useState<{
    open: boolean;
    id: string;
    name: string;
  }>({ open: false, id: "", name: "" });
  const [assignModal, setAssignModal] = useState<{
    open: boolean;
    flowId: string | null;
    currentProjectId?: string | null;
  }>({ open: false, flowId: null });
  const [shareModal, setShareModal] = useState<{
    open: boolean;
    flow: any | null;
  }>({ open: false, flow: null });

  const openMenu = useCallback(
    (flow: any) => setFlowMenu({ open: true, flow }),
    [],
  );
  const closeRename = () => setRenameModal({ open: false, id: "", name: "" });

  const handleRename = async () => {
    if (!renameModal.name.trim()) return;
    try {
      await flowsApi.update(renameModal.id, { name: renameModal.name.trim() });
      toast.success("Flow renamed");
      closeRename();
      onChanged();
    } catch {
      toast.error("Failed to rename flow");
    }
  };

  const duplicateFlow = async (id: string) => {
    try {
      await flowsApi.duplicate(id);
      toast.success("Flow duplicated");
      onChanged();
    } catch {
      toast.error("Failed to duplicate flow");
    }
  };

  const deleteFlow = async (id: string) => {
    try {
      await flowsApi.delete(id);
      toast.success("Flow deleted");
      onChanged();
    } catch {
      toast.error("Failed to delete flow");
    }
  };

  const favoriteFlow = async (flow: any) => {
    try {
      await flowsApi.toggleFavorite(flow.id, !flow.isFavorite);
      onChanged();
    } catch {
      toast.error("Failed to update favorite");
    }
  };

  const modals = useMemo(
    () => (
      <>
        <ModalShell open={renameModal.open} onClose={closeRename}>
          <ModalHeader title="Rename Flow" close={closeRename} />
          <div className="px-5 pb-5">
            <Field label="New name" required>
              <FieldInput
                autoFocus
                maxLength={255}
                value={renameModal.name}
                onChange={(e) =>
                  setRenameModal({ ...renameModal, name: e.target.value })
                }
                onKeyDown={(e) => e.key === "Enter" && handleRename()}
              />
            </Field>
          </div>
          <ModalFooter
            close={closeRename}
            primary={handleRename}
            primaryLabel="Save"
            disabled={!renameModal.name.trim()}
          />
        </ModalShell>

        <AssignProjectModal
          open={assignModal.open}
          flowId={assignModal.flowId}
          currentProjectId={assignModal.currentProjectId}
          onClose={() => setAssignModal({ open: false, flowId: null })}
          onSuccess={onChanged}
        />

        <ShareFlowModal
          open={shareModal.open}
          flow={shareModal.flow}
          onClose={() => setShareModal({ open: false, flow: null })}
          onSuccess={onChanged}
        />

        <FlowMenuModal
          open={flowMenu.open}
          flow={flowMenu.flow}
          locked={isLocked || !!flowMenu.flow?.markedForDowngrade}
          onClose={() => setFlowMenu({ open: false, flow: null })}
          onEdit={() => onEdit(flowMenu.flow.id, flowMenu.flow)}
          onToggleFavorite={() => favoriteFlow(flowMenu.flow)}
          onRename={() =>
            setRenameModal({
              open: true,
              id: flowMenu.flow.id,
              name: flowMenu.flow.name,
            })
          }
          onAssign={() =>
            setAssignModal({
              open: true,
              flowId: flowMenu.flow.id,
              currentProjectId: flowMenu.flow.projectId,
            })
          }
          onShare={
            canShare
              ? () => setShareModal({ open: true, flow: flowMenu.flow })
              : undefined
          }
          onDuplicate={() => duplicateFlow(flowMenu.flow.id)}
          onDelete={() => deleteFlow(flowMenu.flow.id)}
          extraItems={
            extraItems && flowMenu.flow ? extraItems(flowMenu.flow) : []
          }
        />
      </>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      flowMenu,
      renameModal,
      assignModal,
      shareModal,
      isLocked,
      canShare,
      extraItems,
    ],
  );

  return { openMenu, modals };
}

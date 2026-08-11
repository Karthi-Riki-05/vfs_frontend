"use client";

/**
 * Am I the OWNER of the workspace I am currently standing in?
 *
 * Under owner-as-workspace (2026-08-07) a workspace id IS its owner's user id,
 * so this is an id comparison. A null `activeTeamId` means the personal context
 * — your own workspace — where you are the owner by definition.
 *
 * bug-122: plan limits and billing belong to the workspace OWNER. `createFlow`
 * reads the owner's plan columns, so a member inside someone else's workspace
 * is capped by that owner's plan and can do nothing about it. The flows page
 * nevertheless showed them "You've reached your 10-flow limit" with
 * "Subscribe Standard — 100 Flows" / "Buy More Flows" — and the checkout
 * endpoints credit `req.user.id`, the CALLER. A member who clicked would have
 * bought an add-on for their OWN account while the workspace stayed capped:
 * money spent, nothing gained.
 *
 * Deliberately a CLIENT-side gate only. Nothing is being granted here, so there
 * is no server rule to enforce (a member buying Pro for themselves is perfectly
 * legitimate — it just does not lift this workspace's cap). What was wrong was
 * offering it as the remedy for someone else's limit.
 */

import { useSession } from "next-auth/react";
import { useAppContext } from "@/context/AppContext";

export function useIsWorkspaceOwner(): boolean {
  const { activeTeamId } = useAppContext();
  const { data: session } = useSession();
  // Read the id from the session rather than `users/me`: it is already in the
  // JWT, so this costs no request and is available before any fetch resolves.
  const myId = (session?.user as any)?.id as string | undefined;
  if (!activeTeamId) return true; // personal context — your own workspace
  if (!myId) return false; // not known yet → assume member, hide the CTA
  return activeTeamId === myId;
}

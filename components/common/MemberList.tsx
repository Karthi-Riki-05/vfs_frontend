"use client";

import { useState } from "react";
import { UserPlus, Trash2, User } from "lucide-react";
import { FieldInput } from "./Field";

/**
 * new_design replacement for the antd `List` + `Avatar` member panels used in
 * the team / chat-group edit modals. The parent maps its raw members into
 * `MemberRow[]` and supplies `onAdd` / `onRemove` (omit either to hide that
 * affordance). Admin rows are never removable.
 */

export interface MemberRow {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
}

interface MemberListProps {
  members: MemberRow[];
  onAdd?: (email: string) => Promise<void> | void;
  onRemove?: (id: string) => void;
  adding?: boolean;
  canManage?: boolean;
  emptyText?: string;
}

export function MemberList({
  members,
  onAdd,
  onRemove,
  adding = false,
  canManage = true,
  emptyText = "No members yet",
}: MemberListProps) {
  const [email, setEmail] = useState("");

  const submit = async () => {
    const e = email.trim();
    if (!e || !onAdd) return;
    await onAdd(e);
    setEmail("");
  };

  return (
    <div>
      {canManage && onAdd && (
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1">
            <FieldInput
              placeholder="Add member by email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={adding || !email.trim()}
            className="appearance-none cursor-pointer outline-none h-11 px-4 rounded-xl border border-border bg-card font-semibold text-sm inline-flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <UserPlus className="w-4 h-4" /> {adding ? "…" : "Add"}
          </button>
        </div>
      )}
      <div className="max-h-56 overflow-y-auto">
        {members.length === 0 ? (
          <div className="text-sm text-muted-foreground py-3 text-center">
            {emptyText}
          </div>
        ) : (
          members.map((m) => {
            const isAdmin = (m.role || "").toLowerCase() === "admin";
            return (
              <div key={m.id} className="flex items-center gap-3 py-2">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 text-muted-foreground">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {m.name || m.email}
                    {isAdmin && (
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        (admin)
                      </span>
                    )}
                  </div>
                  {m.name && m.email && (
                    <div className="text-xs text-muted-foreground truncate">
                      {m.email}
                    </div>
                  )}
                </div>
                {canManage && onRemove && !isAdmin && (
                  <button
                    type="button"
                    onClick={() => onRemove(m.id)}
                    className="appearance-none cursor-pointer outline-none border-0 bg-transparent w-8 h-8 rounded-full flex items-center justify-center text-coral hover:bg-coral/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

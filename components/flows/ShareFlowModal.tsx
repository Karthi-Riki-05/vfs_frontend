"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Select, Button, Spin, message } from "antd";
import {
  Share2,
  Mail,
  Search,
  Plus,
  Crown,
  Trash2,
  Pencil,
  Lock,
} from "lucide-react";
import {
  ModalShell,
  ModalHeader,
  ModalFooter,
} from "@/components/common/Modal";
import { Field, FieldInput } from "@/components/common/Field";
import { flowsApi } from "@/api/flows.api";

interface ShareFlowModalProps {
  open: boolean;
  flow: { id: string; name: string } | null;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ShareMember {
  id: string;
  name: string;
  email: string;
  image?: string;
}

interface ExistingShare {
  id: string;
  permission: string;
  sharedWith: ShareMember;
  createdAt: string;
}

const PERM_OPTIONS = [
  { label: "View", value: "view" },
  { label: "Edit", value: "edit" },
];

function InitialAvatar({ name, email }: { name?: string; email?: string }) {
  return (
    <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shrink-0">
      {(name || email || "?").charAt(0).toUpperCase()}
    </div>
  );
}

export default function ShareFlowModal({
  open,
  flow,
  onClose,
  onSuccess,
}: ShareFlowModalProps) {
  const [shares, setShares] = useState<ExistingShare[]>([]);
  const [allMembers, setAllMembers] = useState<ShareMember[]>([]);
  const [isProUser, setIsProUser] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [sharingUser, setSharingUser] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Record<string, string>>({});

  // Pro email invite state
  const [emailInput, setEmailInput] = useState("");
  const [emailPermission, setEmailPermission] = useState("view");
  const [emailSharing, setEmailSharing] = useState(false);

  const loadData = useCallback(async () => {
    if (!flow) return;
    setLoading(true);
    try {
      const [sharesRes, membersRes] = await Promise.all([
        flowsApi.getShares(flow.id),
        flowsApi.getAvailableShareMembers(),
      ]);
      const sharesList = sharesRes.data?.data || [];
      setShares(Array.isArray(sharesList) ? sharesList : []);

      const membersData = membersRes.data?.data;
      if (
        membersData &&
        typeof membersData === "object" &&
        "members" in membersData
      ) {
        setAllMembers(
          Array.isArray(membersData.members) ? membersData.members : [],
        );
        setIsProUser(!!membersData.isProUser);
      } else {
        setAllMembers(Array.isArray(membersData) ? membersData : []);
        setIsProUser(false);
      }
    } catch {
      message.error("Failed to load share data");
    } finally {
      setLoading(false);
    }
  }, [flow]);

  useEffect(() => {
    if (open && flow) {
      loadData();
      setSearch("");
      setPermissions({});
      setEmailInput("");
      setEmailPermission("view");
    }
  }, [open, flow, loadData]);

  const sharedIds = new Set(shares.map((s) => s.sharedWith?.id));
  const availableMembers = allMembers.filter((m) => !sharedIds.has(m.id));
  const filteredMembers = availableMembers.filter(
    (m) =>
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleShare = async (userId: string) => {
    if (!flow) return;
    const perm = permissions[userId] || "view";
    setSharingUser(userId);
    try {
      await flowsApi.shareFlow(flow.id, [{ userId, permission: perm }]);
      message.success("Flow shared");
      await loadData();
      onSuccess?.();
    } catch {
      message.error("Failed to share flow");
    } finally {
      setSharingUser(null);
    }
  };

  const handleShareByEmail = async () => {
    if (!flow || !emailInput.trim()) return;
    const emails = emailInput
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (emails.length === 0) return;

    setEmailSharing(true);
    try {
      const sharePayload = emails.map((email) => ({
        email,
        permission: emailPermission,
      }));
      const res = await flowsApi.shareFlow(flow.id, sharePayload);
      const results: { email?: string; error?: string; success?: boolean }[] =
        res.data?.data || [];

      const successes = results.filter((r) => r.success);
      const failures = results.filter((r) => r.error);

      if (successes.length > 0) {
        message.success(
          `Flow shared with ${successes.length} user${
            successes.length > 1 ? "s" : ""
          }`,
        );
      }
      failures.forEach((f) => {
        if (f.error === "USER_NOT_FOUND") {
          message.error(`User not found: ${f.email}`);
        } else {
          message.error(f.error || "Failed to share");
        }
      });

      setEmailInput("");
      await loadData();
      if (successes.length > 0) onSuccess?.();
    } catch {
      message.error("Failed to share flow");
    } finally {
      setEmailSharing(false);
    }
  };

  const handleChangePermission = async (
    shareId: string,
    newPermission: string,
  ) => {
    if (!flow) return;
    try {
      await flowsApi.updateShare(flow.id, shareId, newPermission);
      message.success("Permission updated");
      await loadData();
    } catch {
      message.error("Failed to update permission");
    }
  };

  const handleRemove = async (shareId: string) => {
    if (!flow) return;
    try {
      await flowsApi.removeShare(flow.id, shareId);
      message.success("Access removed");
      await loadData();
      onSuccess?.();
    } catch {
      message.error("Failed to remove access");
    }
  };

  const shareLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/flows/view/${flow?.id}`
      : "";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      message.success("Link copied");
    } catch {
      message.error("Failed to copy");
    }
  };

  return (
    <ModalShell open={open} onClose={onClose}>
      <ModalHeader title="Share Flow" close={onClose} />

      <div className="px-5 -mt-1 mb-3">
        <div className="text-xs text-muted-foreground">
          Sharing{" "}
          <span className="font-semibold text-foreground">{flow?.name}</span>
        </div>
      </div>

      <div className="px-5 pb-2 space-y-4">
        {/* Anyone with the link row — always visible */}
        <div className="rounded-xl border border-border p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary-tint text-primary-deep flex items-center justify-center shrink-0">
            <Share2 className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">Anyone with the link</div>
            <div className="text-[11px] text-muted-foreground truncate">
              {shareLink}
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="appearance-none cursor-pointer outline-none border-0 bg-transparent text-xs font-bold text-primary-deep shrink-0"
          >
            Copy
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Spin />
          </div>
        ) : (
          <>
            {/* Invite people */}
            {isProUser && (
              <div className="space-y-2">
                <label className="text-xs font-semibold">Invite people</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <FieldInput
                      placeholder="email@example.com"
                      icon={<Mail className="w-4 h-4" />}
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleShareByEmail()
                      }
                    />
                  </div>
                  <Select
                    value={emailPermission}
                    onChange={setEmailPermission}
                    style={{ width: 84 }}
                    getPopupContainer={(t) => t.parentElement || document.body}
                    popupMatchSelectWidth={false}
                    options={PERM_OPTIONS}
                  />
                  <button
                    type="button"
                    onClick={handleShareByEmail}
                    disabled={!emailInput.trim() || emailSharing}
                    className="appearance-none cursor-pointer outline-none border-0 h-11 px-4 rounded-xl bg-primary text-white font-bold text-sm inline-flex items-center gap-1 disabled:opacity-60"
                  >
                    <Plus className="w-4 h-4" /> Invite
                  </button>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground rounded-xl bg-secondary px-3 py-2">
                  <Crown className="w-3.5 h-3.5 text-[#B45309]" />
                  Pro feature — share with any ValueChart user by email.
                </div>
              </div>
            )}

            {/* Team members list */}
            {(availableMembers.length > 0 || !isProUser) && (
              <div className="space-y-2">
                <label className="text-xs font-semibold">
                  Share with team members
                </label>
                <FieldInput
                  placeholder="Search members…"
                  icon={<Search className="w-4 h-4" />}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="max-h-52 overflow-y-auto space-y-1.5">
                  {filteredMembers.length === 0 ? (
                    <div className="py-6 text-center text-[13px] text-muted-foreground">
                      {isProUser
                        ? "No team members available"
                        : "No team members available — upgrade to Pro to share with any user"}
                    </div>
                  ) : (
                    filteredMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between gap-2 rounded-xl bg-background p-2.5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <InitialAvatar
                            name={member.name}
                            email={member.email}
                          />
                          <div className="min-w-0">
                            <div className="text-[13px] font-semibold truncate">
                              {member.name || "Unknown"}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {member.email}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Select
                            size="small"
                            value={permissions[member.id] || "view"}
                            onChange={(v) =>
                              setPermissions((p) => ({ ...p, [member.id]: v }))
                            }
                            style={{ width: 80 }}
                            getPopupContainer={(t) =>
                              t.parentElement || document.body
                            }
                            popupMatchSelectWidth={false}
                            options={PERM_OPTIONS}
                          />
                          <Button
                            type="primary"
                            size="small"
                            loading={sharingUser === member.id}
                            onClick={() => handleShare(member.id)}
                            style={{
                              backgroundColor: "#34A881",
                              borderColor: "#34A881",
                            }}
                          >
                            Share
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Currently shared */}
            {shares.length > 0 && (
              <div className="space-y-2 border-t border-border pt-4">
                <label className="text-xs font-semibold">
                  Currently shared with
                </label>
                <div className="max-h-52 overflow-y-auto space-y-1.5">
                  {shares.map((share) => (
                    <div
                      key={share.id}
                      className="flex items-center justify-between gap-2 rounded-xl bg-secondary p-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <InitialAvatar
                          name={share.sharedWith?.name}
                          email={share.sharedWith?.email}
                        />
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold truncate">
                            {share.sharedWith?.name || "Unknown"}
                          </div>
                          <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                            {share.permission === "edit" ? (
                              <>
                                <Pencil className="w-3 h-3" /> Can edit
                              </>
                            ) : (
                              <>
                                <Lock className="w-3 h-3" /> View only
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Select
                          size="small"
                          value={share.permission}
                          onChange={(v) => handleChangePermission(share.id, v)}
                          style={{ width: 80 }}
                          getPopupContainer={(t) =>
                            t.parentElement || document.body
                          }
                          popupMatchSelectWidth={false}
                          options={PERM_OPTIONS}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemove(share.id)}
                          className="appearance-none cursor-pointer outline-none border-0 bg-transparent w-8 h-8 rounded-lg hover:bg-card flex items-center justify-center text-coral"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <ModalFooter close={onClose} primary={onClose} primaryLabel="Done" />
    </ModalShell>
  );
}

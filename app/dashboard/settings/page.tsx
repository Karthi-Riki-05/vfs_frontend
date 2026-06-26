"use client";

import React, { useState, useEffect, type ReactNode } from "react";
import { Upload, message, Modal, Spin, Input } from "antd";
import { signOut } from "next-auth/react";
import { accountApi } from "@/api/account.api";
import {
  Camera,
  Users,
  Mail,
  Phone,
  ChevronRight,
  Lock,
  ShieldCheck,
  Bell,
  LogOut,
  ArrowLeft,
  Upload as UploadIcon,
  Trash2,
  Eye,
  EyeOff,
  CreditCard,
} from "lucide-react";
import api from "@/lib/axios";
import { useAuth } from "@/hooks/useAuth";
import { useAi } from "@/hooks/useAi";
import { useSubscription } from "@/hooks/useSubscription";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/logout";

const RESET = "appearance-none cursor-pointer outline-none";

type View = "hub" | "edit" | "password";

/* ---------- local prototype atoms ---------- */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1 mt-4 mb-2">
      {children}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mb-3">
      <label className="text-xs font-semibold text-foreground">
        {required && <span className="text-coral">* </span>}
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function FieldInput({
  icon,
  eye,
  disabled,
  ...props
}: {
  icon?: ReactNode;
  eye?: boolean;
  disabled?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  const type = eye ? (show ? "text" : "password") : props.type;
  return (
    <div
      className={`flex items-center gap-2 h-11 px-3 rounded-xl border border-border ${
        disabled ? "bg-secondary" : "bg-background"
      }`}
    >
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <input
        {...props}
        type={type}
        disabled={disabled}
        className="flex-1 bg-transparent outline-none text-sm appearance-none border-0 p-0 disabled:text-muted-foreground"
      />
      {eye && (
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className={`${RESET} bg-transparent border-0 text-muted-foreground`}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { user, isAdmin } = useAuth() as any;
  const router = useRouter();
  const { status: subStatus } = useSubscription();
  const { deleteAllData: deleteAiData } = useAi();

  const [view, setView] = useState<View>("hub");
  const [initialLoading, setInitialLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [pCurrent, setPCurrent] = useState("");
  const [pNew, setPNew] = useState("");
  const [pConfirm, setPConfirm] = useState("");

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      await accountApi.deleteAccount(deletePassword);
      message.success("Account deleted");
      signOut({ callbackUrl: "/login" });
    } catch (err: any) {
      const code = err?.response?.data?.error?.code;
      const msg = err?.response?.data?.error?.message;
      if (code === "TEAMS_MUST_BE_HANDLED") {
        setDeleteError(
          msg || "Delete your teams first before deleting your account.",
        );
      } else if (code === "ADMIN_DELETION_BLOCKED") {
        setDeleteError(
          "Admin accounts cannot be self-deleted. Contact support.",
        );
      } else if (code === "INVALID_CREDENTIALS") {
        setDeleteError("Password is incorrect. Please try again.");
      } else {
        setDeleteError(msg || "Failed to delete account. Please try again.");
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const planName = subStatus?.planName || (user as any)?.plan || "Free";

  useEffect(() => {
    api
      .get("/users/me")
      .then((res) => {
        const data = res.data?.data || res.data || {};
        setName(data.name || user?.name || "");
        setEmail(data.email || user?.email || "");
        setContactNo(data.contactNo || "");
        if (data.image || data.avatar || data.photo) {
          setAvatarUrl(data.image || data.avatar || data.photo);
        }
      })
      .catch(() => {
        if (user) {
          setName(user.name || "");
          setEmail(user.email || "");
        }
      })
      .finally(() => setInitialLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const saveProfile = async () => {
    if (!name.trim()) {
      message.error("Please enter your name");
      return;
    }
    setProfileLoading(true);
    try {
      await api.put("/users/me", { name, contactNo });
      message.success("Profile updated successfully");
    } catch {
      message.error("Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const changePassword = async () => {
    if (!pCurrent || !pNew || !pConfirm) {
      message.error("Please fill in all password fields");
      return;
    }
    if (pNew.length < 8) {
      message.error("Password must be at least 8 characters");
      return;
    }
    if (pNew !== pConfirm) {
      message.error("Passwords do not match");
      return;
    }
    setPasswordLoading(true);
    try {
      await api.put("/users/me/password", {
        currentPassword: pCurrent,
        newPassword: pNew,
      });
      message.success("Password changed successfully");
      setPCurrent("");
      setPNew("");
      setPConfirm("");
      setView("hub");
    } catch (err: any) {
      message.error(
        err.response?.data?.error?.message || "Failed to change password",
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAvatarUpload = (file: File) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 200;
      const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL("image/jpeg", 0.85);
      URL.revokeObjectURL(objectUrl);
      api
        .put("/users/me", { photo: base64 })
        .then((res) => {
          const photo =
            res.data?.data?.user?.photo || res.data?.data?.photo || base64;
          setAvatarUrl(photo);
          // Notify other surfaces (sidebar drawer, header) so the new photo
          // syncs immediately without a page reload.
          window.dispatchEvent(
            new CustomEvent("userAvatarChanged", { detail: { url: photo } }),
          );
          message.success("Avatar updated");
        })
        .catch(() => message.error("Avatar upload failed"));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      message.error("Failed to read image");
    };
    img.src = objectUrl;
    return false;
  };

  const confirmDeleteAi = () =>
    Modal.confirm({
      title: "Delete AI Data",
      content:
        "Delete all your AI conversation history? This cannot be undone.",
      okText: "Delete",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      centered: true,
      onOk: () => deleteAiData(),
    });

  const initial = (name || user?.name || "U").charAt(0).toUpperCase();

  if (initialLoading) {
    return (
      <div className="tw flex items-center justify-center py-24">
        <Spin size="large" />
      </div>
    );
  }

  const AvatarCircle = ({ size }: { size: number }) => (
    <div
      className="rounded-full bg-primary flex items-center justify-center text-white font-bold overflow-hidden shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        initial
      )}
    </div>
  );

  /* ══════════ HUB (Profile) ══════════ */
  const Hub = (
    <div className="px-5 pt-4 space-y-4 max-w-6xl mx-auto">
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <AvatarCircle size={96} />
          <Upload
            showUploadList={false}
            beforeUpload={handleAvatarUpload}
            accept="image/*"
          >
            <button
              type="button"
              aria-label="Change profile photo"
              className={`${RESET} absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary-deep border-2 border-background flex items-center justify-center text-white`}
            >
              <Camera className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </Upload>
        </div>
        <div className="mt-3 font-bold text-lg text-foreground">
          {name || user?.name || "User"}
        </div>
        <div className="text-xs text-muted-foreground">{email}</div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-primary-tint text-primary-deep">
            {planName} Plan
          </span>
          {isAdmin && (
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#E2EEF8] text-blue">
              Admin
            </span>
          )}
        </div>
      </div>

      <SectionLabel>Account</SectionLabel>
      <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
        <button
          onClick={() => setView("edit")}
          className={`${RESET} bg-transparent border-0 w-full flex items-center gap-3 p-4`}
        >
          <Users className="w-4 h-4 text-foreground" />
          <span className="flex-1 text-left text-sm font-semibold">
            Edit Profile
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="w-full flex items-center gap-3 p-4">
          <Mail className="w-4 h-4 text-foreground" />
          <span className="flex-1 text-left text-sm font-semibold">Email</span>
          <span className="text-xs text-muted-foreground truncate max-w-[55%]">
            {email}
          </span>
        </div>
        <div className="w-full flex items-center gap-3 p-4">
          <Phone className="w-4 h-4 text-foreground" />
          <span className="flex-1 text-left text-sm font-semibold">Phone</span>
          <span className="text-xs text-muted-foreground">
            {contactNo || "Not set"}
          </span>
        </div>
      </div>

      <SectionLabel>Security</SectionLabel>
      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <button
          onClick={() => setView("password")}
          className={`${RESET} bg-transparent border-0 w-full flex items-center gap-3 p-4`}
        >
          <Lock className="w-4 h-4 text-foreground" />
          <span className="flex-1 text-left text-sm font-semibold">
            Change Password
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <SectionLabel>Preferences</SectionLabel>
      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <button
          onClick={() => router.push("/dashboard/notifications")}
          className={`${RESET} bg-transparent border-0 w-full flex items-center gap-3 p-4`}
        >
          <Bell className="w-4 h-4 text-foreground" />
          <span className="flex-1 text-left text-sm font-semibold">
            Notifications
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <SectionLabel>Billing</SectionLabel>
      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <button
          onClick={() => router.push("/dashboard/settings/billing")}
          className={`${RESET} bg-transparent border-0 w-full flex items-center gap-3 p-4 border-b border-border`}
        >
          <ShieldCheck className="w-4 h-4 text-foreground" />
          <span className="flex-1 text-left text-sm font-semibold">
            Subscription &amp; Billing
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          onClick={() => router.push("/dashboard/settings/payment-methods")}
          className={`${RESET} bg-transparent border-0 w-full flex items-center gap-3 p-4`}
        >
          <CreditCard className="w-4 h-4 text-foreground" />
          <span className="flex-1 text-left text-sm font-semibold">
            Payment Methods
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <button
        onClick={() => logout({ callbackUrl: "/login" })}
        className={`${RESET} w-full mt-2 h-12 rounded-2xl bg-card border border-border text-coral font-bold inline-flex items-center justify-center gap-2`}
      >
        <LogOut className="w-4 h-4" /> Log Out
      </button>

      <SectionLabel>Danger Zone</SectionLabel>
      <div className="rounded-2xl bg-card border border-[#FFA39E] overflow-hidden mb-6">
        <button
          onClick={() => {
            setDeletePassword("");
            setDeleteError(null);
            setDeleteModalOpen(true);
          }}
          className={`${RESET} bg-transparent border-0 w-full flex items-center gap-3 p-4`}
        >
          <Trash2 className="w-4 h-4 text-[#FF4D4F]" />
          <span className="flex-1 text-left text-sm font-semibold text-[#FF4D4F]">
            Delete Account
          </span>
          <ChevronRight className="w-4 h-4 text-[#FF4D4F]" />
        </button>
      </div>

      <Modal
        open={deleteModalOpen}
        title={
          <span style={{ color: "#FF4D4F" }}>
            ⚠️ Permanently Delete Account
          </span>
        }
        okText="Permanently Delete Account"
        okButtonProps={{ danger: true, loading: deleteLoading }}
        cancelText="Cancel"
        onCancel={() => {
          setDeleteModalOpen(false);
          setDeletePassword("");
          setDeleteError(null);
        }}
        onOk={async () => {
          await handleDeleteAccount();
        }}
        centered
        maskClosable={!deleteLoading}
      >
        <p style={{ marginBottom: 16, color: "#595959", fontSize: 14 }}>
          All your data will be <strong>permanently deleted</strong>. This
          cannot be undone.
        </p>
        <p style={{ marginBottom: 12, fontSize: 13, color: "#595959" }}>
          Enter your password to confirm:
        </p>
        <Input.Password
          value={deletePassword}
          onChange={(e) => {
            setDeletePassword(e.target.value);
            setDeleteError(null);
          }}
          placeholder="Your current password"
          disabled={deleteLoading}
          onPressEnter={handleDeleteAccount}
        />
        {deleteError && (
          <div
            style={{
              marginTop: 10,
              color: "#FF4D4F",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {deleteError}
          </div>
        )}
      </Modal>
    </div>
  );

  /* ══════════ EDIT PROFILE ══════════ */
  const Edit = (
    <div className="px-5 pt-3 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setView("hub")}
          className={`${RESET} w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center`}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Profile Settings
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border p-6 flex flex-col items-center text-center">
        <AvatarCircle size={96} />
        <div className="mt-3 font-bold text-base">
          {name || user?.name || "User"}
        </div>
        <div className="text-xs text-muted-foreground">{email}</div>
        <Upload
          showUploadList={false}
          beforeUpload={handleAvatarUpload}
          accept="image/*"
        >
          <button
            type="button"
            className={`${RESET} bg-transparent mt-3 h-9 px-4 rounded-xl border border-border text-xs font-semibold inline-flex items-center gap-2`}
          >
            <UploadIcon className="w-3.5 h-3.5" /> Upload Photo
          </button>
        </Upload>
      </div>

      <div className="rounded-2xl bg-card border border-border p-5">
        <div className="font-bold text-sm mb-3">Personal Information</div>
        <Field label="Name" required>
          <FieldInput
            icon={<Users className="w-4 h-4" />}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
          />
        </Field>
        <Field label="Email" required>
          <FieldInput
            icon={<Mail className="w-4 h-4" />}
            value={email}
            disabled
          />
        </Field>
        <Field label="Phone">
          <FieldInput
            icon={<Phone className="w-4 h-4" />}
            type="tel"
            inputMode="tel"
            value={contactNo}
            onChange={(e) => setContactNo(e.target.value)}
            placeholder="Phone number"
          />
        </Field>
        <button
          onClick={saveProfile}
          disabled={profileLoading}
          className={`appearance-none border-0 cursor-pointer mt-2 w-full h-11 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-70`}
        >
          {profileLoading ? "Saving…" : "Save Changes"}
        </button>
      </div>

      <div className="rounded-2xl bg-card border border-border p-5">
        <div className="font-bold text-sm">AI Data &amp; Privacy</div>
        <div className="text-xs text-muted-foreground mt-1">
          Manage data collected by Value Charts AI
        </div>
        <button
          onClick={confirmDeleteAi}
          className={`${RESET} bg-transparent mt-3 w-full h-11 rounded-xl border-2 border-coral text-coral font-bold text-sm inline-flex items-center justify-center gap-2`}
        >
          <Trash2 className="w-4 h-4" /> Delete my AI data
        </button>
      </div>
    </div>
  );

  /* ══════════ CHANGE PASSWORD ══════════ */
  const Password = (
    <div className="px-5 pt-3 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setView("hub")}
          className={`${RESET} w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center`}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Security
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border p-5">
        <div className="font-bold text-base">Change Password</div>
        <div className="text-xs text-muted-foreground mt-1 mb-4">
          Use a strong password you don&apos;t use elsewhere.
        </div>
        <Field label="Current Password" required>
          <FieldInput
            icon={<Lock className="w-4 h-4" />}
            eye
            value={pCurrent}
            onChange={(e) => setPCurrent(e.target.value)}
            placeholder="Current password"
          />
        </Field>
        <Field label="New Password" required>
          <FieldInput
            icon={<Lock className="w-4 h-4" />}
            eye
            value={pNew}
            onChange={(e) => setPNew(e.target.value)}
            placeholder="New password (min 8 chars)"
          />
        </Field>
        <Field label="Confirm Password" required>
          <FieldInput
            icon={<Lock className="w-4 h-4" />}
            eye
            value={pConfirm}
            onChange={(e) => setPConfirm(e.target.value)}
            placeholder="Confirm new password"
          />
        </Field>
        <button
          onClick={changePassword}
          disabled={passwordLoading}
          className={`appearance-none border-0 cursor-pointer mt-2 w-full h-11 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-70`}
        >
          {passwordLoading ? "Updating…" : "Update Password"}
        </button>
      </div>

      <div className="rounded-2xl bg-card border border-border p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary-deep" />
          <div className="font-bold text-sm">Password tips</div>
        </div>
        <ul className="mt-2 text-xs text-muted-foreground space-y-1 list-disc pl-5">
          <li>At least 12 characters</li>
          <li>Mix of letters, numbers and symbols</li>
          <li>Avoid reusing previous passwords</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="tw">
      {view === "hub" ? Hub : view === "edit" ? Edit : Password}
    </div>
  );
}

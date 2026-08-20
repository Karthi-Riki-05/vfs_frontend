"use client";

import React, { useState, useEffect, type ReactNode } from "react";
import { Upload, message, Spin } from "antd";
import { toast } from "sonner";
import { confirmDialog } from "@/components/common/ConfirmDialog";
import {
  ModalShell,
  ModalHeader,
  ModalFooter,
} from "@/components/common/Modal";
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
  Workflow,
  Smartphone,
} from "lucide-react";
import api from "@/lib/axios";
import BiometricLoginToggle from "@/components/settings/BiometricLoginToggle";
import BackButton from "@/components/shared/BackButton";
import { useAuth } from "@/hooks/useAuth";
import { useAi } from "@/hooks/useAi";
import { useSubscription } from "@/hooks/useSubscription";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/logout";
import {
  notificationsApi,
  type NotificationPreferenceItem,
} from "@/api/notifications.api";

const RESET = "appearance-none cursor-pointer";

type View = "hub" | "edit" | "password" | "notifPrefs";

/* Categories mirror backend/src/services/notification.service.js#KNOWN_TYPES,
   grouped for the preferences UI. `locked` mirrors
   notificationPreference.service.js#NON_DISABLEABLE_CATEGORIES — locked rows
   are transactional/security and can never be turned off. */
const PREF_GROUPS: {
  label: string;
  icon: ReactNode;
  items: { category: string; label: string; locked?: boolean }[];
}[] = [
  {
    label: "Teams",
    icon: <Users className="w-4 h-4" />,
    items: [
      { category: "team_invite", label: "Team invites", locked: true },
      { category: "team_invite_declined", label: "Invite declined" },
      { category: "team_member_joined", label: "Member joined" },
      { category: "team_member_removed", label: "Member removed" },
    ],
  },
  {
    label: "Flows & Flow Packs",
    icon: <Workflow className="w-4 h-4" />,
    items: [
      { category: "flow_updated", label: "Flow updated by a collaborator" },
      { category: "flow_pack_7day", label: "Flow pack expiring in 7 days" },
      { category: "flow_pack_3day", label: "Flow pack expiring in 3 days" },
      { category: "flow_pack_1day", label: "Flow pack expiring in 1 day" },
      { category: "flow_pack_grace", label: "Flow pack in grace period" },
      { category: "flow_pack_expired", label: "Flow pack expired" },
      { category: "flow_picker_required", label: "Flow picker required" },
      { category: "flow_addon_expired", label: "Flow add-on expired" },
      {
        category: "flow_addon_grace_expired",
        label: "Flow add-on grace ended",
      },
      {
        category: "flow_addon_payment_failed",
        label: "Flow add-on payment failed",
        locked: true,
      },
    ],
  },
  {
    label: "Billing",
    icon: <CreditCard className="w-4 h-4" />,
    items: [
      {
        category: "subscription_activated",
        label: "Subscription activated",
        locked: true,
      },
      {
        category: "subscription_cancelled",
        label: "Subscription cancelled",
        locked: true,
      },
      {
        category: "subscription_expired",
        label: "Subscription expired",
        locked: true,
      },
    ],
  },
  {
    label: "Security",
    icon: <ShieldCheck className="w-4 h-4" />,
    items: [
      { category: "SECURITY_ALERT", label: "Security alerts", locked: true },
    ],
  },
];

type PrefState = Record<
  string,
  { inApp: boolean; push: boolean; email: boolean }
>;

function MiniSwitch({
  on,
  disabled,
  onChange,
}: {
  on: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onChange}
      className={`${RESET} relative w-9 h-5 rounded-full border-0 transition-colors ${
        on ? "bg-primary" : "bg-secondary"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

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
      className={`flex items-center gap-2 h-11 px-3 rounded-xl border border-border transition-colors focus-within:border-primary ${
        disabled ? "bg-secondary" : "bg-background"
      }`}
    >
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <input
        {...props}
        type={type}
        disabled={disabled}
        className="flex-1 min-w-0 bg-transparent outline-none text-sm appearance-none border-0 p-0 disabled:text-muted-foreground"
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
  const [deleteConfirm, setDeleteConfirm] = useState(""); // OAuth users type "DELETE"
  const [hasPassword, setHasPassword] = useState(true); // assume credentials until /users/me resolves
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [prefs, setPrefs] = useState<PrefState>({});
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState<string | null>(null);

  useEffect(() => {
    if (view !== "notifPrefs") return;
    setPrefsLoading(true);
    notificationsApi
      .getPreferences()
      .then((res) => {
        const rows: NotificationPreferenceItem[] =
          res.data?.data || res.data || [];
        const byCategory: PrefState = {};
        rows.forEach((r) => {
          byCategory[r.category] = {
            inApp: r.inApp !== false,
            push: r.push !== false,
            email: r.email !== false,
          };
        });
        setPrefs(byCategory);
      })
      .catch(() => toast.error("Failed to load notification preferences"))
      .finally(() => setPrefsLoading(false));
  }, [view]);

  const prefFor = (category: string) =>
    prefs[category] || { inApp: true, push: true, email: true };

  const togglePref = async (
    category: string,
    channel: "inApp" | "push" | "email",
    locked?: boolean,
  ) => {
    if (locked) return;
    const current = prefFor(category);
    const next = { ...current, [channel]: !current[channel] };
    setPrefs((p) => ({ ...p, [category]: next }));
    setPrefsSaving(category);
    try {
      await notificationsApi.updatePreference({
        category,
        [channel]: next[channel],
      });
    } catch {
      setPrefs((p) => ({ ...p, [category]: current }));
      toast.error("Failed to update preference");
    } finally {
      setPrefsSaving(null);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      await accountApi.deleteAccount(
        hasPassword
          ? { password: deletePassword }
          : { confirmation: deleteConfirm },
      );
      toast.success("Account deleted");
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
      } else if (
        code === "CONFIRMATION_REQUIRED" ||
        code === "PASSWORD_REQUIRED"
      ) {
        setDeleteError(
          hasPassword ? "Password is required." : 'Type "DELETE" to confirm.',
        );
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
        // Social-login users have no password → delete confirms via "DELETE"
        // typed text instead of a password field.
        setHasPassword(data.hasPassword !== false);
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
      toast.error("Please enter your name");
      return;
    }
    setProfileLoading(true);
    try {
      await api.put("/users/me", { name, contactNo });
      toast.success("Profile updated successfully");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const changePassword = async () => {
    if (!pCurrent || !pNew || !pConfirm) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (pNew.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (pNew !== pConfirm) {
      toast.error("Passwords do not match");
      return;
    }
    setPasswordLoading(true);
    try {
      await api.put("/users/me/password", {
        currentPassword: pCurrent,
        newPassword: pNew,
      });
      toast.success("Password changed successfully");
      setPCurrent("");
      setPNew("");
      setPConfirm("");
      setView("hub");
    } catch (err: any) {
      toast.error(
        err.response?.data?.error?.message || "Failed to change password",
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    // An avatar is displayed in a CIRCLE everywhere in the app, so it must be
    // stored SQUARE. This used to scale-to-fit inside a 200px box, which
    // preserves the source aspect ratio: a 400×2856 phone screenshot was stored
    // as 28×200. Every round chip then had 28 real pixels to work with across
    // its diameter (blurry), and any surface that did not pin BOTH dimensions
    // rendered it as a tall smear — that is what the flow cards hit, where
    // globals.css's unlayered `img { height: auto }` beats Tailwind's `h-4`.
    //
    // Now: centre-crop to the largest square the source contains, then scale
    // that square to 200×200. Cropping is what the circle does visually anyway
    // — doing it at upload time makes the stored bytes agree with what everyone
    // sees, instead of leaving each render site to fix it.
    if (!file.type?.startsWith("image/")) {
      toast.error("Please choose an image file");
      return false;
    }
    // Guard the decode, not the output: a 40MP HEIC decodes to hundreds of MB
    // of bitmap and can kill the tab on a phone — and the phone is the WebView.
    const MAX_BYTES = 15 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      toast.error("Image is too large (max 15MB)");
      return false;
    }

    const OUT = 200;
    let source: ImageBitmap | HTMLImageElement | null = null;
    let objectUrl: string | null = null;
    try {
      try {
        // `imageOrientation: "from-image"` applies the EXIF rotation tag. Phone
        // cameras store the sensor image sideways and record the rotation there,
        // so without this a portrait selfie uploads rotated 90°. Not every
        // engine accepts the option (it throws where unsupported), hence the
        // decode fallback below.
        source = await createImageBitmap(file, {
          imageOrientation: "from-image",
        });
      } catch {
        objectUrl = URL.createObjectURL(file);
        source = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = () => reject(new Error("decode failed"));
          el.src = objectUrl as string;
        });
      }

      const sw = "width" in source ? source.width : 0;
      const sh = "height" in source ? source.height : 0;
      if (!sw || !sh) throw new Error("empty image");

      // The largest centred square the source contains.
      const side = Math.min(sw, sh);
      const sx = Math.round((sw - side) / 2);
      const sy = Math.round((sh - side) / 2);
      // Never upscale: a 64px source stays 64px rather than being blown up to
      // 200 and re-compressed.
      const out = Math.min(side, OUT);

      const canvas = document.createElement("canvas");
      canvas.width = out;
      canvas.height = out;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no 2d context");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      // JPEG has no alpha — without this, transparent PNGs composite onto black.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, out, out);
      ctx.drawImage(source as CanvasImageSource, sx, sy, side, side, 0, 0, out, out);
      const base64 = canvas.toDataURL("image/jpeg", 0.85);

      const res = await api.put("/users/me", { photo: base64 });
      const photo =
        res.data?.data?.user?.photo || res.data?.data?.photo || base64;
      setAvatarUrl(photo);
      // Notify other surfaces (sidebar drawer, header) so the new photo
      // syncs immediately without a page reload.
      window.dispatchEvent(
        new CustomEvent("userAvatarChanged", { detail: { url: photo } }),
      );
      toast.success("Avatar updated");
    } catch (err: any) {
      // Separate messages: a decode failure is the user's file, a failed PUT is
      // ours. Collapsing them into "upload failed" sent people back to pick a
      // different photo when the photo was never the problem.
      toast.error(
        err?.response
          ? err.response?.data?.error?.message || "Avatar upload failed"
          : "Could not read that image",
      );
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (source && "close" in source) source.close();
    }
    return false;
  };

  const confirmDeleteAi = () =>
    confirmDialog({
      title: "Delete AI Data",
      content:
        "Delete all your AI conversation history? This cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
      onConfirm: () => deleteAiData(),
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
        // Inline px from the `size` prop — the unlayered `img { height: auto }`
        // in globals.css beats `h-full`, so class-sized avatars do not fill
        // their circle (same fix as the Header and Sidebar avatars).
        <img
          src={avatarUrl}
          alt=""
          style={{ width: size, height: size }}
          className="rounded-full object-cover shrink-0"
        />
      ) : (
        initial
      )}
    </div>
  );

  /* ══════════ HUB (Profile) ══════════ */
  const Hub = (
    <div className="px-5 pt-3 space-y-4 max-w-6xl mx-auto">
      {/* The settings HUB had no back button at all: MobileBackButton excludes
          /dashboard/settings wholesale (because the sub-views render their own),
          but the hub itself rendered none — leaving the user stranded on phones,
          where there is no sidebar. */}
      <div className="flex items-center gap-3">
        <BackButton
          onClick={() => {
            // Route to the CURRENT app's dashboard, not the bare /dashboard
            // generic shell. vc_app_context (per-tab) is the same signal the
            // axios interceptor scopes by, so "Back" lands on the same app the
            // user is in (Pro → /dashboard/pro, else Team).
            let app = "team";
            try {
              app =
                sessionStorage.getItem("vc_app_context") === "pro"
                  ? "pro"
                  : "team";
            } catch {
              /* sessionStorage may be blocked in restricted WebViews */
            }
            router.push(`/dashboard/${app}`);
          }}
          label="Back to dashboard"
        />
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Profile
        </div>
      </div>
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
      <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
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
        {/* Renders only inside the native shell on a phone with enrolled
            biometrics — a browser sees this section unchanged. Sits under
            Security rather than Preferences because it IS a sign-in
            credential, not a display option. */}
        <BiometricLoginToggle />
      </div>

      <SectionLabel>Preferences</SectionLabel>
      <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
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
        <button
          onClick={() => setView("notifPrefs")}
          className={`${RESET} bg-transparent border-0 w-full flex items-center gap-3 p-4`}
        >
          <Smartphone className="w-4 h-4 text-foreground" />
          <span className="flex-1 text-left text-sm font-semibold">
            Notification Settings
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

      {/* Delete AI Data — sits directly above Delete Account in the Danger Zone */}
      <div className="rounded-2xl bg-card border border-border p-5 mb-3">
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

      <div className="rounded-2xl bg-card border border-[#FFA39E] overflow-hidden mb-6">
        <button
          onClick={() => {
            setDeletePassword("");
            setDeleteConfirm("");
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

      <ModalShell
        open={deleteModalOpen}
        onClose={() => {
          if (deleteLoading) return;
          setDeleteModalOpen(false);
          setDeletePassword("");
          setDeleteError(null);
        }}
      >
        <ModalHeader
          title="⚠️ Permanently Delete Account"
          close={() => {
            if (deleteLoading) return;
            setDeleteModalOpen(false);
            setDeletePassword("");
            setDeleteConfirm("");
            setDeleteError(null);
          }}
        />
        <div className="px-5 pb-5 space-y-3">
          <p className="text-sm text-muted-foreground">
            All your data will be <strong>permanently deleted</strong>. This
            cannot be undone.
          </p>
          {hasPassword ? (
            <Field label="Enter your password to confirm">
              <FieldInput
                eye
                value={deletePassword}
                onChange={(e) => {
                  setDeletePassword(e.target.value);
                  setDeleteError(null);
                }}
                placeholder="Your current password"
                disabled={deleteLoading}
                onKeyDown={(e) => e.key === "Enter" && handleDeleteAccount()}
              />
            </Field>
          ) : (
            // Social-login users (Google/Facebook/etc.) have no password —
            // confirm by typing DELETE instead.
            <Field label="Type DELETE to confirm">
              <FieldInput
                value={deleteConfirm}
                onChange={(e) => {
                  setDeleteConfirm(e.target.value);
                  setDeleteError(null);
                }}
                placeholder="DELETE"
                disabled={deleteLoading}
                onKeyDown={(e) => e.key === "Enter" && handleDeleteAccount()}
              />
            </Field>
          )}
          {deleteError && (
            <div className="text-sm text-coral leading-relaxed">
              {deleteError}
            </div>
          )}
        </div>
        <ModalFooter
          close={() => {
            if (deleteLoading) return;
            setDeleteModalOpen(false);
            setDeletePassword("");
            setDeleteConfirm("");
            setDeleteError(null);
          }}
          primary={handleDeleteAccount}
          primaryLabel="Permanently Delete Account"
          loading={deleteLoading}
          danger
        />
      </ModalShell>
    </div>
  );

  /* ══════════ EDIT PROFILE ══════════ */
  const Edit = (
    <div className="px-5 pt-3 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <BackButton onClick={() => setView("hub")} label="Back to settings" />
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
    </div>
  );

  /* ══════════ CHANGE PASSWORD ══════════ */
  const Password = (
    <div className="px-5 pt-3 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <BackButton onClick={() => setView("hub")} label="Back to settings" />
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
            placeholder="Min 8 characters"
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

  /* ══════════ NOTIFICATION PREFERENCES ══════════ */
  const NotifPrefs = (
    <div className="px-5 pt-3 space-y-4 max-w-6xl mx-auto pb-6">
      <div className="flex items-center gap-3">
        <BackButton onClick={() => setView("hub")} label="Back to settings" />
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Notification Settings
        </div>
      </div>

      {prefsLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spin size="large" />
        </div>
      ) : (
        <>
          <div className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3">
            <div className="flex-1 grid grid-cols-3 gap-2 text-center ml-auto max-w-[220px]">
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <Bell className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wide">
                  In-app
                </span>
              </div>
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <Smartphone className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wide">
                  Push
                </span>
              </div>
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <Mail className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wide">
                  Email
                </span>
              </div>
            </div>
          </div>

          {PREF_GROUPS.map((group) => (
            <div key={group.label}>
              <SectionLabel>{group.label}</SectionLabel>
              <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
                {group.items.map((item) => {
                  const p = prefFor(item.category);
                  const saving = prefsSaving === item.category;
                  return (
                    /* Phones stack label above switches. Previously the switch
                       grid claimed a hard `max-w-[220px] w-full`, which on a
                       412px screen left ~110px for the label — and because the
                       label was `truncate`, it disappeared entirely while the
                       un-truncated locked caption wrapped to four lines. */
                    <div
                      key={item.category}
                      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
                    >
                      <div className="flex items-start gap-3 min-w-0 sm:flex-1 sm:items-center">
                        <span className="text-muted-foreground shrink-0">
                          {group.icon}
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold sm:truncate">
                            {item.label}
                          </div>
                          {item.locked && (
                            <div className="text-[10px] font-bold uppercase tracking-wide text-primary-deep mt-0.5">
                              Required — cannot be disabled
                            </div>
                          )}
                        </div>
                      </div>
                      <div
                        className={`grid grid-cols-3 gap-2 place-items-center w-full shrink-0 sm:max-w-[220px] ${
                          saving ? "opacity-60" : ""
                        }`}
                      >
                        {/* Column labels, phones only. Stacked full-width, a
                            bare row of three identical toggles has nothing to
                            identify it — the IN-APP/PUSH/EMAIL header sits far
                            up the page. On sm+ these hide and the grid is one
                            row again, exactly as before. */}
                        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground sm:hidden">
                          In-app
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground sm:hidden">
                          Push
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground sm:hidden">
                          Email
                        </span>
                        <MiniSwitch
                          on={p.inApp}
                          disabled={item.locked || saving}
                          onChange={() =>
                            togglePref(item.category, "inApp", item.locked)
                          }
                        />
                        <MiniSwitch
                          on={p.push}
                          disabled={item.locked || saving}
                          onChange={() =>
                            togglePref(item.category, "push", item.locked)
                          }
                        />
                        <MiniSwitch
                          on={p.email}
                          disabled={item.locked || saving}
                          onChange={() =>
                            togglePref(item.category, "email", item.locked)
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );

  return (
    <div className="tw">
      {view === "hub"
        ? Hub
        : view === "edit"
          ? Edit
          : view === "password"
            ? Password
            : NotifPrefs}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useAiCredits } from "@/hooks/useAiCredits";
import { Button, Skeleton } from "antd";
import { ExclamationCircleOutlined, HeartFilled } from "@ant-design/icons";
import { useDashboard } from "@/hooks/useDashboard";
import { useAuth } from "@/hooks/useAuth";
import { usePackStatus } from "@/hooks/usePackStatus";
import { useRouter } from "next/navigation";
import {
  Workflow,
  FileText,
  Users,
  Share2,
  Crown,
  ChevronRight,
  Sparkles,
  Gift,
} from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import MiniFlow from "@/components/dashboard/MiniFlow";
import {
  RecentFlowMenu,
  useRecentFlowModals,
} from "@/components/dashboard/RecentFlowMenu";
import { FlowUsageBar } from "@/components/dashboard/FlowUsageBar";
import { aiApi } from "@/api/ai.api";
import { subscriptionsApi } from "@/api/subscriptions.api";
import { useAppContext } from "@/context/AppContext";

// ─── Local atoms ──────────────────────────────────────────────────────────────

function BarChart({
  data,
}: {
  data: Array<{ label: string; created: number; edited: number }>;
}) {
  const maxVal = Math.max(...data.map((d) => Math.max(d.created, d.edited)), 1);
  return (
    <div className="mt-4 h-36 flex items-end gap-2">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
          <div className="w-full flex items-end gap-1 h-28">
            <div
              className="flex-1 rounded-t-md bg-primary"
              style={{ height: `${(d.created / maxVal) * 100}%` }}
            />
            <div
              className="flex-1 rounded-t-md bg-[#006AA8]/80"
              style={{ height: `${(d.edited / maxVal) * 100}%` }}
            />
          </div>
          <div className="text-[10px] text-muted-foreground font-semibold">
            {d.label}
          </div>
        </div>
      ))}
    </div>
  );
}

const FLOW_COLORS = ["#34A881", "#006AA8", "#FF9A30", "#F85729", "#1F7D5E"];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getTimeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamDashboardPage() {
  const { user } = useAuth();
  const {
    status: packStatus,
    effectiveLimit,
    effectiveUnlimited,
  } = usePackStatus();
  // Shape pack data into the same ProFlows interface FlowUsageBar expects
  const proFlows =
    packStatus && effectiveLimit > 0
      ? {
          used: packStatus.flowCount,
          max: effectiveLimit,
          baseLimit: effectiveLimit,
          extraPurchased: 0,
        }
      : null;
  const isUnlimited = effectiveUnlimited;
  const router = useRouter();
  const { activeTeamId } = useAppContext();

  // OPT-3: shared store — the Team dashboard, the Pro dashboard and /dashboard
  // all read the same subscription status.
  const { status: subStatus, loading: subLoading } = useSubscriptionStatus();
  const subLoaded = !subLoading;
  const [portalLoading, setPortalLoading] = useState(false);
  const [aiCredits, setAiCredits] = useState<number | null>(null);

  // Active team plan = a live (or cancelling-but-still-active) subscription.
  // Free users have status null → show the Free Plan badge instead of Team.
  // bug-106 (2026-08-08): `subStatus` is the CALLER's own subscription
  // (`getStatus()` takes no workspace), so a member inside a paid workspace saw
  // "Free Plan / No active subscription / Upgrade to a Team plan to
  // collaborate" — directly above that workspace's 176 Team AI credits, which
  // they can actually spend, and while `/entitlements` reported tier "team".
  //
  // The workspace's tier decides what this card SAYS; `subStatus` still decides
  // what the button DOES, because only the owner can manage the billing.
  const { entitlements } = useEntitlements();
  const workspaceIsTeam = entitlements?.tier === "team";
  const ownsSubscription = subStatus === "active" || subStatus === "cancelling";
  const isTeamPlan = ownsSubscription || workspaceIsTeam;
  // True when the plan is inherited from the workspace owner rather than bought
  // by this user — the card must not offer them a billing screen they cannot use.
  const inheritedPlan = workspaceIsTeam && !ownsSubscription;

  // Remaining AI credits. OPT-3: from the shared store — the store owns the
  // `aiCreditsChanged` subscription for every display at once.
  const { total: sharedAiCredits } = useAiCredits();
  useEffect(() => {
    if (typeof sharedAiCredits === "number") setAiCredits(sharedAiCredits);
  }, [sharedAiCredits]);

  const openCustomerPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/subscription/customer-portal", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success && data.data?.url) {
        window.location.href = data.data.url;
      }
    } finally {
      setPortalLoading(false);
    }
  };

  const { stats, activity, recentFlows, teamActivity, loading, refresh } =
    useDashboard({
      fetchTeamActivity: true,
    });

  const { openRename, openAssign, modals: recentFlowModals } =
    useRecentFlowModals(refresh);

  const chartData = Array.isArray(activity)
    ? activity.slice(-7).map((a) => ({
        label: a.label || a.date?.slice(5) || "",
        created: a.created || 0,
        edited: a.edited || 0,
      }))
    : [];

  // Compute date/greeting client-side only to avoid SSR/hydration mismatch
  // (server and client can render on different calendar days).
  const [today, setToday] = useState("");
  const [greeting, setGreeting] = useState("");
  useEffect(() => {
    setToday(
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    );
    setGreeting(getGreeting());
  }, []);

  const firstName = user?.name?.split(" ")[0] || "there";

  const activityEmptyMsg = activeTeamId
    ? "No recent activity in this team yet"
    : "Switch to a team workspace to see activity";

  return (
    <div className="tw min-h-screen bg-background">
      {/* Past-due banner */}
      {subStatus === "past_due" && (
        <div className="mx-4 mt-4 flex items-center gap-3 rounded-xl border border-[#ffccc7] bg-[#fff2f0] px-4 py-3">
          <ExclamationCircleOutlined
            style={{ color: "#ff4d4f", fontSize: 16, flexShrink: 0 }}
          />
          <span className="flex-1 text-[13px] text-[#cf1322]">
            <strong>Payment Failed:</strong> Update your payment method to keep
            your subscription active.
          </span>
          <Button
            size="small"
            type="primary"
            danger
            onClick={openCustomerPortal}
            loading={portalLoading}
          >
            Update Card
          </Button>
        </div>
      )}

      {/* Flow usage bar */}
      {proFlows && (
        <div className="px-5 pt-3 lg:px-8 lg:pt-6">
          <FlowUsageBar
            proFlows={proFlows}
            isUnlimited={isUnlimited}
            onBuyMore={() => router.push("/dashboard/subscription")}
          />
        </div>
      )}

      {/* ── Mobile layout (<1024px) ── */}
      <div className="lg:hidden px-5 pt-3 pb-28 space-y-5">
        {/* Greeting */}
        <div>
          <div className="text-xs font-semibold text-muted-foreground">
            {today}
          </div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-foreground leading-tight">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            You have{" "}
            <span className="font-semibold text-primary">
              {loading ? "—" : (stats?.teamMembers ?? 0)} team members
            </span>{" "}
            collaborating.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Total Flows"
            value={loading ? "—" : (stats?.totalFlows ?? 0)}
            icon={Workflow}
            tone="primary"
            trend="All flows"
          />
          <StatCard
            label="Edited"
            value={loading ? "—" : (stats?.editedThisMonth ?? 0)}
            icon={FileText}
            tone="blue"
            trend="This month"
          />
          <StatCard
            label="Team Members"
            value={loading ? "—" : (stats?.teamMembers ?? 0)}
            icon={Users}
            tone="orange"
            trend="In your team"
          />
          <StatCard
            label="Shared Flows"
            value={loading ? "—" : (stats?.sharedFlows ?? 0)}
            icon={Share2}
            tone="coral"
            trend="Shared by you"
          />
        </div>

        {/* Subscription card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1F7D5E] via-primary to-[#2A9272] p-5 text-white shadow-card">
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
          <div className="flex items-center gap-2">
            {isTeamPlan ? (
              <Crown className="w-4 h-4 text-[#FFD27A]" />
            ) : (
              <Gift className="w-4 h-4 text-[#FFD27A]" />
            )}
            <span className="text-[11px] font-bold tracking-wider uppercase">
              {!subLoaded ? "—" : isTeamPlan ? "Team Plan" : "Free Plan"}
            </span>
          </div>
          <div className="mt-2 text-lg font-extrabold">
            {isTeamPlan
              ? `${loading ? "—" : (stats?.teamMembers ?? 0)} members`
              : "No active subscription"}
          </div>
          {aiCredits != null && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-[#FFD27A]" />
              {aiCredits} AI credits remaining
            </div>
          )}
          <div className="mt-2 text-xs text-white/85">
            {inheritedPlan
              ? "Team plan provided by this workspace"
              : isTeamPlan
                ? "Manage your team plan and billing"
                : "Upgrade to a Team plan to collaborate"}
          </div>
          <button
            onClick={() => router.push("/dashboard/subscription")}
            className="bg-transparent border-0 p-0 appearance-none cursor-pointer mt-4 h-10 px-4 rounded-xl font-bold text-sm inline-flex items-center gap-2 text-[#1F7D5E]"
            style={{ background: "white" }}
          >
            {inheritedPlan
              ? "View Plans"
              : isTeamPlan
                ? "Manage Subscription"
                : "View Plans"}{" "}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Flow Activity chart */}
        {chartData.length > 0 && (
          <div className="rounded-3xl bg-card p-5 shadow-card border border-border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[15px] font-bold text-foreground">
                  Flow Activity
                </div>
                <div className="text-xs text-muted-foreground">Last 7 days</div>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary" /> Created
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#006AA8]" /> Edited
                </span>
              </div>
            </div>
            <BarChart data={chartData} />
          </div>
        )}

        {/* My Activity feed */}
        {Array.isArray(teamActivity) && teamActivity.length > 0 && (
          <div className="rounded-3xl bg-card p-5 shadow-card border border-border">
            <div className="text-[15px] font-bold text-foreground mb-3">
              My Activity
            </div>
            <div className="space-y-3">
              {teamActivity.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    {item.userImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.userImage}
                        alt={item.userName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-bold text-primary">
                        {item.userName?.charAt(0)?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {item.userName}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {item.action === "created" ? "Created" : "Updated"}{" "}
                      <span className="font-medium">{item.flowName}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground shrink-0">
                    {getTimeAgo(item.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent flows */}
        <div className="flex items-center justify-between">
          <div className="text-[15px] font-bold text-foreground">
            Recent flows
          </div>
          <button
            onClick={() => router.push("/dashboard/flows")}
            className="bg-transparent border-0 p-0 appearance-none cursor-pointer text-xs font-semibold text-primary inline-flex items-center gap-1"
          >
            See all <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        {loading ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="shrink-0 w-44 rounded-2xl border border-border overflow-hidden"
                style={{ background: "white" }}
              >
                <Skeleton.Image active style={{ width: 176, height: 96 }} />
                <div className="p-3">
                  <Skeleton active paragraph={{ rows: 1 }} title={false} />
                </div>
              </div>
            ))}
          </div>
        ) : !Array.isArray(recentFlows) || recentFlows.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            No recent flows. Create your first flow!
          </div>
        ) : (
          <div
            className="flex gap-3 -mx-5 px-5 overflow-x-auto pb-2"
            style={{ scrollbarWidth: "none" }}
          >
            {recentFlows.slice(0, 4).map((f, idx) => (
              <div
                key={f.id}
                className="relative shrink-0 w-44 rounded-2xl border border-border overflow-hidden shadow-card text-left"
                style={{ background: "white" }}
              >
                <button
                  type="button"
                  onClick={() =>
                    window.open(`/dashboard/flows/${f.id}`, "_blank")
                  }
                  className="block w-full text-left bg-transparent border-0 p-0 appearance-none cursor-pointer"
                >
                  <div className="h-24 bg-gradient-to-br from-secondary to-white relative overflow-hidden">
                    {f.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={f.thumbnail}
                        alt={f.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <MiniFlow color={FLOW_COLORS[idx % FLOW_COLORS.length]} />
                    )}
                    {f.isFavorite && (
                      <HeartFilled
                        style={{ color: "#FF4D6A", fontSize: 12 }}
                        className="absolute top-2 left-2"
                      />
                    )}
                  </div>
                  <div className="p-3">
                    <div className="font-semibold text-sm truncate text-foreground">
                      {f.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Updated {getTimeAgo(f.updatedAt)}
                    </div>
                  </div>
                </button>
                <div className="absolute top-1.5 right-1.5">
                  <RecentFlowMenu
                    flow={f}
                    onChanged={refresh}
                    onRename={openRename}
                    onAssign={openAssign}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Desktop layout (≥1024px) ── */}
      <div className="hidden lg:block px-6 pt-6 pb-28 max-w-[1200px] mx-auto space-y-6">
        {/* Greeting */}
        <div>
          <div className="text-xs font-semibold text-muted-foreground">
            {today}
          </div>
          <h1 className="text-[32px] font-extrabold tracking-tight text-foreground leading-tight">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            You have{" "}
            <span className="font-semibold text-primary">
              {loading ? "—" : (stats?.teamMembers ?? 0)} team members
            </span>{" "}
            collaborating.
          </p>
        </div>

        {/* Stat cards row */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            label="Total Flows"
            value={loading ? "—" : (stats?.totalFlows ?? 0)}
            icon={Workflow}
            tone="primary"
            trend="All flows"
          />
          <StatCard
            label="Edited This Month"
            value={loading ? "—" : (stats?.editedThisMonth ?? 0)}
            icon={FileText}
            tone="blue"
            trend="This month"
          />
          <StatCard
            label="Team Members"
            value={loading ? "—" : (stats?.teamMembers ?? 0)}
            icon={Users}
            tone="orange"
            trend="In your team"
          />
          <StatCard
            label="Shared Flows"
            value={loading ? "—" : (stats?.sharedFlows ?? 0)}
            icon={Share2}
            tone="coral"
            trend="Shared by you"
          />
        </div>

        {/* Activity chart + subscription widget */}
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 rounded-3xl bg-card p-6 shadow-card border border-border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[15px] font-bold text-foreground">
                  Flow Activity
                </div>
                <div className="text-xs text-muted-foreground">Last 7 days</div>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary" /> Created
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#006AA8]" /> Edited
                </span>
              </div>
            </div>
            {chartData.length > 0 ? (
              <BarChart data={chartData} />
            ) : (
              <div className="mt-4 h-36 flex items-center justify-center text-sm text-muted-foreground">
                No activity data yet
              </div>
            )}
          </div>

          {/* Subscription widget */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1F7D5E] via-primary to-[#2A9272] p-6 text-white shadow-card">
            <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
            <div className="flex items-center gap-2">
              {isTeamPlan ? (
                <Crown className="w-4 h-4 text-[#FFD27A]" />
              ) : (
                <Gift className="w-4 h-4 text-[#FFD27A]" />
              )}
              <span className="text-[11px] font-bold tracking-wider uppercase">
                {!subLoaded ? "—" : isTeamPlan ? "Team Plan" : "Free Plan"}
              </span>
            </div>
            <div className="mt-2 text-2xl font-extrabold">
              {isTeamPlan
                ? `${loading ? "—" : (stats?.teamMembers ?? 0)} members`
                : "No active subscription"}
            </div>
            {aiCredits != null && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-[#FFD27A]" />
                {aiCredits} AI credits remaining
              </div>
            )}
            <div className="mt-3 text-xs text-white/85">
              {inheritedPlan
                ? "Team plan provided by this workspace"
                : isTeamPlan
                  ? "Manage your team plan, billing, and member access."
                  : "Upgrade to a Team plan to collaborate"}
            </div>
            <button
              onClick={() => router.push("/dashboard/subscription")}
              className="bg-transparent border-0 p-0 appearance-none cursor-pointer mt-6 h-10 px-4 rounded-xl font-bold text-sm inline-flex items-center gap-2 text-[#1F7D5E]"
              style={{ background: "white" }}
            >
              {inheritedPlan
                ? "View Plans"
                : isTeamPlan
                  ? "Manage Subscription"
                  : "View Plans"}{" "}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom row: recent flows + my activity */}
        <div className="grid grid-cols-3 gap-6">
          {/* Recent flows — 2 cols */}
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[22px] font-bold text-foreground">
                Recent flows
              </div>
              <button
                onClick={() => router.push("/dashboard/flows")}
                className="bg-transparent border-0 p-0 appearance-none cursor-pointer text-sm font-semibold text-primary inline-flex items-center gap-1"
              >
                See all <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {Array.isArray(recentFlows) &&
                recentFlows.slice(0, 4).map((f, idx) => (
                  <div
                    key={f.id}
                    className="relative rounded-2xl border border-border overflow-hidden shadow-card text-left w-full"
                    style={{ background: "white" }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        window.open(`/dashboard/flows/${f.id}`, "_blank")
                      }
                      className="block w-full text-left bg-transparent border-0 p-0 appearance-none cursor-pointer"
                    >
                      <div className="h-28 bg-gradient-to-br from-secondary to-white relative overflow-hidden">
                        {f.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={f.thumbnail}
                            alt={f.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <MiniFlow
                            color={FLOW_COLORS[idx % FLOW_COLORS.length]}
                          />
                        )}
                        {f.isFavorite && (
                          <HeartFilled
                            style={{ color: "#FF4D6A", fontSize: 12 }}
                            className="absolute top-2 left-2"
                          />
                        )}
                      </div>
                      <div className="p-4">
                        <div className="font-semibold text-sm truncate text-foreground">
                          {f.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Updated {getTimeAgo(f.updatedAt)}
                        </div>
                      </div>
                    </button>
                    <div className="absolute top-2 right-2">
                      <RecentFlowMenu
                        flow={f}
                        onChanged={refresh}
                        onRename={openRename}
                        onAssign={openAssign}
                      />
                    </div>
                  </div>
                ))}
              {(!recentFlows || recentFlows.length === 0) && !loading && (
                <div className="col-span-2 text-center text-sm text-muted-foreground py-8">
                  No recent flows. Create your first flow!
                </div>
              )}
            </div>
          </div>

          {/* My Activity — 1 col */}
          <div className="rounded-3xl bg-card p-6 shadow-card border border-border">
            <div className="text-[15px] font-bold text-foreground mb-4">
              My Activity
            </div>
            {Array.isArray(teamActivity) && teamActivity.length > 0 ? (
              <div className="space-y-4">
                {teamActivity.slice(0, 6).map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      {item.userImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.userImage}
                          alt={item.userName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-bold text-primary">
                          {item.userName?.charAt(0)?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">
                        {item.userName}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {item.action === "created" ? "Created" : "Updated"}{" "}
                        <span className="font-medium">{item.flowName}</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground shrink-0">
                      {getTimeAgo(item.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-8">
                {activityEmptyMsg}
              </div>
            )}
          </div>
        </div>
      </div>
      {recentFlowModals}
    </div>
  );
}

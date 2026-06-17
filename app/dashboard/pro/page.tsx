"use client";

import { useEffect, useState } from "react";
import { Button, message } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { aiApi } from "@/api/ai.api";
import { useDashboard } from "@/hooks/useDashboard";
import { usePro } from "@/hooks/usePro";
import { useAuth } from "@/hooks/useAuth";
import { useAiBilling } from "@/context/AiBillingContext";
import { useRouter } from "next/navigation";
import { Workflow, FileText, Share2, Crown, ChevronRight } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import MiniFlow from "@/components/dashboard/MiniFlow";
import { FlowUsageBar } from "@/components/dashboard/FlowUsageBar";

// ─── Local atoms (Dashboard-only) ────────────────────────────────────────────

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

function getTimeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
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

export default function ProDashboardPage() {
  const { user } = useAuth();
  const { proFlows, status } = usePro();
  const { activeOption } = useAiBilling();
  const planCredits = activeOption.aiCredits?.planCredits || 0;
  const addonCredits = activeOption.aiCredits?.addonCredits || 0;
  const router = useRouter();

  const isUnlimited = status?.isUnlimited ?? false;
  const totalAiCredits = (planCredits || 0) + (addonCredits || 0);
  const aiUsed = 0; // plan-level used credits not exposed by current API; show progress via addonCredits
  const aiMax = planCredits || 500;
  const aiPct =
    Math.min(
      100,
      Math.round(
        ((aiMax - Math.max(0, planCredits - addonCredits)) / aiMax) * 100,
      ),
    ) || 0;

  const [subStatus, setSubStatus] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    fetch("/api/subscription/status")
      .then((r) => r.json())
      .then((d) => setSubStatus(d?.data?.status ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const success = params.get("addon_success");
    const cancelled = params.get("addon_cancelled");

    if (success === "true") {
      const credits = params.get("credits");
      const sessionId = params.get("session_id");
      window.history.replaceState({}, "", "/dashboard/pro");
      const finish = async () => {
        if (sessionId) {
          try {
            await aiApi.verifyAddonPurchase(sessionId);
          } catch {
            // Silent — webhook may have already credited
          }
        }
        message.success(
          credits
            ? `${credits} AI credits added to your account!`
            : "AI credits added to your account!",
        );
        window.dispatchEvent(new CustomEvent("aiCreditsChanged"));
      };
      finish();
    } else if (cancelled === "true") {
      message.info("Credit purchase cancelled");
      window.history.replaceState({}, "", "/dashboard/pro");
    }
  }, []);

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

  const { stats, activity, recentFlows, loading } = useDashboard({
    fetchTeamActivity: false,
  });

  // Build chart data from activity (last 7 entries)
  const chartData = Array.isArray(activity)
    ? activity.slice(-7).map((a) => ({
        label: a.label || a.date?.slice(5) || "",
        created: a.created || 0,
        edited: a.edited || 0,
      }))
    : [];

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const firstName = user?.name?.split(" ")[0] || "there";

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

      {/* Flow usage + Buy More Flows — shows for base/standard/unlimited/grace
          states via usePro (restored on the Pro dashboard). */}
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
      <div className="lg:hidden px-5 pt-3 space-y-5">
        {/* Greeting */}
        <div>
          <div className="text-xs font-semibold text-muted-foreground">
            {today}
          </div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-foreground leading-tight">
            Good morning, {firstName} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            You have{" "}
            <span className="font-semibold text-primary">
              {loading ? "—" : (stats?.totalFlows ?? 0)} flows
            </span>{" "}
            in your account.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Total Flows"
            value={loading ? "—" : (stats?.totalFlows ?? 0)}
            icon={Workflow}
            tone="primary"
            trend={
              proFlows
                ? `${proFlows.used} / ${isUnlimited ? "∞" : proFlows.max}`
                : "—"
            }
          />
          <StatCard
            label="Edited"
            value={loading ? "—" : (stats?.editedThisMonth ?? 0)}
            icon={FileText}
            tone="blue"
            trend="This month"
          />
          <StatCard
            label="AI Credits"
            value={loading ? "—" : totalAiCredits.toLocaleString()}
            icon={Crown}
            tone="orange"
            trend={addonCredits > 0 ? `+${addonCredits} addon` : "Available"}
          />
          <StatCard
            label="Shared Flows"
            value={loading ? "—" : (stats?.sharedFlows ?? 0)}
            icon={Share2}
            tone="coral"
            trend="Shared"
          />
        </div>

        {/* AI Credits card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1F7D5E] via-primary to-[#2A9272] p-5 text-white shadow-card">
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-[#FFD27A]" />
            <span className="text-[11px] font-bold tracking-wider uppercase">
              Pro Monthly
            </span>
          </div>
          <div className="mt-2 text-2xl font-extrabold">
            {loading ? "—" : totalAiCredits.toLocaleString()}{" "}
            <span className="text-sm font-medium text-white/80">
              AI credits
            </span>
          </div>
          {planCredits > 0 && (
            <>
              <div className="mt-3 h-2 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white"
                  style={{
                    width: `${Math.min(100, Math.round((totalAiCredits / planCredits) * 100))}%`,
                  }}
                />
              </div>
              <div className="mt-2 text-xs text-white/85">
                {planCredits} plan + {addonCredits} addon credits
              </div>
            </>
          )}
          <button
            onClick={() => router.push("/dashboard/subscription")}
            className="bg-transparent border-0 p-0 appearance-none cursor-pointer mt-4 h-10 px-4 rounded-xl bg-white! text-[#1F7D5E] font-bold text-sm inline-flex items-center gap-2"
            style={{ background: "white" }}
          >
            Manage Subscription <ChevronRight className="w-4 h-4" />
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
        <div
          className="flex gap-3 -mx-5 px-5 overflow-x-auto pb-2"
          style={{ scrollbarWidth: "none" }}
        >
          {Array.isArray(recentFlows) &&
            recentFlows.slice(0, 4).map((f, idx) => (
              <button
                key={f.id}
                onClick={() =>
                  window.open(`/dashboard/flows/${f.id}`, "_blank")
                }
                className="bg-transparent border-0 p-0 appearance-none cursor-pointer shrink-0 w-44 rounded-2xl bg-card! border border-border overflow-hidden shadow-card text-left"
                style={{ background: "white" }}
              >
                <div className="h-24 bg-gradient-to-br from-secondary to-white relative">
                  <MiniFlow color={FLOW_COLORS[idx % FLOW_COLORS.length]} />
                </div>
                <div className="p-3">
                  <div className="font-semibold text-sm truncate text-foreground">
                    {f.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Edited {getTimeAgo(f.updatedAt)}
                  </div>
                </div>
              </button>
            ))}
        </div>
      </div>

      {/* ── Desktop layout (≥1024px) ── */}
      <div className="hidden lg:block px-6 pt-6 pb-10 max-w-[1200px] mx-auto space-y-6">
        {/* Greeting */}
        <div>
          <div className="text-xs font-semibold text-muted-foreground">
            {today}
          </div>
          <h1 className="text-[32px] font-extrabold tracking-tight text-foreground leading-tight">
            Good morning, {firstName} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            You have{" "}
            <span className="font-semibold text-primary">
              {loading ? "—" : (stats?.totalFlows ?? 0)} flows
            </span>{" "}
            in your account.
          </p>
        </div>

        {/* Stat cards row */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            label="Total Flows"
            value={loading ? "—" : (stats?.totalFlows ?? 0)}
            icon={Workflow}
            tone="primary"
            trend={
              proFlows
                ? `${proFlows.used} / ${isUnlimited ? "∞" : proFlows.max}`
                : "—"
            }
          />
          <StatCard
            label="Edited This Month"
            value={loading ? "—" : (stats?.editedThisMonth ?? 0)}
            icon={FileText}
            tone="blue"
            trend="This month"
          />
          <StatCard
            label="AI Credits"
            value={loading ? "—" : totalAiCredits.toLocaleString()}
            icon={Crown}
            tone="orange"
            trend={addonCredits > 0 ? `+${addonCredits} addon` : "Available"}
          />
          <StatCard
            label="Shared Flows"
            value={loading ? "—" : (stats?.sharedFlows ?? 0)}
            icon={Share2}
            tone="coral"
            trend="Shared"
          />
        </div>

        {/* Activity chart + AI Credits card */}
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

          {/* AI credits widget */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1F7D5E] via-primary to-[#2A9272] p-6 text-white shadow-card">
            <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-[#FFD27A]" />
              <span className="text-[11px] font-bold tracking-wider uppercase">
                Pro Monthly
              </span>
            </div>
            <div className="mt-2 text-2xl font-extrabold">
              {loading ? "—" : totalAiCredits.toLocaleString()}{" "}
              <span className="text-sm font-medium text-white/80">
                AI credits
              </span>
            </div>
            {planCredits > 0 && (
              <>
                <div className="mt-3 h-2 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-white"
                    style={{
                      width: `${Math.min(100, Math.round((totalAiCredits / planCredits) * 100))}%`,
                    }}
                  />
                </div>
                <div className="mt-2 text-xs text-white/85">
                  {planCredits} plan + {addonCredits} addon credits
                </div>
              </>
            )}
            <button
              onClick={() => router.push("/dashboard/subscription")}
              className="bg-transparent border-0 p-0 appearance-none cursor-pointer mt-6 h-10 px-4 rounded-xl font-bold text-sm inline-flex items-center gap-2 text-[#1F7D5E]"
              style={{ background: "white" }}
            >
              Manage Subscription <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Recent flows */}
        <div>
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
          <div className="grid grid-cols-4 gap-4">
            {Array.isArray(recentFlows) &&
              recentFlows.slice(0, 4).map((f, idx) => (
                <button
                  key={f.id}
                  onClick={() =>
                    window.open(`/dashboard/flows/${f.id}`, "_blank")
                  }
                  className="bg-transparent border-0 p-0 appearance-none cursor-pointer rounded-2xl bg-card! border border-border overflow-hidden shadow-card text-left w-full"
                  style={{ background: "white" }}
                >
                  <div className="h-28 bg-gradient-to-br from-secondary to-white relative">
                    <MiniFlow color={FLOW_COLORS[idx % FLOW_COLORS.length]} />
                  </div>
                  <div className="p-4">
                    <div className="font-semibold text-sm truncate text-foreground">
                      {f.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Edited {getTimeAgo(f.updatedAt)}
                    </div>
                  </div>
                </button>
              ))}
            {(!recentFlows || recentFlows.length === 0) && !loading && (
              <div className="col-span-4 text-center text-sm text-muted-foreground py-8">
                No recent flows. Create your first flow!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

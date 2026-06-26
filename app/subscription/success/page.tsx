"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CheckCircle,
  ArrowRight,
  Zap,
  Users,
  Package,
  Crown,
} from "lucide-react";
import { usePro } from "@/hooks/usePro";
import { useSession } from "next-auth/react";
import { getClientAppType } from "@/lib/detectWebView";
import { aiApi } from "@/api/ai.api";
import { proApi } from "@/api/pro.api";
import { getLogoForApp } from "@/lib/getLogo";

// ── Content map per purchase type ────────────────────────────────────────────

const AI_PACK_LABELS: Record<string, string> = {
  starter: "Starter Pack — 50 Credits",
  standard: "Standard Pack — 100 Credits",
  proppack: "Pro Pack — 200 Credits",
};

function getContent(
  type: string,
  plan: string,
  credits: string,
  packType: string,
) {
  switch (type) {
    case "ai_credits": {
      const creditCount = credits || "?";
      const packLabel = AI_PACK_LABELS[packType] || `${creditCount} AI Credits`;
      return {
        headline: "Credits Added!",
        subheadline: "Your AI credits are ready to use.",
        rowLabel: "Credits pack",
        rowValue: packLabel,
        bodyText:
          "Generate diagrams and run AI features anytime from the flow editor. Credits never expire.",
        Icon: Zap,
        iconBg: "#FEF9C3",
        iconColor: "#CA8A04",
      };
    }
    case "pro":
      return {
        headline: "Welcome to Pro!",
        subheadline: "Your lifetime Pro access is being activated.",
        rowLabel: "Active plan",
        rowValue: plan || "ValueCharts Pro",
        bodyText:
          "One-time payment. Lifetime access. All Pro features are unlocked — no recurring charges.",
        Icon: Crown,
        iconBg: "#FEF3C7",
        iconColor: "#D97706",
      };
    case "addon":
      return {
        headline: "Flow Add-on Activated!",
        subheadline: "Your monthly flow subscription is live.",
        rowLabel: "Active add-on",
        rowValue: plan || "Flow Add-on",
        bodyText:
          "Your flow limit has been increased and will renew automatically each month. Cancel anytime.",
        Icon: Package,
        iconBg: "#DCFCE7",
        iconColor: "#16A34A",
      };
    case "purchase":
      return {
        headline: "Flows Added!",
        subheadline: "Your flow pack is ready to use.",
        rowLabel: "Flow pack",
        rowValue: plan || "Flow Pack",
        bodyText:
          "Your new flows are available immediately. Use them anytime — they don't expire.",
        Icon: Package,
        iconBg: "#DCFCE7",
        iconColor: "#16A34A",
      };
    case "team":
    default:
      return {
        headline: "Subscription Activated!",
        subheadline: "Your team plan is now live.",
        rowLabel: "Active plan",
        rowValue: plan || "Team Plan",
        bodyText:
          "Invite members and start collaborating right away. Manage your plan from the subscription page.",
        Icon: Users,
        iconBg: "#DBEAFE",
        iconColor: "#1D4ED8",
      };
  }
}

// ── Inner component (needs useSearchParams so it's inside Suspense) ───────────

function SuccessPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentApp, forcedMode, loading } = usePro();
  const { update: updateSession } = useSession();
  const [countdown, setCountdown] = useState(10);
  const [verified, setVerified] = useState(false);
  const [proVerifying, setProVerifying] = useState(false);
  const [proVerified, setProVerified] = useState(false);
  const [mounted, setMounted] = useState(false);
  const proPollingRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const plan = searchParams?.get("plan") ?? "";
  const type = searchParams?.get("type") ?? "team";
  const credits = searchParams?.get("credits") ?? "";
  const packType = searchParams?.get("packType") ?? "";
  const sessionId = searchParams?.get("session_id") ?? "";
  const appContextParam = searchParams?.get("app_context") ?? "";

  // getClientAppType reads navigator.userAgent — only safe after mount
  const clientAppType = mounted ? getClientAppType() : "web";

  // Determine correct dashboard URL:
  // 1. app_context URL param is the most explicit signal (set by backend/page on every payment)
  // 2. Flutter UA (clientAppType) is authoritative for mobile shells
  // 3. forcedMode from sessionStorage (web tab context)
  // 4. currentApp from DB as final fallback
  const dashboardUrl = (() => {
    if (appContextParam === "team") return "/dashboard/team";
    if (appContextParam === "pro") return "/dashboard/pro";
    if (clientAppType === "team" || forcedMode === "team")
      return "/dashboard/team";
    if (clientAppType === "pro" || forcedMode === "pro")
      return "/dashboard/pro";
    if (currentApp === "pro") return "/dashboard/pro";
    return "/dashboard/team";
  })();

  // For AI credits: call verify endpoint (webhook fallback for local dev)
  useEffect(() => {
    if (!mounted || type !== "ai_credits" || !sessionId || verified) return;
    setVerified(true);
    aiApi.verifyAddonPurchase(sessionId).catch(() => {});
  }, [mounted, type, sessionId, verified]);

  // For flow pack (one-time purchase): webhook fallback — credits flows if
  // the Stripe webhook was delayed or missed (common in local dev).
  useEffect(() => {
    if (!mounted || type !== "purchase" || !sessionId || verified) return;
    setVerified(true);
    proApi.verifyFlowPurchase(sessionId).catch(() => {});
  }, [mounted, type, sessionId, verified]);

  // For monthly flow add-on: webhook fallback — activates subscription if
  // the Stripe webhook was delayed or missed.
  useEffect(() => {
    if (!mounted || type !== "addon" || !sessionId || verified) return;
    setVerified(true);
    proApi.verifyFlowAddon(sessionId).catch(() => {});
  }, [mounted, type, sessionId, verified]);

  // For Pro purchase ($5): poll verify endpoint then refresh NextAuth session.
  // Without updateSession() the JWT still has hasPro=false → dashboard bounces
  // the user back to /upgrade-pro.
  useEffect(() => {
    if (!mounted || type !== "pro" || !sessionId || proPollingRef.current)
      return;
    proPollingRef.current = true;
    setProVerifying(true);

    let attempts = 0;
    const maxAttempts = 15;
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      attempts++;
      try {
        const res = await proApi.verifyPurchase(sessionId);
        const data = res.data?.data || res.data;
        if (data?.verified || data?.alreadyActive) {
          await updateSession();
          setProVerified(true);
          setProVerifying(false);
          return;
        }
      } catch {}
      if (attempts < maxAttempts && !cancelled) setTimeout(poll, 2000);
      else if (!cancelled) setProVerifying(false);
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [mounted, type, sessionId, updateSession]);

  // Auto-redirect after 10 seconds (for pro: only after session is refreshed)
  useEffect(() => {
    if (!mounted || loading) return;
    if (type === "pro" && proVerifying) return;
    const tick = setInterval(() => {
      setCountdown((n) => {
        if (n <= 1) {
          clearInterval(tick);
          router.push(dashboardUrl);
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [mounted, loading, type, proVerifying, dashboardUrl, router]);

  // Don't render until client-side — prevents SSR/client hydration mismatch
  if (!mounted) return null;

  const content = getContent(type, plan, credits, packType);
  const {
    headline,
    subheadline,
    rowLabel,
    rowValue,
    bodyText,
    Icon,
    iconBg,
    iconColor,
  } = content;

  return (
    <div className="tw min-h-screen bg-[#F1F5F9] flex flex-col items-center justify-center p-4">
      {/* Branding — same logo logic as sidebar/header */}
      <div className="mb-8 flex items-center select-none">
        <img
          src={getLogoForApp(
            clientAppType === "team" || forcedMode === "team"
              ? "team"
              : clientAppType === "pro" ||
                  forcedMode === "pro" ||
                  currentApp === "pro"
                ? "pro"
                : null,
          )}
          alt="Value Charts"
          className="h-12 w-auto object-contain"
          style={{ objectPosition: "left center", maxHeight: 48 }}
        />
      </div>

      {/* Success card */}
      <div className="w-full max-w-md bg-white rounded-3xl border border-[#E2E8F0] shadow-[0_4px_24px_rgba(0,0,0,0.07)] overflow-hidden">
        {/* Green header */}
        <div className="bg-gradient-to-br from-[#3CB371] to-[#2A7A52] px-6 py-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-4">
            <CheckCircle className="w-9 h-9 text-white" strokeWidth={2.5} />
          </div>
          <div className="text-white text-[11px] font-bold tracking-[0.1em] uppercase mb-1 opacity-80">
            Payment Successful
          </div>
          <h1 className="text-white text-2xl font-extrabold leading-tight">
            {headline}
          </h1>
          <p className="text-white/80 text-[13px] mt-1">{subheadline}</p>
        </div>

        {/* Card body */}
        <div className="px-6 py-6">
          {/* What they got */}
          <div className="rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] px-4 py-4 flex items-center gap-3 mb-5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: iconBg }}
            >
              <Icon className="w-5 h-5" style={{ color: iconColor }} />
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-wider text-[#64748B] uppercase">
                {rowLabel}
              </div>
              <div className="text-[15px] font-bold text-[#0F172A] mt-0.5">
                {rowValue}
              </div>
            </div>
          </div>

          {/* AI credits: show credit count prominently */}
          {type === "ai_credits" && credits && (
            <div className="flex items-center justify-center gap-2 mb-4 py-3 rounded-2xl bg-[#FEFCE8] border border-[#FEF08A]">
              <Zap className="w-5 h-5 text-[#CA8A04]" />
              <span className="text-[#92400E] font-extrabold text-lg">
                {credits} credits added to your account
              </span>
            </div>
          )}

          {/* Message */}
          <p className="text-[13px] text-[#475569] text-center mb-6 leading-relaxed">
            {bodyText}
          </p>

          {/* Pro: show verifying spinner while polling webhook */}
          {type === "pro" && proVerifying && (
            <div className="flex flex-col items-center gap-2 mb-5 py-3 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A]">
              <div className="w-5 h-5 border-2 border-[#D97706] border-t-transparent rounded-full animate-spin" />
              <span className="text-[12px] text-[#92400E] font-medium">
                Activating your Pro access…
              </span>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={() => router.push(dashboardUrl)}
            disabled={loading || (type === "pro" && proVerifying)}
            className="w-full h-12 rounded-2xl bg-[#3CB371] hover:bg-[#2A7A52] text-white font-bold text-[15px] flex items-center justify-center gap-2 transition-colors appearance-none border-0 cursor-pointer disabled:opacity-60"
          >
            {type === "pro" && proVerifying ? "Activating…" : "Go to Dashboard"}
            {!(type === "pro" && proVerifying) && (
              <ArrowRight className="w-4 h-4" />
            )}
          </button>

          {/* Auto-redirect notice */}
          {!loading && !(type === "pro" && proVerifying) && countdown > 0 && (
            <div className="text-center text-[11px] text-[#94A3B8] mt-3">
              Redirecting automatically in {countdown}s
            </div>
          )}
        </div>
      </div>

      {/* Footer note */}
      <div className="mt-6 text-[12px] text-[#94A3B8] text-center">
        A receipt has been sent to your email address.
      </div>
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense>
      <SuccessPageInner />
    </Suspense>
  );
}

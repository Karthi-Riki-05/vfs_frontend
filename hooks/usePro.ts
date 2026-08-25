"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { proApi } from "@/api/pro.api";
import { onWorkspaceFlush } from "@/lib/workspaceCache";
import { IAP_GRANTED_EVENT } from "@/lib/iapBridge";

interface ProFlows {
  used: number;
  max: number;
  baseLimit: number;
  extraPurchased: number;
}

interface FlowPackPurchase {
  id: string;
  flowCount: number;
  amountCents: number;
  packType: string;
  isUnlimited: boolean;
  status: string;
  expiresAt: string | null;
  gracePeriodEndsAt: string | null;
  createdAt: string;
}

interface ProStatus {
  currentApp: "free" | "pro";
  hasPro: boolean;
  isUnlimited: boolean;
  proPurchasedAt: string | null;
  proFlows: ProFlows;
  flowPackPurchases?: FlowPackPurchase[];
}

// ── Shared store ───────────────────────────────────────────────────────────
// `usePro` has 16 call sites, and `useAppBrand` calls it too, so 7 more
// components inherit it. As a plain per-instance hook that meant one
// GET /pro/app-status PER CONSUMER: measured 6 on a Team page load and 23 on a
// Pro one, ×2 because switching apps reloads the page twice. Against the
// 600-req/2-min limiter that is what produced "Too many requests" while
// toggling Team⇄Pro, and every duplicate response drove its own render.
//
// The module-level store below makes N consumers share ONE request and ONE
// snapshot. It is deliberately not a React context: the hook is called from
// route pages and layout components alike, and a provider would have to wrap
// them all. `AiBillingContext`/`AppContext` (already 1x per load) show the
// other half of the same idea.
type ProSnapshot = {
  status: ProStatus | null;
  loading: boolean;
  fetchError: boolean;
};

let snapshot: ProSnapshot = { status: null, loading: true, fetchError: false };
let inflight: Promise<void> | null = null;
let loadedForUser: string | null = null;
const subscribers = new Set<(s: ProSnapshot) => void>();

function publish(next: Partial<ProSnapshot>) {
  snapshot = { ...snapshot, ...next };
  subscribers.forEach((fn) => fn(snapshot));
}

/**
 * Fetch once per user, however many consumers ask. Concurrent callers await the
 * SAME promise — that is what collapses a mount storm into a single request.
 */
function loadProStatus(force = false): Promise<void> {
  if (inflight) return inflight;
  if (!force && snapshot.status) return Promise.resolve();
  publish({ fetchError: false });
  inflight = (async () => {
    try {
      const res = await proApi.getAppStatus();
      publish({ status: res.data?.data || res.data, loading: false });
    } catch (err: any) {
      console.error(
        "[usePro] fetchStatus error:",
        err?.response?.status,
        err?.message,
      );
      publish({ fetchError: true, loading: false });
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Drop the cache — on sign-out, user change, or a workspace switch. */
function resetProStatus() {
  loadedForUser = null;
  publish({ status: null, loading: true });
}

/**
 * Test seam. The store is module-level and deliberately survives unmounts (that
 * is what makes N consumers cost one request), so it also survives between test
 * cases — each one must start from a clean slate.
 */
export function __resetProStore() {
  inflight = null;
  loadedForUser = null;
  subscribers.clear();
  snapshot = { status: null, loading: true, fetchError: false };
}

export function usePro() {
  const { data: session, status: sessionStatus } = useSession();
  const [local, setLocal] = useState<ProSnapshot>(snapshot);
  const { status, loading, fetchError } = local;

  // Subscribe first, so a consumer mounting mid-flight still receives the
  // result of the request another consumer already started.
  useEffect(() => {
    setLocal(snapshot);
    subscribers.add(setLocal);
    return () => {
      subscribers.delete(setLocal);
    };
  }, []);
  // Must start as null on both server and client — any other initial value
  // causes a React hydration mismatch (server renders null, client reads
  // sessionStorage and gets 'pro'/'team'). The useEffect below populates it
  // after hydration, which is safe and SSR-correct.
  const [forcedMode, setForcedMode] = useState<"team" | "pro" | null>(null);

  useEffect(() => {
    try {
      // forcedMode = "we are inside a forced mobile app shell" (hides the
      // app switcher). The ONLY reliable signal is `vc_app_param`, which
      // app/page.tsx sets ONLY when the URL carries an explicit ?app=team
      // or ?app=pro (i.e. the Flutter WebView). It is removed on plain web
      // visits, so it stays null on the website.
      //
      // Do NOT read `vc_app_context` here — that key defaults to "team" even
      // for plain web visits, so it can never distinguish web from the team
      // mobile app and would wrongly hide the switcher on the website.
      let stored = sessionStorage.getItem("vc_app_param");
      if (!stored) {
        // Migrate from legacy vc_forced_app_mode (set by upgrade-pro page).
        stored = sessionStorage.getItem("vc_forced_app_mode");
        if (stored === "pro" || stored === "team") {
          sessionStorage.setItem("vc_app_param", stored);
          sessionStorage.removeItem("vc_forced_app_mode");
        }
      }
      if (stored === "team" || stored === "pro") setForcedMode(stored);
    } catch {
      // sessionStorage blocked
    }
  }, []);

  // Force a refetch through the shared store — exposed as `refresh`.
  const fetchStatus = useCallback(async () => {
    await loadProStatus(true);
  }, []);

  // bug-155: a store grant confirmed by iapBridge must land here even when the
  // purchase screen has already been navigated away from — Pro access and the
  // flow add-on both read from this snapshot.
  useEffect(() => {
    const onGranted = () => void fetchStatus();
    window.addEventListener(IAP_GRANTED_EVENT, onGranted);
    return () => window.removeEventListener(IAP_GRANTED_EVENT, onGranted);
  }, [fetchStatus]);

  // Use a STABLE primitive as the effect key. NextAuth replaces the
  // `session` object identity on every silent refresh; depending on the
  // object here caused /api/v1/pro/app-status to be polled every few
  // seconds (hit rate-limit).
  const userKey =
    (session?.user as any)?.id || (session?.user as any)?.email || null;
  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!userKey) {
      // Signed out: drop the previous user's snapshot so it can never be read
      // by the next one, and stop showing a spinner forever.
      loadedForUser = null;
      publish({ status: null, loading: false });
      return;
    }
    // The user changed (or this is the first consumer): fetch once. Every other
    // consumer that mounts in the same tick joins the in-flight promise instead
    // of starting its own request.
    if (loadedForUser !== userKey) {
      loadedForUser = userKey;
      loadProStatus(true);
    } else {
      loadProStatus();
    }
  }, [userKey, sessionStatus]);

  // Re-scope on workspace switch: clear the previous workspace's Pro/flow
  // status so any UI gated on proFlows can't bleed across, then refetch under
  // the new X-Workspace-Context. Mirrors useFlows' onWorkspaceFlush handling.
  //
  // Registered by every consumer, but the store collapses them: the first
  // reset+load wins and the rest join its promise, so a workspace switch costs
  // one request rather than one per consumer.
  useEffect(
    () =>
      onWorkspaceFlush(() => {
        resetProStatus();
        loadProStatus(true);
      }),
    [],
  );

  const switchApp = useCallback(async (app: "free" | "pro") => {
    try {
      const res = await proApi.switchApp(app);
      const data = res.data?.data || res.data;

      // Backend returns { requiresPurchase: true, url } when the user
      // hasn't bought Pro yet — Pro is a separate one-time $5 product
      // that team-plan owners must buy explicitly. Redirect to checkout.
      if (data?.requiresPurchase && data?.url) {
        window.location.href = data.url;
        return false;
      }

      // Pro and Team are different apps — leaving Pro mode shouldn't
      // keep the user inside a Team workspace context (that would render
      // the Team dashboard view inside the Pro app). Reset to personal.
      try {
        const STORAGE_KEY = "vc_active_context";
        const next = { type: "personal" };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(
          new CustomEvent("vc:context-change", { detail: next }),
        );
      } catch {
        /* localStorage may be blocked */
      }

      // Keep X-App-Context header in sync with the new app mode so all
      // subsequent API calls hit the correct server-side appContext bucket.
      // Write to sessionStorage (per-tab) — does not affect sibling tabs (Fix 2).
      try {
        if (app === "pro") {
          sessionStorage.setItem("vc_app_context", "pro");
        } else {
          sessionStorage.removeItem("vc_app_context");
        }
      } catch {
        /* sessionStorage may be blocked in restricted WebViews */
      }

      // Publish to the shared snapshot so EVERY consumer sees the new app
      // immediately — previously each hook instance updated only its own copy,
      // so the sidebar could disagree with the header until a reload.
      publish({
        status: snapshot.status
          ? { ...snapshot.status, currentApp: app }
          : snapshot.status,
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  const purchasePro = useCallback(async () => {
    try {
      const res = await proApi.purchasePro();
      const data = res.data?.data || res.data;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      throw err;
    }
  }, []);

  const buyFlows = useCallback(async (flowPackage: "50" | "unlimited") => {
    try {
      const res = await proApi.buyFlows(flowPackage);
      const data = res.data?.data || res.data;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      throw err;
    }
  }, []);

  const hasPro = status?.hasPro ?? false;
  const proPurchasedAt = status?.proPurchasedAt ?? null;

  return {
    status,
    loading,
    fetchError,
    hasPro,
    proPurchasedAt,
    isProOwner: hasPro && proPurchasedAt !== null,
    currentApp: status?.currentApp ?? "free",
    proFlows: status?.proFlows ?? null,
    forcedMode,
    switchApp,
    purchasePro,
    buyFlows,
    refresh: fetchStatus,
  };
}

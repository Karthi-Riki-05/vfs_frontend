"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

const MIN_DISPLAY_MS = 1200; // always show at least 1.2s — prevents jarring flash
const MAX_WAIT_MS = 8000; // safety net

// sessionStorage flag — gates the splash so it only shows on first page load
// (fresh tab) and on app-context switch, NOT on normal route navigation.
// The stored VALUE is the appMode: a mismatch means the context actually
// changed (team↔pro), so the splash is re-shown after the switch reload.
const CONTEXT_LOADED_KEY = "vc_context_loaded";

function normalizeMode(appMode?: string | null): string {
  return appMode ?? "";
}

// True when we've already shown the splash for THIS app context in this tab.
function alreadyLoadedFor(appMode?: string | null): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      sessionStorage.getItem(CONTEXT_LOADED_KEY) === normalizeMode(appMode)
    );
  } catch {
    return false;
  }
}

function markLoaded(appMode?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CONTEXT_LOADED_KEY, normalizeMode(appMode));
  } catch {
    /* sessionStorage unavailable (private mode / SSR) — splash just shows again */
  }
}

interface AppContextLoaderProps {
  children: React.ReactNode;
  /** AiBillingContext finished — fires on every dashboard page */
  isContextReady: boolean;
  /** useFlows finished — fast-path for the flows page */
  isFlowsReady: boolean;
  appMode?: string | null;
}

export function AppContextLoader({
  children,
  isContextReady,
  isFlowsReady,
  appMode,
}: AppContextLoaderProps) {
  // Deterministic initial state — MUST be identical on server and client to
  // avoid a hydration mismatch on this subtree (which previously left the
  // splash wedged). The mount effect below reconciles the already-loaded case.
  const [showLoader, setShowLoader] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  // sizeChecked: guards the hide-logic so it never fires before we know the
  // screen size. Without this, the initial isMobileOrTablet=false would
  // immediately call setShowLoader(false) before the size effect runs.
  const [sizeChecked, setSizeChecked] = useState(false);

  const mountTimeRef = useRef<number>(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // appMode is read via a ref so the hide/safety timers are NEVER reset when
  // forcedMode resolves (null → 'team'/'pro'). Previously appMode was an effect
  // dependency, so that single transition could clear and re-arm the timers and
  // push dismissal back indefinitely if it churned.
  const appModeRef = useRef(appMode);
  appModeRef.current = appMode;

  const dismiss = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    markLoaded(appModeRef.current);
    setFadeOut(true);
    fadeTimerRef.current = setTimeout(() => setShowLoader(false), 400);
  }, []);

  // Step 1: mount — detect size, reconcile the already-loaded case, and arm the
  // ABSOLUTE safety net exactly once. The safety timer lives in this []-deps
  // effect so nothing (appMode churn, re-renders, prop changes) can clear or
  // reset it — the splash therefore can never hang past MAX_WAIT_MS.
  useEffect(() => {
    mountTimeRef.current = Date.now();
    setIsMobileOrTablet(window.innerWidth < 1024);
    setSizeChecked(true);

    // Plain route navigation within an already-loaded context → no splash.
    if (alreadyLoadedFor(appModeRef.current)) setShowLoader(false);

    safetyTimerRef.current = setTimeout(dismiss, MAX_WAIT_MS);

    function onResize() {
      setIsMobileOrTablet(window.innerWidth < 1024);
    }
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [dismiss]);

  // Step 2: hide loader once context/flows are ready (respects MIN_DISPLAY_MS).
  // appMode is intentionally excluded from deps (read via appModeRef).
  useEffect(() => {
    if (!sizeChecked) return;

    // Already played for this app context (plain route nav) → never show again.
    if (alreadyLoadedFor(appModeRef.current)) {
      setShowLoader(false);
      return;
    }

    if (!isMobileOrTablet) {
      // Desktop: dismiss immediately (the sizeChecked gate prevents premature firing)
      markLoaded(appModeRef.current);
      setShowLoader(false);
      return;
    }

    if (isContextReady || isFlowsReady) {
      const elapsed = Date.now() - mountTimeRef.current;
      const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);

      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(dismiss, remaining);
    }
  }, [isContextReady, isFlowsReady, isMobileOrTablet, sizeChecked, dismiss]);

  // Desktop — render children without any wrapper overhead
  if (sizeChecked && !isMobileOrTablet) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Children pre-render behind overlay — instant reveal, no re-fetch */}
      <div
        data-testid="app-content"
        style={{
          visibility: showLoader ? "hidden" : "visible",
          position: showLoader ? "fixed" : "relative",
          width: "100%",
          height: showLoader ? "100vh" : "auto",
          overflow: showLoader ? "hidden" : "visible",
          zIndex: showLoader ? -1 : "auto",
        }}
      >
        {children}
      </div>

      {showLoader && (
        <div
          className="tw"
          data-testid="app-context-loader"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            transition: "opacity 0.4s ease",
            opacity: fadeOut ? 0 : 1,
          }}
        >
          <div className="h-full bg-gradient-to-br from-primary via-primary to-[#1F7D5E] flex flex-col items-center justify-center text-white">
            {/* Logo — zoom-in on mount */}
            <div className="animate-in zoom-in duration-700">
              <img
                src="/Logo/logo.png"
                alt="Value Charts"
                style={{ width: 120, height: "auto", objectFit: "contain" }}
              />
            </div>

            {/* Wordmark */}
            <div className="mt-6 text-2xl font-extrabold tracking-tight">
              Value Charts
            </div>
            <div className="mt-1 text-sm text-white/85">
              We Add Value To Your Business
            </div>

            {/* Pulsing dots */}
            <div className="mt-12 flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-white/70 animate-pulse"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>

            {/* Footer caption */}
            <div className="absolute bottom-10 text-xs text-white/70">
              Loading your workspace…
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import React, { useState, useEffect, useRef } from "react";

const MIN_DISPLAY_MS = 1200; // always show at least 1.2s — prevents jarring flash
const MAX_WAIT_MS = 8000; // safety net

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

  // Step 1: detect screen size on mount (sync, before any hide logic can run)
  useEffect(() => {
    mountTimeRef.current = Date.now();
    setIsMobileOrTablet(window.innerWidth < 1024);
    setSizeChecked(true);

    function onResize() {
      setIsMobileOrTablet(window.innerWidth < 1024);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Step 2: hide loader — only after size is known, respects MIN_DISPLAY_MS
  useEffect(() => {
    if (!sizeChecked) return;

    if (!isMobileOrTablet) {
      // Desktop: dismiss immediately (the sizeChecked gate prevents premature firing)
      setShowLoader(false);
      return;
    }

    if (isContextReady || isFlowsReady) {
      const elapsed = Date.now() - mountTimeRef.current;
      const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);

      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
        setFadeOut(true);
        fadeTimerRef.current = setTimeout(() => setShowLoader(false), 400);
      }, remaining);
    }
  }, [isContextReady, isFlowsReady, isMobileOrTablet, sizeChecked]);

  // Step 3: safety net — show page after MAX_WAIT_MS no matter what
  useEffect(() => {
    if (!sizeChecked || !isMobileOrTablet) return;

    safetyTimerRef.current = setTimeout(() => {
      setFadeOut(true);
      fadeTimerRef.current = setTimeout(() => setShowLoader(false), 400);
    }, MAX_WAIT_MS);

    return () => {
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [sizeChecked, isMobileOrTablet]);

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
          data-testid="app-context-loader"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "#f0faf5",
            background:
              "linear-gradient(160deg, #f0faf5 0%, #e8f7ef 50%, #f5fff8 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "20px",
            transition: "opacity 0.4s ease",
            opacity: fadeOut ? 0 : 1,
          }}
        >
          {/* SVG circular progress with brand symbol in center */}
          <div style={{ position: "relative", width: "96px", height: "96px" }}>
            <svg
              width="96"
              height="96"
              viewBox="0 0 96 96"
              style={{
                position: "absolute",
                inset: 0,
                animation: "vc-rotate 1.4s linear infinite",
              }}
            >
              {/* Track circle */}
              <circle
                cx="48"
                cy="48"
                r="42"
                fill="none"
                stroke="#c6e8d5"
                strokeWidth="5"
              />
              {/* Progress arc (brand green) — ~75% visible */}
              <circle
                cx="48"
                cy="48"
                r="42"
                fill="none"
                stroke="#3CB371"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray="263.9"
                strokeDashoffset="197.9"
                transform="rotate(-90 48 48)"
              />
            </svg>

            {/* Brand symbol in center */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Square brand symbol only — the wordmark PNGs (500x150) get
                  squeezed and show the full "ValueChart Pro" logo in the ring */}
              <img
                src="/Logo/Symbol.png"
                alt="ValueChart"
                style={{ width: "40px", height: "40px", objectFit: "contain" }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          </div>

          {/* Loading text */}
          <div
            style={{
              fontSize: "12px",
              color: "#9ca3af",
              letterSpacing: "0.2px",
              fontWeight: "500",
            }}
          >
            Loading your workspace...
          </div>

          <style>{`
            @keyframes vc-rotate {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
    </>
  );
}

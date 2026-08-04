"use client";

import React, { useEffect, useRef, useState } from "react";

// Renders a real, fitted preview of an mxGraph diagram using draw.io's bundled
// read-only viewer (public/draw_io/js/viewer.min.js) — NOT the full editor. Used
// as the AI chat result thumbnail so the user sees the ACTUAL diagram, not a
// generic placeholder icon. Same-origin, loaded once, lazily. Falls back to a
// 📊 tile if the viewer can't render, so it is never worse than before.

let viewerPromise: Promise<void> | null = null;
function loadGraphViewer(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).GraphViewer) return Promise.resolve();
  if (viewerPromise) return viewerPromise;
  viewerPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "/draw_io/js/viewer.min.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      viewerPromise = null;
      reject(new Error("draw.io viewer failed to load"));
    };
    document.body.appendChild(s);
  });
  return viewerPromise;
}

interface DiagramThumbnailProps {
  xml: string;
  height?: number;
  onClick?: () => void;
  // interactive = the inline "live container": pan/zoom nav enabled, no
  // fit-to-height down-scaling (so panning math stays correct). Default false =
  // a static fitted thumbnail.
  interactive?: boolean;
}

export default function DiagramThumbnail({
  xml,
  height = 150,
  onClick,
  interactive = false,
}: DiagramThumbnailProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!xml || !hostRef.current) return;
    setFailed(false);

    loadGraphViewer()
      .then(() => {
        if (cancelled || !hostRef.current) return;
        const GV = (window as any).GraphViewer;
        if (!GV || typeof GV.createViewerForElement !== "function") {
          setFailed(true);
          return;
        }

        // Fresh render each time the xml changes. The holder is a real
        // block-width element (NOT a 0-width flex child) so the viewer has a
        // width to fit to — that was the blank-render bug.
        const host = hostRef.current;
        host.innerHTML = "";
        const holder = document.createElement("div");
        holder.className = "mxgraph";
        holder.style.width = "100%";
        holder.setAttribute(
          "data-mxgraph",
          JSON.stringify({
            xml,
            highlight: "#ffffff00",
            nav: interactive, // pan/zoom controls in the live container
            resize: true, // fit graph to the holder's width
            center: true,
            border: interactive ? 12 : 6,
            toolbar: interactive ? "zoom" : null,
            lightbox: false,
          }),
        );
        host.appendChild(holder);

        try {
          GV.createViewerForElement(holder, () => {
            if (typeof window.requestAnimationFrame === "function") {
              window.requestAnimationFrame(() => {
                if (cancelled) return;
                const rendered = holder.offsetHeight;
                // Static thumbnail: scale the width-fitted graph down so the
                // WHOLE diagram fits the fixed-height box. Interactive container:
                // leave it — the user pans/zooms, box just clips + scrolls.
                if (!interactive && rendered > height + 2) {
                  const s = height / rendered;
                  holder.style.transform = `scale(${s})`;
                  holder.style.transformOrigin = "top center";
                }
                // Nothing drew at all → show fallback tile.
                if (!holder.querySelector("svg") && rendered < 4)
                  setFailed(true);
              });
            }
          });
        } catch {
          setFailed(true);
        }
      })
      .catch(() => setFailed(true));

    return () => {
      cancelled = true;
    };
  }, [xml, height, interactive]);

  return (
    <div
      onClick={onClick}
      title={onClick ? "Click to preview" : undefined}
      className="vc-diagram-materialize"
      style={{
        width: "100%",
        height,
        overflow: interactive ? "auto" : "hidden",
        background: "#ffffff",
        cursor: onClick ? "pointer" : "default",
        display: failed ? "flex" : "block",
        alignItems: "center",
        justifyContent: "center",
        fontSize: failed ? 24 : undefined,
      }}
    >
      {failed ? "📊" : <div ref={hostRef} style={{ width: "100%" }} />}
      <style>{`
        @keyframes vcDiagramFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .vc-diagram-materialize { animation: vcDiagramFadeIn 0.45s ease-out; }
      `}</style>
    </div>
  );
}

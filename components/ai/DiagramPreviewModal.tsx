"use client";

import React, { useEffect, useRef, useState } from "react";

interface DiagramPreviewModalProps {
  visible: boolean;
  xml: string;
  onClose: () => void;
  onInsert: () => void;
}

export default function DiagramPreviewModal({
  visible,
  xml,
  onClose,
  onInsert,
}: DiagramPreviewModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);

  // Reset loaded state when modal opens for a new XML
  useEffect(() => {
    if (visible) setLoaded(false);
  }, [visible, xml]);

  // ESC to close
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, onClose]);

  // Listen for draw.io init → push XML
  useEffect(() => {
    if (!visible || !xml) return;
    const handler = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      try {
        const data = JSON.parse(e.data);
        if (data.event === "init") {
          iframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ action: "load", xml, autosave: 0 }),
            "*",
          );
        }
      } catch {}
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [visible, xml]);

  const handleIframeLoad = () => {
    setLoaded(true);
    // Fallback push in case init event already fired
    setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ action: "load", xml, autosave: 0 }),
        "*",
      );
    }, 500);
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.7)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          width: "80vw",
          maxWidth: 900,
          height: "75vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid #e8e8e8",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#fafafa",
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 15, color: "#333" }}>
            Diagram Preview
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 20,
              cursor: "pointer",
              color: "#888",
              lineHeight: 1,
              padding: "0 4px",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ flex: 1, position: "relative", background: "#f5f5f5" }}>
          {!loaded && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#888",
                fontSize: 14,
              }}
            >
              Loading preview...
            </div>
          )}
          <iframe
            ref={iframeRef}
            src="/draw_io/index.html?embed=1&proto=json&noExitBtn=1&noSaveBtn=1&chrome=0&nav=0&spin=0&ui=min"
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              opacity: loaded ? 1 : 0,
              transition: "opacity 0.3s",
            }}
            onLoad={handleIframeLoad}
          />
        </div>

        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid #e8e8e8",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            background: "#fafafa",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 20px",
              border: "1px solid #ddd",
              borderRadius: 6,
              background: "#fff",
              cursor: "pointer",
              fontSize: 13,
              color: "#555",
            }}
          >
            Close
          </button>
          <button
            onClick={() => {
              onInsert();
              onClose();
            }}
            style={{
              padding: "8px 20px",
              border: "none",
              borderRadius: 6,
              background: "#3CB371",
              color: "#fff",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            + Insert into Canvas
          </button>
        </div>
      </div>
    </div>
  );
}

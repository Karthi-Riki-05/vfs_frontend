"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ModalShell,
  ModalHeader,
  ModalFooter,
} from "@/components/common/Modal";

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

  return (
    <ModalShell open={visible} onClose={onClose} size="wide">
      <ModalHeader title="Diagram Preview" close={onClose} />
      <div
        style={{
          height: "60vh",
          position: "relative",
          background: "#f5f5f5",
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
        }}
      >
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
      <ModalFooter
        close={onClose}
        cancelLabel="Close"
        primary={() => {
          onInsert();
          onClose();
        }}
        primaryLabel="+ Insert into Canvas"
      />
    </ModalShell>
  );
}

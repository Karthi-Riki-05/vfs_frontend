"use client";

import React, { useState } from "react";
import EditorView from "@/components/flows/EditorView";
import EditorFABs from "@/components/editor/EditorFABs";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { message } from "antd";
import { useIsMobile } from "@/hooks/useMediaQuery";

export default function FlowEditorPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params?.id as string;
  const isViewMode = searchParams?.get("view") === "true";
  const isMobile = useIsMobile();
  const [showWarning, setShowWarning] = useState(true);

  if (!id || id === "undefined" || id === "null") {
    message.error("Invalid flow ID");
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h2>Invalid Flow ID</h2>
          <p>This flow could not be found. Please create a new flow.</p>
          <a href="/dashboard/flows">Go to Flows</a>
        </div>
      </div>
    );
  }

  if (isMobile && showWarning) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          textAlign: "center",
          background: "#fff",
          gap: "16px",
        }}
      >
        <div style={{ fontSize: 48 }}>📐</div>
        <h2
          style={{ fontSize: 20, fontWeight: 700, color: "#1a1a2e", margin: 0 }}
        >
          Best on larger screens
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "#6b7280",
            lineHeight: 1.6,
            maxWidth: 280,
          }}
        >
          The flow editor works best on tablet or desktop. You can still view
          and edit on mobile.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => setShowWarning(false)}
            style={{
              height: 44,
              padding: "0 20px",
              background: "#3CB371",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Continue anyway
          </button>
          <button
            onClick={() => router.back()}
            style={{
              height: 44,
              padding: "0 20px",
              background: "#f3f4f6",
              color: "#374151",
              border: "none",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100dvh", width: "100vw" }}>
      <EditorView flowId={id} isViewMode={isViewMode} />
      {!isViewMode && <EditorFABs />}
    </div>
  );
}

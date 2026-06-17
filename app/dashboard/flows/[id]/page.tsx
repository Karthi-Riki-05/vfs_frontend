"use client";

import React from "react";
import EditorView from "@/components/flows/EditorView";
import EditorFABs from "@/components/editor/EditorFABs";
import { useParams, useSearchParams } from "next/navigation";
import { message } from "antd";

export default function FlowEditorPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const isViewMode = searchParams?.get("view") === "true";

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

  return (
    <div style={{ height: "100dvh", width: "100vw" }}>
      <EditorView flowId={id} isViewMode={isViewMode} />
      {!isViewMode && <EditorFABs />}
    </div>
  );
}

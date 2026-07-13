"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getPublicShapeById } from "@/lib/shape";

// Same detection logic as components/shapes/ShapeCard.tsx's modalPreview —
// duplicated rather than imported since that component pulls in dashboard
// hooks/menus that don't belong on this unauthenticated, read-only page.
function isLikelySvg(s: string): boolean {
  return s.trim().toLowerCase().startsWith("<svg");
}
function isLikelyHtml(s: string): boolean {
  return /^<(?!svg|shape|stencil|mxgraph)[a-z]/i.test(s.trim());
}
function getRawContent(shape: any): string {
  return shape?.content || shape?.xmlContent || "";
}

export default function PublicShapeViewerPage() {
  const params = useParams();
  const id = params?.id as string;
  const [shape, setShape] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getPublicShapeById(id)
      .then(setShape)
      .catch(() =>
        setError("This link is no longer public, or the shape doesn't exist."),
      );
  }, [id]);

  if (error) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: "#8C8C8C" }}>
        {error}
      </div>
    );
  }

  if (!shape) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: "#8C8C8C" }}>
        Loading…
      </div>
    );
  }

  const type = String(shape.type || shape.shapeType || "").toLowerCase();
  const content = getRawContent(shape);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 24,
        background: "#FAFAFA",
      }}
    >
      <div style={{ marginBottom: 16, textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#1A1A2E" }}>
          {shape.name}
        </div>
        <div style={{ fontSize: 12, color: "#8C8C8C", marginTop: 2 }}>
          View only — shared publicly
        </div>
      </div>

      {type === "image" && content ? (
        <img
          src={content}
          alt={shape.name}
          style={{ maxWidth: "100%", maxHeight: "70vh" }}
        />
      ) : (isLikelySvg(content) || isLikelyHtml(content)) && content ? (
        <div
          style={{
            background: "#fff",
            padding: 24,
            borderRadius: 8,
            maxWidth: "100%",
          }}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      ) : (
        <div style={{ color: "#8C8C8C", fontSize: 13 }}>
          No preview available for this shape type.
        </div>
      )}
    </div>
  );
}

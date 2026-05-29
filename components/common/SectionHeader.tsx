"use client";

import React from "react";
import { useIsMobile } from "@/hooks/useMediaQuery";

interface SectionHeaderProps {
  title: string;
  right?: React.ReactNode;
}

export default function SectionHeader({ title, right }: SectionHeaderProps) {
  const isMobile = useIsMobile();
  return (
    <div
      className="section-header-responsive"
      style={{
        display: "flex",
        flexDirection: isMobile && right ? "column" : "row",
        justifyContent: "space-between",
        alignItems: isMobile && right ? "flex-start" : "center",
        gap: isMobile && right ? 12 : 0,
        marginBottom: 20,
      }}
    >
      <h2 className="section-label">{title}</h2>
      {right && (
        <div
          className="section-header-right"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            width: isMobile ? "100%" : "auto",
          }}
        >
          {right}
        </div>
      )}
    </div>
  );
}

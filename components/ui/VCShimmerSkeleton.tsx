"use client";

import React from "react";

const SHIMMER_KEYFRAME = `
@keyframes vc-shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
`;

const baseStyle: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(90deg, #E7F6F0 25%, #C8EDE0 50%, #E7F6F0 75%)",
  backgroundSize: "800px 100%",
  animation: "vc-shimmer 1.4s ease-in-out infinite",
  borderRadius: 6,
};

const orangeStyle: React.CSSProperties = {
  ...baseStyle,
  backgroundImage:
    "linear-gradient(90deg, #FFF3E6 25%, #FFE0C0 50%, #FFF3E6 75%)",
};

function Bar({
  h = 12,
  w = "100%",
  r = 6,
  orange = false,
  style,
}: {
  h?: number;
  w?: string | number;
  r?: number;
  orange?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        ...(orange ? orangeStyle : baseStyle),
        height: h,
        width: w,
        borderRadius: r,
        ...style,
      }}
    />
  );
}

function Circle({
  size = 40,
  orange = false,
}: {
  size?: number;
  orange?: boolean;
}) {
  return (
    <div
      style={{
        ...(orange ? orangeStyle : baseStyle),
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
      }}
    />
  );
}

// --- Variant renderers ---

function CardVariant({ count, orange }: { count: number; orange: boolean }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 16,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            border: "1px solid #F0F0F0",
            borderRadius: 10,
            overflow: "hidden",
            padding: 0,
          }}
        >
          <Bar h={130} r={0} orange={orange} />
          <div
            style={{
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <Bar h={14} w="75%" orange={orange} />
            <Bar h={11} w="50%" orange={orange} />
          </div>
        </div>
      ))}
    </div>
  );
}

function TableVariant({ count, orange }: { count: number; orange: boolean }) {
  return (
    <div
      style={{
        border: "1px solid #F0F0F0",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {/* header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 80px",
          gap: 12,
          padding: "12px 16px",
          background: "#FAFAFA",
          borderBottom: "1px solid #F0F0F0",
        }}
      >
        {[90, 60, 70, 40].map((w, i) => (
          <Bar key={i} h={11} w={w} orange={orange} />
        ))}
      </div>

      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 80px",
            gap: 12,
            padding: "14px 16px",
            borderBottom: i < count - 1 ? "1px solid #F0F0F0" : "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Circle size={32} orange={orange} />
            <Bar h={12} w="60%" orange={orange} />
          </div>
          <Bar h={12} w="80%" orange={orange} />
          <Bar h={12} w="65%" orange={orange} />
          <Bar h={12} w={50} orange={orange} />
        </div>
      ))}
    </div>
  );
}

function ListVariant({ count, orange }: { count: number; orange: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 12px",
            borderRadius: 8,
          }}
        >
          <Bar h={36} w={36} r={8} orange={orange} />
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <Bar h={13} w="65%" orange={orange} />
            <Bar h={10} w="40%" orange={orange} />
          </div>
          <Bar h={10} w={60} orange={orange} />
        </div>
      ))}
    </div>
  );
}

function ChatVariant({ count, orange }: { count: number; orange: boolean }) {
  const sides = [false, true, false, true, false];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: "16px 0",
      }}
    >
      {Array.from({ length: count }).map((_, i) => {
        const isUser = sides[i % sides.length];
        return (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: isUser ? "row-reverse" : "row",
              alignItems: "flex-end",
              gap: 8,
            }}
          >
            {!isUser && <Circle size={30} orange={orange} />}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 5,
                maxWidth: "60%",
                alignItems: isUser ? "flex-end" : "flex-start",
              }}
            >
              <Bar
                h={14}
                w={`${60 + (i % 3) * 15}%`}
                r={12}
                orange={isUser || orange}
                style={{ minWidth: 80 }}
              />
              {i % 2 === 0 && (
                <Bar
                  h={14}
                  w={`${40 + (i % 2) * 10}%`}
                  r={12}
                  orange={isUser || orange}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProfileVariant({ orange }: { orange: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Circle size={64} orange={orange} />
        <div
          style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}
        >
          <Bar h={16} w="50%" orange={orange} />
          <Bar h={12} w="35%" orange={orange} />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[80, 65, 75, 55].map((w, i) => (
          <Bar key={i} h={12} w={`${w}%`} orange={orange} />
        ))}
      </div>
    </div>
  );
}

// --- Main export ---

export type VCSkeletonVariant = "card" | "table" | "list" | "chat" | "profile";

interface VCShimmerSkeletonProps {
  variant?: VCSkeletonVariant;
  count?: number;
  orange?: boolean;
  style?: React.CSSProperties;
}

export function VCShimmerSkeleton({
  variant = "list",
  count = 4,
  orange = false,
  style,
}: VCShimmerSkeletonProps) {
  return (
    <>
      <style>{SHIMMER_KEYFRAME}</style>
      <div style={style}>
        {variant === "card" && <CardVariant count={count} orange={orange} />}
        {variant === "table" && <TableVariant count={count} orange={orange} />}
        {variant === "list" && <ListVariant count={count} orange={orange} />}
        {variant === "chat" && <ChatVariant count={count} orange={orange} />}
        {variant === "profile" && <ProfileVariant orange={orange} />}
      </div>
    </>
  );
}

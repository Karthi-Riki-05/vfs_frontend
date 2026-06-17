"use client";

/**
 * Decorative diagram thumbnail (5 nodes + connectors) used as a placeholder
 * cover on dashboard flow cards. Pure presentational SVG — tint via `color`.
 */
export default function MiniFlow({ color = "#34A881" }: { color?: string }) {
  return (
    <svg viewBox="0 0 180 96" className="w-full h-full">
      <rect
        x="10"
        y="14"
        width="46"
        height="22"
        rx="6"
        fill={color}
        opacity="0.9"
      />
      <rect
        x="70"
        y="14"
        width="46"
        height="22"
        rx="6"
        fill={color}
        opacity="0.4"
      />
      <rect
        x="124"
        y="14"
        width="46"
        height="22"
        rx="6"
        fill={color}
        opacity="0.9"
      />
      <rect
        x="40"
        y="62"
        width="46"
        height="22"
        rx="6"
        fill={color}
        opacity="0.6"
      />
      <rect
        x="100"
        y="62"
        width="46"
        height="22"
        rx="6"
        fill={color}
        opacity="0.4"
      />
      <path
        d="M56 25 H70 M116 25 H124 M63 36 V62 H40 M147 36 V62 H146"
        stroke={color}
        strokeWidth="1.6"
        fill="none"
      />
    </svg>
  );
}

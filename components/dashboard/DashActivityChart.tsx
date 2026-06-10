"use client";
import { Skeleton, Typography } from "antd";
import { useIsMobile } from "@/hooks/useMediaQuery";

const { Text } = Typography;

interface DashActivityChartProps {
  activity: any[];
  loading: boolean;
}

export function DashActivityChart({
  activity,
  loading,
}: DashActivityChartProps) {
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #F0F0F0",
          padding: 20,
        }}
      >
        <Skeleton active paragraph={{ rows: 4 }} />
      </div>
    );
  }

  if (!activity || activity.length === 0) return null;

  const maxVal = Math.max(...activity.map((d) => d.created + d.edited), 1);
  const chartH = isMobile ? 100 : 140;
  const barW = isMobile ? 24 : 40;
  const gap = isMobile ? 8 : 16;
  const totalW = activity.length * (barW + gap) - gap;

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        border: "1px solid #F0F0F0",
        padding: isMobile ? "16px 12px" : "20px 24px",
      }}
    >
      <Text
        strong
        style={{
          fontSize: 12,
          color: "#8C8C8C",
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        FLOW ACTIVITY (LAST 7 DAYS)
      </Text>
      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "center",
          marginTop: 4,
          marginBottom: 12,
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            color: "#8C8C8C",
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: "#3CB371",
              display: "inline-block",
            }}
          />{" "}
          Created
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            color: "#8C8C8C",
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: "#1890FF",
              display: "inline-block",
            }}
          />{" "}
          Edited
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <svg
          width={totalW}
          height={chartH + 24}
          viewBox={`0 0 ${totalW} ${chartH + 24}`}
        >
          {activity.map((day, i) => {
            const x = i * (barW + gap);
            const createdH = (day.created / maxVal) * chartH;
            const editedH = (day.edited / maxVal) * chartH;
            const totalH = createdH + editedH;
            return (
              <g key={day.date}>
                {/* Edited (bottom) */}
                <rect
                  x={x}
                  y={chartH - totalH}
                  width={barW}
                  height={editedH}
                  rx={4}
                  fill="#1890FF"
                  opacity={0.8}
                />
                {/* Created (top) */}
                <rect
                  x={x}
                  y={chartH - createdH}
                  width={barW}
                  height={createdH}
                  rx={4}
                  fill="#3CB371"
                />
                {/* Label */}
                <text
                  x={x + barW / 2}
                  y={chartH + 16}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#8C8C8C"
                >
                  {day.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

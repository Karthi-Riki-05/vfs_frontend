"use client";
import { Skeleton, Typography } from "antd";
import {
  FileTextOutlined,
  EditOutlined,
  TeamOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import { useIsMobile } from "@/hooks/useMediaQuery";

const { Text } = Typography;

const KPI_CONFIG = [
  {
    key: "totalFlows",
    label: "Total Flows",
    icon: <FileTextOutlined />,
    color: "#3CB371",
    bg: "#F0FFF4",
  },
  {
    key: "editedThisMonth",
    label: "Edited This Month",
    icon: <EditOutlined />,
    color: "#1890FF",
    bg: "#E6F7FF",
  },
  {
    key: "teamMembers",
    label: "Team Members",
    icon: <TeamOutlined />,
    color: "#722ED1",
    bg: "#F9F0FF",
  },
  {
    key: "sharedFlows",
    label: "Shared Flows",
    icon: <ShareAltOutlined />,
    color: "#FA8C16",
    bg: "#FFF7E6",
  },
];

interface DashKPICardsProps {
  stats: any;
  loading: boolean;
  showTeamMembers?: boolean;
}

export function DashKPICards({
  stats,
  loading,
  showTeamMembers = true,
}: DashKPICardsProps) {
  const isMobile = useIsMobile();

  const kpis = showTeamMembers
    ? KPI_CONFIG
    : KPI_CONFIG.filter((k) => k.key !== "teamMembers");

  // Mobile is always 2-up — 3 cards in one row squeeze the labels into
  // 3-line wraps (pro dashboard), unlike the 2x2 grid on /dashboard.
  const columns = isMobile ? "repeat(2, 1fr)" : `repeat(${kpis.length}, 1fr)`;
  const gap = isMobile ? 10 : 16;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: columns,
        gap: gap,
        marginBottom: isMobile ? 20 : 28,
      }}
    >
      {kpis.map((kpi) => (
        <div
          key={kpi.key}
          style={{
            background: "#fff",
            borderRadius: 12,
            border: "1px solid #F0F0F0",
            padding: isMobile ? "14px 12px" : "20px 20px",
            display: "flex",
            alignItems: "center",
            gap: isMobile ? 10 : 14,
          }}
        >
          <div
            style={{
              width: isMobile ? 36 : 44,
              height: isMobile ? 36 : 44,
              borderRadius: 10,
              background: kpi.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: isMobile ? 16 : 20,
              color: kpi.color,
              flexShrink: 0,
            }}
          >
            {kpi.icon}
          </div>
          <div>
            {loading ? (
              <Skeleton.Input
                active
                size="small"
                style={{ width: 40, height: 28 }}
              />
            ) : (
              <div
                style={{
                  fontSize: isMobile ? 20 : 26,
                  fontWeight: 700,
                  lineHeight: 1.1,
                  color: "#1A1A2E",
                }}
              >
                {stats?.[kpi.key] ?? 0}
              </div>
            )}
            <div
              style={{
                fontSize: isMobile ? 11 : 12,
                color: "#8C8C8C",
                marginTop: 2,
              }}
            >
              {kpi.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";
import { Skeleton, Typography } from "antd";
import { HeartFilled, ProjectOutlined } from "@ant-design/icons";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useRouter } from "next/navigation";

const { Text } = Typography;

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

interface DashRecentFlowsProps {
  flows: any[];
  loading: boolean;
}

export function DashRecentFlows({ flows, loading }: DashRecentFlowsProps) {
  const isMobile = useIsMobile();
  const router = useRouter();

  if (loading) {
    return (
      <div style={{ marginBottom: isMobile ? 20 : 28 }}>
        <Text
          strong
          style={{
            fontSize: 12,
            color: "#8C8C8C",
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          RECENT FLOWS
        </Text>
        <div style={{ marginTop: 12 }}>
          <Skeleton active paragraph={{ rows: 3 }} />
        </div>
      </div>
    );
  }

  if (!flows || flows.length === 0) return null;

  return (
    <div style={{ marginBottom: isMobile ? 20 : 28 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
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
          RECENT FLOWS
        </Text>
        <button
          onClick={() => router.push("/dashboard/flows")}
          style={{
            fontSize: 12,
            color: "#3CB371",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontFamily: "Inter, sans-serif",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.textDecoration = "underline")
          }
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
        >
          View All
        </button>
      </div>

      <div
        className="hide-scrollbar"
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          paddingBottom: 4,
        }}
      >
        {flows.map((flow) => (
          <div
            key={flow.id}
            onClick={() => window.open(`/dashboard/flows/${flow.id}`, "_blank")}
            style={{
              minWidth: isMobile ? 140 : 180,
              width: isMobile ? 140 : 180,
              background: "#fff",
              borderRadius: 12,
              border: "1px solid #F0F0F0",
              cursor: "pointer",
              overflow: "hidden",
              transition: "all 0.2s",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {/* Thumbnail */}
            <div
              style={{
                height: isMobile ? 80 : 100,
                background: "#F8F9FA",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {flow.thumbnail ? (
                <img
                  src={flow.thumbnail}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              ) : (
                <ProjectOutlined style={{ fontSize: 28, color: "#D9D9D9" }} />
              )}
            </div>
            {/* Info */}
            <div style={{ padding: "10px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Text
                  strong
                  ellipsis
                  style={{ fontSize: 13, color: "#1A1A2E", flex: 1 }}
                >
                  {flow.name}
                </Text>
                {flow.isFavorite && (
                  <HeartFilled style={{ fontSize: 11, color: "#FF4D6A" }} />
                )}
              </div>
              <Text style={{ fontSize: 11, color: "#8C8C8C" }}>
                {timeAgo(flow.updatedAt)}
              </Text>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

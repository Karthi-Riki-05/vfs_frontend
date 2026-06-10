"use client";
import { Skeleton, Typography } from "antd";
import { TeamOutlined } from "@ant-design/icons";
import { useIsMobile } from "@/hooks/useMediaQuery";

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

interface TeamActivityFeedProps {
  activity: any[];
  loading: boolean;
}

export function TeamActivityFeed({ activity, loading }: TeamActivityFeedProps) {
  const isMobile = useIsMobile();

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
          TEAM ACTIVITY
        </Text>
        <div style={{ marginTop: 12 }}>
          <Skeleton active paragraph={{ rows: 3 }} />
        </div>
      </div>
    );
  }

  if (!activity || activity.length === 0) return null;

  return (
    <div style={{ marginBottom: isMobile ? 20 : 28 }}>
      <Text
        strong
        style={{
          fontSize: 12,
          color: "#8C8C8C",
          textTransform: "uppercase",
          letterSpacing: 1,
          display: "block",
          marginBottom: 12,
        }}
      >
        TEAM ACTIVITY
      </Text>

      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #F0F0F0",
          overflow: "hidden",
        }}
      >
        {activity.slice(0, 5).map((item, i) => (
          <div
            key={`${item.id}-${i}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              borderBottom:
                i < Math.min(activity.length, 5) - 1
                  ? "1px solid #F5F5F5"
                  : "none",
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "#F0FFF4",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                overflow: "hidden",
              }}
            >
              {item.userImage ? (
                <img
                  src={item.userImage}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <TeamOutlined style={{ fontSize: 14, color: "#3CB371" }} />
              )}
            </div>
            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text ellipsis style={{ fontSize: 13, color: "#1A1A2E" }}>
                <strong>{item.userName}</strong>{" "}
                {item.action === "created" ? "created" : "edited"}{" "}
                <span style={{ color: "#3CB371" }}>{item.flowName}</span>
              </Text>
            </div>
            {/* Time */}
            <Text style={{ fontSize: 11, color: "#BFBFBF", flexShrink: 0 }}>
              {timeAgo(item.timestamp)}
            </Text>
          </div>
        ))}
      </div>
    </div>
  );
}

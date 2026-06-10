"use client";
import { Button, Progress, Typography } from "antd";
import { useIsMobile } from "@/hooks/useMediaQuery";

const { Text } = Typography;

interface FlowUsageBarProps {
  proFlows: any;
  isUnlimited: boolean;
  onBuyMore: () => void;
}

export function FlowUsageBar({
  proFlows,
  isUnlimited,
  onBuyMore,
}: FlowUsageBarProps) {
  const isMobile = useIsMobile();

  if (!proFlows) return null;
  const isLimited = !isUnlimited && proFlows.max > 0;
  const percent = isLimited
    ? Math.round((proFlows.used / proFlows.max) * 100)
    : 0;
  const isNearLimit = percent >= 80;

  return (
    <div
      style={{
        background: "#FAFAFA",
        borderRadius: 12,
        border: "1px solid #E8E8E8",
        padding: isMobile ? "12px 16px" : "16px 20px",
        marginBottom: isMobile ? 20 : 28,
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "stretch" : "center",
        gap: isMobile ? 12 : 16,
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8,
            flexWrap: "wrap",
            gap: 4,
          }}
        >
          <Text strong style={{ fontSize: 14 }}>
            FLOW USAGE
          </Text>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {isUnlimited
              ? `${proFlows.used} flows used (Unlimited)`
              : `${proFlows.used} / ${proFlows.max} flows used`}
          </Text>
        </div>
        {isLimited && (
          <Progress
            percent={percent}
            showInfo={false}
            strokeColor={isNearLimit ? "#FF4D4F" : "#3CB371"}
            trailColor="#E8E8E8"
            size="small"
          />
        )}
      </div>
      {!isUnlimited && (
        <Button
          type="primary"
          onClick={onBuyMore}
          block={isMobile}
          style={{
            backgroundColor: "#3CB371",
            borderColor: "#3CB371",
            borderRadius: 8,
            fontWeight: 600,
          }}
        >
          Buy More Flows
        </Button>
      )}
    </div>
  );
}

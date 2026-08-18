"use client";
import React from "react";
import { Typography } from "antd";
import { useIsMobile } from "@/hooks/useMediaQuery";

const { Text } = Typography;

interface DashGreetingProps {
  userName: string | null | undefined;
}

export function DashGreeting({ userName }: DashGreetingProps) {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const firstName = userName?.split(" ")[0] || "there";

  let greeting = "Welcome";
  let dateStr = "";
  if (mounted) {
    const hour = new Date().getHours();
    greeting =
      hour < 12
        ? "Good morning"
        : hour < 17
          ? "Good afternoon"
          : "Good evening";
    dateStr = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div style={{ marginBottom: isMobile ? 16 : 20 }}>
      {/* Date sits above the greeting to match the new_design reference. */}
      {dateStr && (
        <Text style={{ fontSize: 13, color: "#8C8C8C" }}>{dateStr}</Text>
      )}
      <h1
        style={{
          fontSize: isMobile ? 20 : 26,
          fontWeight: 700,
          color: "#1A1A2E",
          margin: dateStr ? "2px 0 0" : 0,
          fontFamily: "inherit",
        }}
      >
        {greeting}, {firstName}
      </h1>
    </div>
  );
}

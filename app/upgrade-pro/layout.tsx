"use client";

import React from "react";
import { Layout } from "antd";
import Header from "@/components/layout/Header";
import { colors } from "@/lib/theme";

const { Content } = Layout;

export default function UpgradeProLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Layout style={{ minHeight: "100dvh" }}>
      <Header />
      <Content
        style={{
          padding: "24px 32px",
          background: colors.background,
          minHeight: "calc(100vh - 56px)",
        }}
      >
        {children}
      </Content>
    </Layout>
  );
}

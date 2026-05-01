"use client";

import React, { useEffect, useState, Suspense } from "react";
import { Card, Button, Spin, Result, Typography, Tag, Space } from "antd";
import {
  CrownOutlined,
  CheckCircleFilled,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { proApi } from "@/api/pro.api";

const { Title, Text, Paragraph } = Typography;

const PRO_FEATURES = [
  "Lifetime access — pay $1 once",
  "Unlimited team members",
  "All Team app features",
  "100 AI diagram credits / month",
  "Team chat",
];

function ProPurchaseContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") || "";
  const { data: session, status } = useSession();
  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Missing invite token.");
      setLoading(false);
      return;
    }
    fetch(`/api/invite/verify?token=${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setInvite(d.data);
        else setError(d.error?.message || "Invalid invite.");
      })
      .catch(() => setError("Failed to verify invite."))
      .finally(() => setLoading(false));
  }, [token]);

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      const res = await proApi.purchasePro(token);
      const data = res.data?.data || res.data;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        setError("Could not start checkout. Please try again.");
        setPurchasing(false);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message || "Could not start checkout.",
      );
      setPurchasing(false);
    }
  };

  if (loading || status === "loading") {
    return (
      <div
        style={{
            minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FFFBEB",
        }}
      >
        <Spin size="large" tip="Loading invite…" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
            minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FFFBEB",
        }}
      >
        <Result status="error" title="Invite problem" subTitle={error} />
      </div>
    );
  }

  if (status !== "authenticated") {
    const cb = encodeURIComponent(`/invite/pro-purchase?token=${token}`);
    return (
      <div
        style={{
            minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FFFBEB",
          padding: 24,
        }}
      >
        <Card style={{ maxWidth: 440, textAlign: "center", borderRadius: 16 }}>
          <CrownOutlined style={{ fontSize: 40, color: "#D97706" }} />
          <Title level={3} style={{ margin: "12px 0" }}>
            Sign in to continue
          </Title>
          <Paragraph>
            Log in with <strong>{invite?.email}</strong> to join{" "}
            <strong>{invite?.teamName}</strong> on ValueChart Pro.
          </Paragraph>
          <Button
            type="primary"
            size="large"
            block
            onClick={() => (window.location.href = `/login?callbackUrl=${cb}`)}
            style={{ background: "#D97706", borderColor: "#D97706" }}
          >
            Sign in
          </Button>
        </Card>
      </div>
    );
  }

  const emailMismatch =
    session?.user?.email?.toLowerCase() !== invite?.email?.toLowerCase();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)",
      }}
    >
      <Card
        style={{
          maxWidth: 520,
          width: "100%",
          borderRadius: 16,
          boxShadow: "0 12px 36px rgba(0,0,0,0.10)",
          overflow: "hidden",
        }}
        bodyStyle={{ padding: 0 }}
      >
        <div
          style={{
            background: "#D97706",
            color: "#fff",
            padding: "28px 36px",
            textAlign: "center",
          }}
        >
          <CrownOutlined style={{ fontSize: 36, marginBottom: 8 }} />
          <Title level={3} style={{ color: "#fff", margin: 0 }}>
            Join {invite?.teamName} on ValueChart Pro
          </Title>
          <Text style={{ color: "rgba(255,255,255,0.9)" }}>
            Invited by <strong>{invite?.inviterName}</strong>
          </Text>
        </div>

        <div style={{ padding: "28px 36px" }}>
          <Tag color="gold" style={{ marginBottom: 12 }}>
            ValueChart Pro
          </Tag>
          <Paragraph style={{ fontSize: 15, marginBottom: 16 }}>
            ValueChart Pro is a one-time <strong>$1</strong> purchase that gives
            you <strong>lifetime access</strong>. Once paid, you'll be
            automatically added to <strong>{invite?.teamName}</strong>.
          </Paragraph>

          <div
            style={{
              background: "#FFFBEB",
              border: "1px solid #FCD34D",
              borderRadius: 8,
              padding: "14px 18px",
              marginBottom: 20,
            }}
          >
            <Space direction="vertical" size={6} style={{ width: "100%" }}>
              {PRO_FEATURES.map((f) => (
                <div
                  key={f}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <CheckCircleFilled style={{ color: "#D97706" }} />
                  <span>{f}</span>
                </div>
              ))}
            </Space>
          </div>

          {emailMismatch && (
            <div
              style={{
                background: "#FFFBE6",
                border: "1px solid #FFE58F",
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 16,
                color: "#AD6800",
                fontSize: 13,
              }}
            >
              This invitation was sent to <strong>{invite?.email}</strong>.
              You're logged in as <strong>{session?.user?.email}</strong>. Sign
              in with the invited email to continue.
            </div>
          )}

          <Button
            type="primary"
            size="large"
            block
            disabled={emailMismatch}
            loading={purchasing}
            onClick={handlePurchase}
            icon={<ArrowRightOutlined />}
            style={{
              background: "#D97706",
              borderColor: "#D97706",
              height: 48,
              fontWeight: 600,
              borderRadius: 8,
            }}
          >
            Get Pro &amp; Join Team — $1
          </Button>

          <Paragraph
            style={{
              color: "#999",
              fontSize: 12,
              textAlign: "center",
              marginTop: 14,
              marginBottom: 0,
            }}
          >
            After payment you'll be redirected back and added to the team
            automatically.
          </Paragraph>
        </div>
      </Card>
    </div>
  );
}

export default function ProPurchaseInvitePage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
              minHeight: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Spin size="large" />
        </div>
      }
    >
      <ProPurchaseContent />
    </Suspense>
  );
}

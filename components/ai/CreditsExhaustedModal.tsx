"use client";

import React, { useState } from "react";
import { Modal, Button, Typography, message, Tag } from "antd";
import { CrownOutlined, ThunderboltFilled } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { aiApi } from "@/api/ai.api";
import { usePricing } from "@/hooks/usePricing";

const { Text, Title } = Typography;

type PackType = "starter" | "standard" | "proppack";

type PriceKey = "addon_starter" | "addon_standard" | "addon_proppack";

interface AddonPack {
  packType: PackType;
  credits: number;
  priceKey: PriceKey;
  popular?: boolean;
}

const PACKS: AddonPack[] = [
  { packType: "starter", credits: 25, priceKey: "addon_starter" },
  {
    packType: "standard",
    credits: 60,
    priceKey: "addon_standard",
    popular: true,
  },
  { packType: "proppack", credits: 150, priceKey: "addon_proppack" },
];

interface CreditsExhaustedModalProps {
  visible: boolean;
  onClose: () => void;
  planResetsAt?: string | null;
  isPro: boolean;
}

export default function CreditsExhaustedModal({
  visible,
  onClose,
  planResetsAt,
  isPro,
}: CreditsExhaustedModalProps) {
  const router = useRouter();
  const { pricing } = usePricing();
  const [purchasing, setPurchasing] = useState<PackType | null>(null);

  const handleAddonPurchase = async (packType: PackType) => {
    setPurchasing(packType);
    try {
      const res = await aiApi.createAddonCheckout(packType);
      const data = res.data?.data || res.data;
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        message.error("Could not start checkout");
        setPurchasing(null);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || "Checkout failed";
      message.error(msg);
      setPurchasing(null);
    }
  };

  const handleUpgradeClick = () => {
    onClose();
    router.push("/upgrade-pro");
  };

  const resetDate = planResetsAt
    ? new Date(planResetsAt).toLocaleDateString()
    : null;

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      centered
      width={520}
      title={null}
    >
      <div style={{ padding: "8px 0" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "#FA8C1615",
              margin: "0 auto 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ThunderboltFilled style={{ fontSize: 26, color: "#FA8C16" }} />
          </div>
          <Title level={4} style={{ marginBottom: 8 }}>
            No diagram credits remaining
          </Title>
          {resetDate && (
            <Text type="secondary" style={{ fontSize: 14 }}>
              Your plan resets on <strong>{resetDate}</strong>
            </Text>
          )}
        </div>

        {isPro ? (
          <>
            <Text
              strong
              style={{
                display: "block",
                marginBottom: 12,
                fontSize: 14,
                color: "#1A1A2E",
              }}
            >
              Get more credits now
            </Text>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {PACKS.map((pack) => (
                <div
                  key={pack.packType}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 16px",
                    border: pack.popular
                      ? "2px solid #3CB371"
                      : "1px solid #E8E8E8",
                    borderRadius: 12,
                    background: pack.popular ? "#F0FFF4" : "#fff",
                    position: "relative",
                  }}
                >
                  {pack.popular && (
                    <Tag
                      color="#3CB371"
                      style={{
                        position: "absolute",
                        top: -10,
                        right: 12,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "1px 8px",
                        borderRadius: 10,
                        border: "none",
                      }}
                    >
                      MOST POPULAR
                    </Tag>
                  )}
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 15,
                        color: "#1A1A2E",
                      }}
                    >
                      {pack.credits} credits
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {pricing?.prices[pack.priceKey]?.display ?? "…"}
                    </Text>
                  </div>
                  <Button
                    type="primary"
                    loading={purchasing === pack.packType}
                    disabled={!!purchasing}
                    onClick={() => handleAddonPurchase(pack.packType)}
                    style={{
                      backgroundColor: "#3CB371",
                      borderColor: "#3CB371",
                      borderRadius: 8,
                      fontWeight: 600,
                    }}
                  >
                    Buy Now
                  </Button>
                </div>
              ))}
            </div>
            <Text
              type="secondary"
              style={{
                display: "block",
                textAlign: "center",
                marginTop: 12,
                fontSize: 12,
              }}
            >
              Credits never expire
            </Text>
            {pricing && pricing.currency !== "USD" && (
              <Text
                type="secondary"
                style={{
                  display: "block",
                  textAlign: "center",
                  marginTop: 4,
                  fontSize: 10,
                }}
              >
                Prices shown in {pricing.currency}. Charged in local currency at
                checkout.
              </Text>
            )}
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <Text
              style={{
                display: "block",
                marginBottom: 16,
                fontSize: 14,
                color: "#595959",
              }}
            >
              Upgrade to Pro for 100 AI credits every month, plus all Pro
              features.
            </Text>
            <Button
              type="primary"
              size="large"
              block
              icon={<CrownOutlined />}
              onClick={handleUpgradeClick}
              style={{
                backgroundColor: "#3CB371",
                borderColor: "#3CB371",
                borderRadius: 10,
                height: 48,
                fontWeight: 700,
              }}
            >
              Upgrade to Pro
            </Button>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <Button type="text" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

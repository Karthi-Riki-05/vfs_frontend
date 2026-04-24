"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Alert,
  Checkbox,
  Typography,
  Space,
  Tag,
  Radio,
  Select,
  Avatar,
  Spin,
} from "antd";
import {
  CrownOutlined,
  TeamOutlined,
  ThunderboltFilled,
  CalendarOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import { superAdminApi, AdminUser } from "@/api/superAdmin.api";

const PRIMARY = "#3CB371";
const PRIMARY_BG = "#F0FFF4";
const { Text } = Typography;

type PlanKey = "pro_monthly" | "pro_yearly" | "team_monthly" | "team_yearly";
type AppType = "valuechartpro" | "valuechartteams";

interface PlanCard {
  key: PlanKey;
  plan: "pro" | "team";
  duration: "monthly" | "yearly";
  name: string;
  price: string;
  credits: number;
  features: string[];
  badge?: string;
  appType: AppType;
}

const PLANS: PlanCard[] = [
  {
    key: "pro_monthly",
    plan: "pro",
    duration: "monthly",
    name: "Pro Monthly",
    price: "$5/mo",
    credits: 100,
    features: ["Unlimited flows", "100 AI credits / month", "Claude AI"],
    badge: "Popular",
    appType: "valuechartpro",
  },
  {
    key: "pro_yearly",
    plan: "pro",
    duration: "yearly",
    name: "Pro Yearly",
    price: "$36/yr",
    credits: 100,
    features: ["Unlimited flows", "100 AI credits / month", "Save 40%"],
    badge: "Save 40%",
    appType: "valuechartpro",
  },
  {
    key: "team_monthly",
    plan: "team",
    duration: "monthly",
    name: "Team Monthly",
    price: "$5/seat/mo",
    credits: 300,
    features: ["Team collaboration", "300 AI credits / month", "Admin panel"],
    appType: "valuechartteams",
  },
  {
    key: "team_yearly",
    plan: "team",
    duration: "yearly",
    name: "Team Yearly",
    price: "$36/seat/yr",
    credits: 300,
    features: ["Team collaboration", "300 AI credits / month", "Save 40%"],
    appType: "valuechartteams",
  },
];

const DURATION_PRESETS = [
  { label: "1 month", months: 1 },
  { label: "3 months", months: 3 },
  { label: "6 months", months: 6 },
  { label: "12 months", months: 12 },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  presetUser?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  hasExistingSubscription?: boolean;
}

export default function GrantSubscriptionModal({
  open,
  onClose,
  onSuccess,
  presetUser,
  hasExistingSubscription = false,
}: Props) {
  const [saving, setSaving] = useState(false);

  // Step 1 — App type
  const [appType, setAppType] = useState<AppType>("valuechartpro");

  // Step 2 — User (listed, not blank autocomplete)
  const [eligibleUsers, setEligibleUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [targetId, setTargetId] = useState<string | null>(
    presetUser?.id || null,
  );

  // Step 3 — Plan card (constrained by appType)
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("pro_monthly");

  // Step 4 — Duration / credits / seats / reason / flow limit
  const [months, setMonths] = useState<number>(1);
  const [credits, setCredits] = useState<number | null>(null);
  const [seats, setSeats] = useState<number>(5);
  const [extend, setExtend] = useState<boolean>(hasExistingSubscription);
  const [reason, setReason] = useState("");
  const [flowLimit, setFlowLimit] = useState<number | null>(null);

  const plan = PLANS.find((p) => p.key === selectedPlan)!;

  const visiblePlans = useMemo(
    () => PLANS.filter((p) => p.appType === appType),
    [appType],
  );

  // Snap plan selection to first valid card whenever app type changes
  useEffect(() => {
    if (!visiblePlans.some((p) => p.key === selectedPlan)) {
      const first = visiblePlans[0];
      if (first) {
        setSelectedPlan(first.key);
        setMonths(first.duration === "yearly" ? 12 : 1);
        setCredits(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appType]);

  // Load eligible users (free tier, active) when modal opens or search changes
  useEffect(() => {
    if (!open || presetUser) return;
    let cancelled = false;
    setLoadingUsers(true);
    const t = setTimeout(async () => {
      try {
        const res = await superAdminApi.listEligibleUsers(
          userSearch.trim() || undefined,
        );
        if (!cancelled) {
          const list = res.data?.data?.users || [];
          setEligibleUsers(Array.isArray(list) ? list : []);
        }
      } catch {
        if (!cancelled) setEligibleUsers([]);
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, userSearch, presetUser]);

  const expiryPreview = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d;
  }, [months]);

  const resolvedCredits = credits === null ? plan.credits : credits;

  const reset = () => {
    setAppType("valuechartpro");
    setSelectedPlan("pro_monthly");
    setMonths(1);
    setCredits(null);
    setSeats(5);
    setExtend(hasExistingSubscription);
    setReason("");
    setFlowLimit(null);
    setUserSearch("");
    if (!presetUser) setTargetId(null);
  };

  const handleSubmit = async () => {
    const effectiveTargetId = presetUser?.id || targetId;
    if (!effectiveTargetId) {
      message.error("Please select a user");
      return;
    }
    setSaving(true);
    try {
      await superAdminApi.grantSubscription(effectiveTargetId, {
        plan: plan.plan,
        duration: plan.duration,
        months,
        credits: resolvedCredits,
        extend,
        reason: reason || undefined,
        appType,
        ...(plan.plan === "team" ? { seats } : {}),
        ...(flowLimit !== null && flowLimit !== undefined ? { flowLimit } : {}),
      });
      message.success(
        extend
          ? "Subscription extended"
          : `${plan.name} granted — expires ${expiryPreview.toLocaleDateString()}`,
      );
      reset();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      message.error(
        err?.response?.data?.error?.message || "Failed to grant subscription",
      );
    } finally {
      setSaving(false);
    }
  };

  const selectedUser =
    presetUser ||
    (targetId && eligibleUsers.find((u) => u.id === targetId)) ||
    null;

  return (
    <Modal
      title={
        <Space>
          <CrownOutlined style={{ color: PRIMARY }} />
          <span>Grant Subscription</span>
        </Space>
      }
      open={open}
      onCancel={() => {
        onClose();
        reset();
      }}
      onOk={handleSubmit}
      confirmLoading={saving}
      okText={extend ? "Extend Subscription" : "Grant Subscription"}
      okButtonProps={{
        style: { background: PRIMARY, borderColor: PRIMARY, fontWeight: 500 },
      }}
      width={680}
      destroyOnClose
    >
      <Alert
        type="info"
        showIcon
        message={
          extend
            ? "Extending: time is added on top of the current expiry date"
            : "Admin-granted subscription (price = $0). Stripe is NOT charged."
        }
        style={{ marginBottom: 16 }}
      />

      {/* Step 1 — App type */}
      <Text strong style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
        <AppstoreOutlined style={{ color: PRIMARY, marginRight: 6 }} />
        1. Select App Type
      </Text>
      <Radio.Group
        value={appType}
        onChange={(e) => setAppType(e.target.value)}
        optionType="button"
        buttonStyle="solid"
        style={{ marginBottom: 18 }}
      >
        <Radio.Button value="valuechartpro">
          ValueChart Pro (Individual)
        </Radio.Button>
        <Radio.Button value="valuechartteams">
          ValueChart Teams (Enterprise)
        </Radio.Button>
      </Radio.Group>

      {/* Step 2 — User */}
      {!presetUser && (
        <div style={{ marginBottom: 18 }}>
          <Text
            strong
            style={{ fontSize: 13, display: "block", marginBottom: 6 }}
          >
            2. Select User{" "}
            <Text type="secondary" style={{ fontWeight: 400, fontSize: 11 }}>
              (free-tier users only)
            </Text>
          </Text>
          <Select
            value={targetId || undefined}
            onChange={(v) => setTargetId(v)}
            placeholder={
              loadingUsers ? "Loading users…" : "Choose a free-tier user"
            }
            showSearch
            filterOption={false}
            onSearch={(v) => setUserSearch(v)}
            notFoundContent={
              loadingUsers ? (
                <Spin size="small" />
              ) : (
                <Text type="secondary">No eligible users</Text>
              )
            }
            style={{ width: "100%" }}
            options={(Array.isArray(eligibleUsers) ? eligibleUsers : []).map(
              (u) => ({
                value: u.id,
                label: (
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <Avatar size="small" src={u.image || undefined}>
                      {u.name?.[0] || u.email?.[0]}
                    </Avatar>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>
                        {u.name || "Unnamed"}
                      </div>
                      <div style={{ fontSize: 11, color: "#8C8C8C" }}>
                        {u.email}
                      </div>
                    </div>
                    <Tag>{u.currentVersion}</Tag>
                  </div>
                ),
              }),
            )}
          />
          {selectedUser && (
            <div
              style={{
                marginTop: 8,
                fontSize: 11,
                color: "#8C8C8C",
              }}
            >
              Selected: {selectedUser.name || selectedUser.email}
            </div>
          )}
        </div>
      )}
      {presetUser && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            background: PRIMARY_BG,
            borderRadius: 8,
            border: `1px solid ${PRIMARY}33`,
            marginBottom: 18,
          }}
        >
          <TeamOutlined style={{ color: PRIMARY }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>
              {presetUser.name || "Unnamed"}
            </div>
            <div style={{ fontSize: 11, color: "#8C8C8C" }}>
              {presetUser.email}
            </div>
          </div>
        </div>
      )}

      {/* Step 3 — Plan cards (filtered by app type) */}
      <Text strong style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
        {presetUser ? "2" : "3"}. Choose Plan
      </Text>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 10,
          marginBottom: 18,
        }}
      >
        {visiblePlans.map((p) => {
          const active = p.key === selectedPlan;
          return (
            <div
              key={p.key}
              onClick={() => {
                setSelectedPlan(p.key);
                setMonths(p.duration === "yearly" ? 12 : 1);
                setCredits(null);
              }}
              style={{
                cursor: "pointer",
                padding: "12px 14px",
                borderRadius: 10,
                border: active ? `2px solid ${PRIMARY}` : "1px solid #EAECF0",
                background: active ? PRIMARY_BG : "#fff",
                position: "relative",
                transition: "all 0.15s",
              }}
            >
              {p.badge && (
                <Tag
                  color={p.badge === "Popular" ? PRIMARY : "orange"}
                  style={{
                    position: "absolute",
                    top: -10,
                    right: 10,
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "0 8px",
                    borderRadius: 10,
                    border: "none",
                  }}
                >
                  {p.badge}
                </Tag>
              )}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <Text strong style={{ fontSize: 14 }}>
                  {p.name}
                </Text>
                <Text strong style={{ fontSize: 13, color: PRIMARY }}>
                  {p.price}
                </Text>
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 16,
                  fontSize: 11,
                  color: "#595959",
                  lineHeight: 1.6,
                }}
              >
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Seats (team plans only) */}
      {plan.plan === "team" && (
        <div style={{ marginBottom: 18 }}>
          <Text
            strong
            style={{ fontSize: 13, display: "block", marginBottom: 6 }}
          >
            Team Seats
          </Text>
          <InputNumber
            min={2}
            max={100}
            value={seats}
            onChange={(v) => setSeats(Math.max(2, v || 2))}
            style={{ width: 160 }}
            addonAfter="seats"
          />
          <Text type="secondary" style={{ fontSize: 11, marginLeft: 10 }}>
            Owner + {seats - 1} member slot{seats - 1 === 1 ? "" : "s"}
          </Text>
        </div>
      )}

      {/* Duration */}
      <Text strong style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
        {presetUser ? "3" : "4"}. Duration
      </Text>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 10,
        }}
      >
        {DURATION_PRESETS.map((d) => (
          <div
            key={d.months}
            onClick={() => setMonths(d.months)}
            style={{
              cursor: "pointer",
              padding: "6px 14px",
              borderRadius: 8,
              border:
                months === d.months
                  ? `1.5px solid ${PRIMARY}`
                  : "1px solid #EAECF0",
              background: months === d.months ? PRIMARY_BG : "#fff",
              color: months === d.months ? PRIMARY : "#595959",
              fontSize: 12,
              fontWeight: months === d.months ? 600 : 400,
              transition: "all 0.15s",
            }}
          >
            {d.label}
          </div>
        ))}
        <InputNumber
          min={1}
          max={120}
          value={months}
          onChange={(v) => v && setMonths(v)}
          size="small"
          style={{ width: 100 }}
          addonAfter="mo"
        />
      </div>
      <div
        style={{
          background: "#FAFAFA",
          border: "1px solid #F0F0F0",
          borderRadius: 8,
          padding: "8px 12px",
          fontSize: 12,
          color: "#595959",
          marginBottom: 18,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <CalendarOutlined style={{ color: PRIMARY }} />
        <span>
          {extend ? "Extended expiry" : "Expires on"}:{" "}
          <strong style={{ color: "#1A1A2E" }}>
            {expiryPreview.toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </strong>
        </span>
      </div>

      {/* AI Credits */}
      <Text strong style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
        {presetUser ? "4" : "5"}. AI Credits
      </Text>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <ThunderboltFilled style={{ color: PRIMARY, fontSize: 18 }} />
        <InputNumber
          min={0}
          max={100000}
          value={resolvedCredits}
          onChange={(v) =>
            setCredits(v === plan.credits ? null : (v as number))
          }
          style={{ width: 160 }}
        />
        <Text type="secondary" style={{ fontSize: 12 }}>
          credits (plan default: {plan.credits})
        </Text>
      </div>

      {/* Flow Limit (optional override) */}
      <Text strong style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
        Flow Limit (optional)
      </Text>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <InputNumber
          min={0}
          max={100000}
          value={flowLimit ?? undefined}
          onChange={(v) =>
            setFlowLimit(v === null || v === undefined ? null : (v as number))
          }
          placeholder={
            plan.plan === "team"
              ? "Default: unlimited"
              : "Default: 10 (Pro plan)"
          }
          style={{ width: 200 }}
        />
        <Text type="secondary" style={{ fontSize: 12 }}>
          Leave empty for plan default. Enter 0 for unlimited.
        </Text>
      </div>

      {/* Extend checkbox */}
      {hasExistingSubscription && (
        <Checkbox
          checked={extend}
          onChange={(e) => setExtend(e.target.checked)}
          style={{ marginBottom: 14 }}
        >
          <Text style={{ fontSize: 13 }}>
            Extend existing subscription (add time on top of current expiry)
          </Text>
        </Checkbox>
      )}

      {/* Reason */}
      <div style={{ marginBottom: 4 }}>
        <Text
          strong
          style={{ fontSize: 13, display: "block", marginBottom: 6 }}
        >
          {presetUser ? "5" : "6"}. Reason / note (optional)
        </Text>
        <Input.TextArea
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. support compensation, beta tester, comped account"
          maxLength={500}
          showCount
        />
      </div>
    </Modal>
  );
}

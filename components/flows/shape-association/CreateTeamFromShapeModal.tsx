"use client";

import React, { useState } from "react";
import { Modal, Form, Input, Select, message } from "antd";
import { TeamOutlined } from "@ant-design/icons";
import { teamsApi } from "@/api/teams.api";
import { shapesApi } from "@/api/shapes.api";
import type { ShapeRef, AssociationResult } from "./types";

interface Props {
  open: boolean;
  shapeRef: ShapeRef | null;
  onClose: () => void;
  onSuccess: (result: AssociationResult) => void;
}

export default function CreateTeamFromShapeModal({
  open,
  shapeRef,
  onClose,
  onSuccess,
}: Props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!shapeRef) return;
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setLoading(true);
    try {
      // 1. Create the team
      const teamRes = await teamsApi.create({ name: values.name });
      const team = teamRes.data?.data || teamRes.data;
      if (!team?.id) throw new Error("Team creation failed");

      // 2. Add members by email (best-effort — unknown emails are reported)
      const emails: string[] = values.emails || [];
      const failed: string[] = [];
      for (const email of emails) {
        try {
          await teamsApi.addMember(team.id, { email });
        } catch {
          failed.push(email);
        }
      }
      if (failed.length) {
        message.warning(`Could not add: ${failed.join(", ")}`);
      }

      // The chat sidebar lists ALL teams the user owns/belongs to (see
      // chat.service getSidebarData), so the new team appears under the
      // "Teams" section in Chat automatically — no context switch needed.

      // 3. Associate the shape (creates the Shape row if needed)
      const assocRes = await shapesApi.associateTeam(
        shapeRef.shapeId || "new",
        {
          teamId: team.id,
          shape: {
            name: shapeRef.shapeName || "Shape",
            xmlContent: shapeRef.shapeXml,
          },
        },
      );
      const assocData = assocRes.data?.data || assocRes.data;

      message.success(`Team "${team.name}" created and shape associated`);
      form.resetFields();
      onSuccess({
        shapeId: assocData?.shape?.id || shapeRef.shapeId || "",
        cellId: shapeRef.cellId,
        association: { type: "team", id: team.id, name: team.name },
      });
    } catch (err: any) {
      message.error(
        err?.response?.data?.error?.message || "Failed to create team",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText="Create Team"
      okButtonProps={{
        style: { backgroundColor: "#3CB371", borderColor: "#3CB371" },
      }}
      title={
        <span>
          <TeamOutlined style={{ color: "#3CB371", marginRight: 8 }} />
          Create Team from Shape
        </span>
      }
      width={440}
      centered
      destroyOnClose
    >
      <div style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>
        Shape: <strong>{shapeRef?.shapeName || "Unnamed shape"}</strong> — it
        will be added to the new team&apos;s shared shape library.
      </div>
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="Team name"
          rules={[{ required: true, message: "Team name is required" }]}
        >
          <Input placeholder="e.g. Design Team" maxLength={255} />
        </Form.Item>
        <Form.Item
          name="emails"
          label="Member emails (optional)"
          rules={[
            {
              validator: (_, value: string[]) =>
                !value ||
                value.every((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
                  ? Promise.resolve()
                  : Promise.reject(new Error("One or more emails are invalid")),
            },
          ]}
        >
          <Select
            mode="tags"
            tokenSeparators={[",", " "]}
            placeholder="Type emails and press Enter"
            open={false}
            suffixIcon={null}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

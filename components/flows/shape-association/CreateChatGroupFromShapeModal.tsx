"use client";

import React, { useState } from "react";
import { Modal, Form, Input, Select, message } from "antd";
import { MessageOutlined } from "@ant-design/icons";
import api from "@/lib/axios";
import { shapesApi } from "@/api/shapes.api";
import type { ShapeRef, AssociationResult } from "./types";

interface Props {
  open: boolean;
  shapeRef: ShapeRef | null;
  onClose: () => void;
  onSuccess: (result: AssociationResult) => void;
}

export default function CreateChatGroupFromShapeModal({
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
      // 1. Create the chat group (backend resolves memberEmails → user ids)
      const groupRes = await api.post("/chat/groups", {
        title: values.name,
        memberEmails: values.emails || [],
      });
      const group = groupRes.data?.data || groupRes.data;
      if (!group?.id) throw new Error("Group creation failed");

      // 2. Associate the shape (creates the Shape row if needed)
      const assocRes = await shapesApi.associateGroup(
        shapeRef.shapeId || "new",
        {
          groupId: group.id,
          shape: {
            name: shapeRef.shapeName || "Shape",
            xmlContent: shapeRef.shapeXml,
          },
        },
      );
      const assocData = assocRes.data?.data || assocRes.data;

      message.success(`Group "${group.title}" created and shape associated`);
      form.resetFields();
      onSuccess({
        shapeId: assocData?.shape?.id || shapeRef.shapeId || "",
        cellId: shapeRef.cellId,
        association: { type: "group", id: group.id, name: group.title },
      });
    } catch (err: any) {
      message.error(
        err?.response?.data?.error?.message || "Failed to create chat group",
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
      okText="Create Group"
      okButtonProps={{
        style: { backgroundColor: "#3CB371", borderColor: "#3CB371" },
      }}
      title={
        <span>
          <MessageOutlined style={{ color: "#3CB371", marginRight: 8 }} />
          Create Chat Group from Shape
        </span>
      }
      width={440}
      centered
      destroyOnClose
    >
      <div style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>
        Shape: <strong>{shapeRef?.shapeName || "Unnamed shape"}</strong> — it
        will be shared within the new chat group.
      </div>
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="Group name"
          rules={[{ required: true, message: "Group name is required" }]}
        >
          <Input placeholder="e.g. Process Discussion" maxLength={255} />
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

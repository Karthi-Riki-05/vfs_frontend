"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Typography,
  Button,
  Form,
  Input,
  InputNumber
} from "antd";
import { toast } from "sonner";
import {
  ModalShell,
  ModalHeader,
  ModalFooter,
} from "@/components/common/Modal";
import { PlusOutlined } from "@ant-design/icons";
import { adminApi } from "@/api/admin.api";

const { Title } = Typography;

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [form] = Form.useForm();

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await adminApi.listPlans();
      const data = res.data?.data?.plans || res.data?.data || res.data;
      setPlans(Array.isArray(data) ? data : []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingPlan) {
        await adminApi.updatePlan(editingPlan.id, values);
        toast.success("Plan updated");
      } else {
        await adminApi.createPlan(values);
        toast.success("Plan created");
      }
      setModalOpen(false);
      form.resetFields();
      setEditingPlan(null);
      fetchPlans();
    } catch {
      toast.error("Failed to save plan");
    }
  };

  const columns = [
    { title: "Name", dataIndex: "name", key: "name" },
    {
      title: "Price",
      dataIndex: "price",
      key: "price",
      render: (p: number) => `$${(p / 100).toFixed(2)}`,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: any) => (
        <Button
          type="link"
          onClick={() => {
            setEditingPlan(record);
            form.setFieldsValue(record);
            setModalOpen(true);
          }}
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          Plan Management
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingPlan(null);
            form.resetFields();
            setModalOpen(true);
          }}
        >
          Add Plan
        </Button>
      </div>
      <Card>
        <Table
          dataSource={plans}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>
      <ModalShell
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingPlan(null);
        }}
      >
        <ModalHeader
          title={editingPlan ? "Edit Plan" : "Create Plan"}
          close={() => {
            setModalOpen(false);
            setEditingPlan(null);
          }}
        />
        <div className="tw px-5 pb-2">
          <Form form={form} layout="vertical">
            <Form.Item
              name="name"
              label="Plan Name"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="price"
              label="Price (cents)"
              rules={[{ required: true }]}
            >
              <InputNumber style={{ width: "100%" }} min={0} />
            </Form.Item>
          </Form>
        </div>
        <ModalFooter
          close={() => {
            setModalOpen(false);
            setEditingPlan(null);
          }}
          primary={handleSave}
          primaryLabel={editingPlan ? "Update" : "Create"}
        />
      </ModalShell>
    </div>
  );
}

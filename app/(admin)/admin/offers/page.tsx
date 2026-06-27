"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Typography,
  Button,
  Form,
  Input,
  InputNumber,
  Space,
} from "antd";
import { confirmDialog } from "@/components/common/ConfirmDialog";
import { toast } from "sonner";
import {
  ModalShell,
  ModalHeader,
  ModalFooter,
} from "@/components/common/Modal";
import { PlusOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { adminApi } from "@/api/admin.api";

const { Title } = Typography;

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any>(null);
  const [form] = Form.useForm();

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const res = await adminApi.listOffers();
      const data = res.data?.data?.offers || res.data?.data || res.data;
      setOffers(Array.isArray(data) ? data : []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingOffer) {
        await adminApi.updateOffer(editingOffer.id, values);
        toast.success("Offer updated");
      } else {
        await adminApi.createOffer(values);
        toast.success("Offer created");
      }
      setModalOpen(false);
      form.resetFields();
      setEditingOffer(null);
      fetchOffers();
    } catch {
      toast.error("Failed to save offer");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await adminApi.deleteOffer(id);
      toast.success("Offer deleted");
      fetchOffers();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const columns = [
    { title: "Name", dataIndex: "name", key: "name" },
    {
      title: "Discount (%)",
      dataIndex: "discount",
      key: "discount",
      render: (d: number) => `${d}%`,
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "created",
      render: (d: string) => (d ? new Date(d).toLocaleDateString() : "-"),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingOffer(record);
              form.setFieldsValue(record);
              setModalOpen(true);
            }}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() =>
              confirmDialog({
                title: "Delete this offer?",
                danger: true,
                onConfirm: () => handleDelete(record.id),
              })
            }
          />
        </Space>
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
          Offers
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingOffer(null);
            form.resetFields();
            setModalOpen(true);
          }}
        >
          Create Offer
        </Button>
      </div>
      <Card>
        <Table
          dataSource={offers}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 15 }}
        />
      </Card>
      <ModalShell
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingOffer(null);
        }}
      >
        <ModalHeader
          title={editingOffer ? "Edit Offer" : "Create Offer"}
          close={() => {
            setModalOpen(false);
            setEditingOffer(null);
          }}
        />
        <div className="tw px-5 pb-2">
          <Form form={form} layout="vertical">
            <Form.Item
              name="name"
              label="Offer Name"
              rules={[{ required: true }]}
            >
              <Input placeholder="Summer Sale" />
            </Form.Item>
            <Form.Item
              name="discount"
              label="Discount (%)"
              rules={[{ required: true }]}
            >
              <InputNumber style={{ width: "100%" }} min={1} max={100} />
            </Form.Item>
          </Form>
        </div>
        <ModalFooter
          close={() => {
            setModalOpen(false);
            setEditingOffer(null);
          }}
          primary={handleSave}
          primaryLabel={editingOffer ? "Update" : "Create"}
        />
      </ModalShell>
    </div>
  );
}

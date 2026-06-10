"use client";

import React, { useState, useEffect } from "react";
import { Typography, Button, Row, Col, Spin, Empty, Card, message } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { shapesApi } from "@/api/shapes.api";
import { shapeGroupsApi } from "@/api/shape-groups.api";
import ShapeCard from "@/components/shapes/ShapeCard";
import { useParams, useRouter } from "next/navigation";
import { useAppContext } from "@/context/AppContext";
import { useIsMobile } from "@/hooks/useMediaQuery";

const { Title, Text } = Typography;

export default function ShapeGroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const isMobile = useIsMobile();
  const { activeTeamId } = useAppContext();
  const groupId = params?.groupId as string;
  const [group, setGroup] = useState<any>(null);
  const [shapes, setShapes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;
    Promise.all([
      shapeGroupsApi.get(groupId).catch(() => ({ data: null })),
      shapesApi.list({ groupId }),
    ])
      .then(([groupRes, shapesRes]) => {
        setGroup(groupRes.data);
        const shapesData = shapesRes.data?.data || shapesRes.data;
        setShapes(Array.isArray(shapesData) ? shapesData : []);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, activeTeamId]);

  const handleDelete = async (id: string) => {
    try {
      await shapesApi.delete(id);
      setShapes((prev) => prev.filter((s) => s.id !== id));
      message.success("Shape deleted");
    } catch {
      message.error("Failed to delete shape");
    }
  };

  if (loading)
    return (
      <div style={{ textAlign: "center", padding: 100 }}>
        <Spin size="large" />
      </div>
    );

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: isMobile ? "0 12px" : "0 16px",
      }}
    >
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => router.push("/dashboard/shapes")}
        style={{ marginBottom: 16 }}
      >
        Back to Shapes
      </Button>

      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          {group?.name || "Shape Group"}
        </Title>
        <Text type="secondary">
          {group?.description || `${shapes.length} shapes`}
        </Text>
      </div>

      {(Array.isArray(shapes) ? shapes : []).length > 0 ? (
        <Row gutter={[16, 16]}>
          {(Array.isArray(shapes) ? shapes : []).map((shape: any) => (
            <Col xs={24} sm={12} md={8} lg={6} xl={4} key={shape.id}>
              <ShapeCard shape={shape} onDelete={handleDelete} />
            </Col>
          ))}
        </Row>
      ) : (
        <Empty description="No shapes in this group" />
      )}
    </div>
  );
}

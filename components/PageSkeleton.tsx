"use client";

import React from 'react';
import { Skeleton, Card, Row, Col, Space } from 'antd';

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <Row gutter={[16, 16]}>
      {Array.from({ length: count }).map((_, i) => (
        <Col xs={24} sm={12} md={8} lg={6} key={i}>
          <Card>
            <Skeleton.Image style={{ width: '100%', height: 120 }} active />
            <Skeleton active paragraph={{ rows: 1 }} style={{ marginTop: 12 }} />
          </Card>
        </Col>
      ))}
    </Row>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card>
      <Skeleton active paragraph={{ rows }} />
    </Card>
  );
}

export function DetailSkeleton() {
  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Skeleton active title paragraph={{ rows: 0 }} />
      <Card>
        <Skeleton active paragraph={{ rows: 4 }} />
      </Card>
    </Space>
  );
}

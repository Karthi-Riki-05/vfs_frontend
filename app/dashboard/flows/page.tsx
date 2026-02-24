"use client";

import React, { useState, useEffect } from 'react';
import { Row, Col, Typography, Empty, Spin, Button, message, Space, Segmented } from 'antd';
import { AppstoreOutlined, BarsOutlined, InfoCircleOutlined } from '@ant-design/icons';
import FlowCard from '@/components/flows/FlowCard';
import DocumentsSidebar from '@/components/dashboard/DocumentsSidebar';
import axios from '@/lib/axios';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const { Title } = Typography;

export default function FlowsPage() {
    const [flows, setFlows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const { data: session } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (session) {
            fetchFlows();
        }
    }, [session]);

    const fetchFlows = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/flows');
            setFlows(response.data.flows || []);
        } catch (error) {
            console.error("Failed to fetch flows:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleView = (id: string) => {
        window.open(`/viewer/${id}`, '_blank');
    };

    const handleEdit = (id: string) => {
        router.push(`/dashboard/flows/${id}`);
    };

    const handleDelete = async (id: string) => {
        try {
            console.log('dele');
            await axios.delete(`/flows/${id}`);
            message.success("Flow deleted");
            fetchFlows();
        } catch (error) {
            message.error("Failed to delete flow");
        }
    };

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 115px)', margin: '-24px' }}>
            <DocumentsSidebar />

            <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 24
                }}>
                    <Title level={4} style={{ margin: 0 }}>Recent documents</Title>
                    <Space>
                        <Segmented
                            options={[
                                { value: 'list', icon: <BarsOutlined /> },
                                { value: 'grid', icon: <AppstoreOutlined /> },
                            ]}
                            value={viewMode}
                            onChange={(value) => setViewMode(value as 'grid' | 'list')}
                        />
                        <Button icon={<InfoCircleOutlined />} type="text" />
                    </Space>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '100px 0' }}>
                        <Spin size="large" />
                    </div>
                ) : flows.length > 0 ? (
                    <Row gutter={[16, 16]}>
                        {flows.map((flow: any) => (
                            <Col xs={24} sm={12} md={8} lg={6} xl={6} key={flow.id}>
                                <FlowCard
                                    flow={flow}
                                    onEdit={handleEdit}
                                    onView={handleView}
                                    onDelete={handleDelete}
                                />
                            </Col>
                        ))}
                    </Row>
                ) : (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="No documents found"
                        style={{ padding: '100px 0' }}
                    />
                )}
            </div>
        </div>
    );
}

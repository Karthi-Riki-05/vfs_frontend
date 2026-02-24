"use client";

import React, { useState, useEffect } from 'react';
import { Row, Col, Typography, Empty, Spin, Button, message } from 'antd';
import { AppstoreOutlined, BarsOutlined } from '@ant-design/icons';
import FlowCard from '@/components/flows/FlowCard';
import axios from '@/lib/axios';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

const { Title } = Typography;

export default function RecentDocuments() {
    const [flows, setFlows] = useState([]);
    const [loading, setLoading] = useState(true);
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
            // Fetch recent 4 flows for now, backend pagination might be needed later
            const response = await axios.get('/flows');
            // Sort by updated at? Backend usually handles this, assuming list is recent first or sorted.
            // If not, we might need to sort here.
            // Assuming response.data.flows is array
            const allFlows = response.data.flows || [];
            setFlows(allFlows.slice(0, 4)); // Take top 4
        } catch (error) {
            console.error("Failed to fetch recent flows:", error);
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
            await axios.delete(`/flows/${id}`);
            message.success("Flow deleted");
            fetchFlows();
        } catch (error) {
            message.error("Failed to delete flow");
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '40px 0' }}><Spin /></div>;
    }

    if (flows.length === 0) {
        return null; // Don't show section if empty, or show empty state differently
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>Recent documents</Title>
                <div>
                    <Button icon={<AppstoreOutlined />} type="text" />
                    <Button icon={<BarsOutlined />} type="text" />
                </div>
            </div>
            <Row gutter={[24, 24]}>
                {flows.map((flow: any) => (
                    <Col xs={24} sm={12} md={8} lg={6} key={flow.id}>
                        <FlowCard
                            flow={flow}
                            onEdit={handleEdit}
                            onView={handleView}
                            onDelete={handleDelete}
                        />
                    </Col>
                ))}
            </Row>
        </div>
    );
}

"use client";

import React, { useEffect, useState } from 'react';
import { Row, Col, Spin, Button, Card, Typography, message } from 'antd';
import { FolderOutlined, PlusOutlined } from '@ant-design/icons';
import SectionHeader from '@/components/common/SectionHeader';
import EmptyState from '@/components/common/EmptyState';
import api from '@/lib/axios';
import { useRouter } from 'next/navigation';

const { Text } = Typography;

interface Project {
  name: string;
  flowCount: number;
  flows: any[];
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const res = await api.get('/flows');
        const d = res.data?.data || res.data || {};
        const allFlows = d.flows || (Array.isArray(d) ? d : []);

        // Group flows by project/folder name, falling back to "Uncategorized"
        const grouped: Record<string, any[]> = {};
        allFlows.forEach((flow: any) => {
          const projectName = flow.project || flow.folder || flow.category || 'Uncategorized';
          if (!grouped[projectName]) grouped[projectName] = [];
          grouped[projectName].push(flow);
        });

        const projectList: Project[] = Object.entries(grouped).map(([name, flows]) => ({
          name,
          flowCount: flows.length,
          flows,
        }));

        setProjects(projectList);
      } catch {
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <SectionHeader
        title="ALL PROJECTS"
        right={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ borderRadius: 8 }}
            onClick={() => message.info('Create project coming soon')}
          >
            New Project
          </Button>
        }
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" />
        </div>
      ) : projects.length > 0 ? (
        <Row gutter={[16, 16]}>
          {projects.map((project) => (
            <Col xs={24} sm={12} md={8} lg={6} key={project.name}>
              <Card
                hoverable
                style={{
                  borderRadius: 12,
                  border: '1px solid #F0F0F0',
                  textAlign: 'center',
                  cursor: 'pointer',
                }}
                styles={{ body: { padding: '28px 16px' } }}
                onClick={() => message.info(`Open project: ${project.name}`)}
              >
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: '#FFF8E1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <FolderOutlined style={{ fontSize: 28, color: '#FFC107' }} />
                </div>
                <Text strong style={{ fontSize: 14, color: '#1A1A2E', display: 'block', marginBottom: 4 }} ellipsis>
                  {project.name}
                </Text>
                <Text style={{ fontSize: 12, color: '#8C8C8C' }}>
                  {project.flowCount} {project.flowCount === 1 ? 'flow' : 'flows'}
                </Text>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <EmptyState
          title="No projects yet"
          description="Organize your flows into projects"
          actionText="New Project"
          onAction={() => message.info('Create project coming soon')}
        />
      )}
    </div>
  );
}

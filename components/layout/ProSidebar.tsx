'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Menu, Typography, message } from 'antd';
import {
    CrownOutlined,
    ClockCircleOutlined,
    PlusSquareOutlined,
    FileTextOutlined,
    FolderOutlined,
    DeleteOutlined,
    QuestionCircleOutlined,
    StarFilled,
    MessageOutlined,
    TeamOutlined,
    ApartmentOutlined,
    AppstoreOutlined,
} from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createNewFlow } from '@/lib/flow';
import { flowsApi } from '@/api/flows.api';
import { proApi } from '@/api/pro.api';
import { usePro } from '@/hooks/usePro';

const { Sider } = Layout;
const { Text } = Typography;

interface ProSidebarProps {
    collapsed: boolean;
    onCollapse: (collapsed: boolean) => void;
}

const ProSidebar: React.FC<ProSidebarProps> = ({ collapsed, onCollapse }) => {
    const pathname = usePathname() || '';
    const router = useRouter();
    const { currentApp } = usePro();
    const [starredFlows, setStarredFlows] = useState<any[]>([]);
    const [switching, setSwitching] = useState(false);

    const fetchStarred = useCallback(async () => {
        try {
            const res = await flowsApi.getFavorites();
            const d = res.data?.data || res.data;
            setStarredFlows(Array.isArray(d) ? d : []);
        } catch {
            // Silently fail
        }
    }, []);

    useEffect(() => {
        fetchStarred();
    }, [fetchStarred]);

    const getSelectedKey = () => {
        if (pathname.startsWith('/dashboard/recents')) return 'recents';
        if (pathname.startsWith('/dashboard/flows')) return 'flows';
        if (pathname.startsWith('/dashboard/shapes')) return 'shapes';
        if (pathname.startsWith('/dashboard/teams')) return 'teams';
        if (pathname.startsWith('/dashboard/chat')) return 'chat';
        if (pathname.startsWith('/dashboard/drafts')) return 'drafts';
        if (pathname.startsWith('/dashboard/projects')) return 'projects';
        if (pathname.startsWith('/dashboard/trash')) return 'trash';
        if (pathname.startsWith('/dashboard/support')) return 'support';
        if (pathname === '/dashboard') return 'dashboard';
        return '';
    };

    const handleAppSwitch = async (targetApp: 'free' | 'pro') => {
        if (switching) return;
        setSwitching(true);
        try {
            await proApi.switchApp(targetApp);
            window.location.reload();
        } catch {
            message.error('Failed to switch app');
            setSwitching(false);
        }
    };

    const starredChildren = starredFlows.length > 0
        ? starredFlows.map((flow) => ({
            key: `starred-${flow.id}`,
            icon: <StarFilled style={{ color: '#FAAD14', fontSize: 12 }} />,
            label: (
                <span
                    onClick={(e) => {
                        e.preventDefault();
                        window.open(`/dashboard/flows/${flow.id}`, '_blank');
                    }}
                    style={{ cursor: 'pointer', fontSize: 13 }}
                >
                    {flow.name}
                </span>
            ),
        }))
        : [
            {
                key: 'starred-placeholder',
                label: (
                    <Text type="secondary" style={{ fontSize: 13 }}>
                        No starred items
                    </Text>
                ),
                disabled: true,
            },
        ];

    const menuItems = [
        {
            key: 'recents',
            icon: <ClockCircleOutlined />,
            label: <Link href="/dashboard/recents">Recents</Link>,
        },
        {
            key: 'create-flow',
            icon: <PlusSquareOutlined style={{ color: '#3CB371' }} />,
            label: <span style={{ color: '#3CB371' }}>Create a Flow</span>,
            onClick: () => createNewFlow(),
        },
        {
            type: 'divider' as const,
            key: 'divider-1',
        },
        {
            key: 'flows',
            icon: <ApartmentOutlined />,
            label: <Link href="/dashboard/flows">Flows</Link>,
        },
        {
            key: 'shapes',
            icon: <AppstoreOutlined />,
            label: <Link href="/dashboard/shapes">Shapes</Link>,
        },
        {
            key: 'teams',
            icon: <TeamOutlined />,
            label: <Link href="/dashboard/teams">Teams</Link>,
        },
        {
            key: 'chat',
            icon: <MessageOutlined />,
            label: <Link href="/dashboard/chat">Chat</Link>,
        },
        {
            type: 'divider' as const,
            key: 'divider-2',
        },
        {
            key: 'drafts',
            icon: <FileTextOutlined />,
            label: <Link href="/dashboard/drafts">Drafts</Link>,
        },
        {
            key: 'projects',
            icon: <FolderOutlined style={{ color: '#FFC107' }} />,
            label: <Link href="/dashboard/projects">All Projects</Link>,
        },
        {
            key: 'trash',
            icon: <DeleteOutlined />,
            label: <Link href="/dashboard/trash">Trash</Link>,
        },
        {
            type: 'divider' as const,
            key: 'divider-3',
        },
        {
            type: 'group' as const,
            key: 'starred-group',
            label: (
                <span
                    style={{
                        textTransform: 'uppercase',
                        fontSize: 11,
                        color: '#BFBFBF',
                        fontWeight: 600,
                        paddingLeft: 0,
                    }}
                >
                    Starred
                </span>
            ),
            children: starredChildren,
        },
    ];

    return (
        <Sider
            width={220}
            collapsedWidth={60}
            collapsible
            collapsed={collapsed}
            onCollapse={onCollapse}
            trigger={null}
            style={{
                background: '#FFFFFF',
                borderRight: '1px solid #F0F0F0',
                display: 'flex',
                flexDirection: 'column',
                height: 'calc(100vh - 56px)',
                position: 'fixed',
                top: 56,
                left: 0,
                overflow: 'hidden',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                }}
            >
                {/* Top: App Switch Toggle */}
                {!collapsed && (
                    <div style={{ padding: '12px 16px 0' }}>
                        <div
                            style={{
                                display: 'flex',
                                borderRadius: 8,
                                border: '1px solid #E8E8E8',
                                overflow: 'hidden',
                                fontSize: 12,
                                fontWeight: 600,
                            }}
                        >
                            <div
                                style={{
                                    flex: 1,
                                    textAlign: 'center',
                                    padding: '6px 0',
                                    cursor: currentApp === 'free' ? 'default' : 'pointer',
                                    background: currentApp === 'free' ? '#3CB371' : '#fff',
                                    color: currentApp === 'free' ? '#fff' : '#595959',
                                    transition: 'all 0.2s',
                                }}
                                onClick={() => currentApp !== 'free' && handleAppSwitch('free')}
                            >
                                ValueChart
                            </div>
                            <div
                                style={{
                                    flex: 1,
                                    textAlign: 'center',
                                    padding: '6px 0',
                                    cursor: currentApp === 'pro' ? 'default' : 'pointer',
                                    background: currentApp === 'pro' ? '#F59E0B' : '#fff',
                                    color: currentApp === 'pro' ? '#fff' : '#595959',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 4,
                                }}
                                onClick={() => currentApp !== 'pro' && handleAppSwitch('pro')}
                            >
                                <CrownOutlined style={{ fontSize: 11 }} />
                                PRO
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation Menu */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <Menu
                        mode="inline"
                        selectedKeys={[getSelectedKey()]}
                        items={menuItems}
                        style={{
                            border: 'none',
                            background: 'transparent',
                        }}
                    />
                </div>

                {/* Bottom: Get Support */}
                <div
                    style={{
                        borderTop: '1px solid #F0F0F0',
                        padding: collapsed ? '12px 0' : '12px 16px',
                    }}
                >
                    <Link
                        href="/dashboard/support"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            color: '#3CB371',
                            fontSize: 14,
                            textDecoration: 'none',
                            justifyContent: collapsed ? 'center' : 'flex-start',
                        }}
                    >
                        <QuestionCircleOutlined style={{ color: '#3CB371', fontSize: 16 }} />
                        {!collapsed && <span>Get Support</span>}
                    </Link>
                </div>
            </div>

            <style jsx global>{`
                .ant-layout-sider .ant-menu-item {
                    height: 40px !important;
                    line-height: 40px !important;
                    font-size: 14px !important;
                    margin: 0 !important;
                    border-radius: 0 !important;
                    width: 100% !important;
                }
                .ant-layout-sider .ant-menu-item:hover {
                    background: #F8F9FA !important;
                }
                .ant-layout-sider .ant-menu-item-selected {
                    color: #3CB371 !important;
                    background: #F0FFF4 !important;
                }
                .ant-layout-sider .ant-menu-item-selected a {
                    color: #3CB371 !important;
                }
                .ant-layout-sider .ant-menu-item a {
                    color: inherit;
                    text-decoration: none;
                }
            `}</style>
        </Sider>
    );
};

export default ProSidebar;

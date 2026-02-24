"use client";

import React, { useState } from 'react';
import { Layout, Menu, Button, Space, Typography, Avatar, Dropdown, Input, theme } from 'antd';
import {
    HomeOutlined,
    FileTextOutlined,
    AppstoreOutlined,
    ApiOutlined,
    PlusOutlined,
    SearchOutlined,
    UserOutlined,
    MenuOutlined,
    TeamOutlined,
    BellOutlined,
    QuestionCircleOutlined,
    DownOutlined,
    FormatPainterOutlined
} from '@ant-design/icons';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const { data: session } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const {
        token: { colorBgContainer },
    } = theme.useToken();

    const menuItems = [
        {
            key: '/dashboard',
            icon: <HomeOutlined />,
            label: <Link href="/dashboard">Home</Link>,
        },
        {
            key: '/dashboard/flows',
            icon: <FileTextOutlined />,
            label: <Link href="/dashboard/flows">Documents</Link>,
        },
        {
            key: '/dashboard/shapes',
            icon: <FormatPainterOutlined />,
            label: <Link href="/dashboard/shapes">Shapes</Link>,
        },
        {
            key: 'templates',
            icon: <AppstoreOutlined />,
            label: 'Templates',
            disabled: true,
        },
        {
            key: 'integrations',
            icon: <ApiOutlined />,
            label: 'Integrations',
            disabled: true,
        },
    ];

    const userMenuItems: any[] = [
        {
            key: 'profile',
            label: 'Profile',
            icon: <UserOutlined />,
        },
        {
            type: 'divider',
        },
        {
            key: 'logout',
            label: 'Logout',
            icon: <React.Fragment><span style={{ color: 'red' }}>Logout</span></React.Fragment>, // Using React.Fragment for simple wrapper
            onClick: () => signOut({ callbackUrl: '/login' }),
        },
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider
                trigger={null}
                collapsible
                collapsed={collapsed}
                width={250}
                collapsedWidth={isMobile ? 0 : 80}
                breakpoint="md"
                onBreakpoint={(broken) => {
                    setIsMobile(broken);
                    setCollapsed(broken);
                }}
                style={{
                    background: '#2C3E50', // Dark sidebar color
                    overflow: 'auto',
                    height: '100vh',
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    zIndex: 200
                }}
            >
                {/* User/Team Selector */}
                <div style={{
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    color: 'white',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <Avatar
                        size={32}
                        style={{ backgroundColor: '#1677ff', marginRight: 12 }}
                    >
                        {session?.user?.name?.[0] || 'K'}

                    </Avatar>
                    {!collapsed && (
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <Text style={{ color: 'white', display: 'block', fontWeight: 500 }} ellipsis>
                                {session?.user?.name || 'Personal'}

                            </Text>
                            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }} ellipsis>
                                Free plan
                            </Text>
                        </div>
                    )}
                </div>

                {/* New Button */}
                <div style={{ padding: '16px' }}>
                    <Button
                        type="primary"
                        block
                        icon={<PlusOutlined />}
                        style={{
                            height: 40,
                            borderRadius: 6,
                            justifyContent: collapsed ? 'center' : 'flex-start',
                            paddingLeft: collapsed ? 0 : 16
                        }}
                        onClick={() => window.open('/viewer/new', '_blank')} // Simplified new flow
                    >
                        {!collapsed && "New"}
                    </Button>
                </div>

                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[pathname || '']}

                    items={menuItems}
                    style={{ background: 'transparent' }}
                />
            </Sider>
            <Layout style={{ marginLeft: collapsed ? (isMobile ? 0 : 80) : 250, transition: 'all 0.2s' }}>
                <Header style={{
                    padding: '0 24px',
                    background: colorBgContainer,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 99,
                    height: 64
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {isMobile && (
                            <Button type="text" icon={<MenuOutlined style={{ fontSize: 20 }} />} onClick={() => setCollapsed(!collapsed)} />
                        )}

                        {!isMobile && (
                            <Input
                                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                                placeholder="Search by title or content"
                                style={{
                                    maxWidth: 400,
                                    borderRadius: 6,
                                    background: '#f5f5f5',
                                    border: 'none'
                                }}
                                variant="borderless"
                            />
                        )}
                    </div>

                    <Space size="large">
                        <Button type="primary" size="small" style={{ borderRadius: 4 }}>Upgrade</Button>
                        <BellOutlined style={{ fontSize: 18, cursor: 'pointer', color: '#595959' }} />
                        <QuestionCircleOutlined style={{ fontSize: 18, cursor: 'pointer', color: '#595959' }} />

                        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                            <Space style={{ cursor: 'pointer' }}>
                                <Avatar
                                    style={{ backgroundColor: '#87d068' }}
                                    src={session?.user?.image || undefined}

                                >
                                    {session?.user?.name?.[0] || <UserOutlined />}

                                </Avatar>
                            </Space>
                        </Dropdown>
                    </Space>
                </Header>
                <Content style={{
                    margin: isMobile ? '16px 8px' : '24px 16px',
                    padding: 24,
                    minHeight: 280,
                    // background: '#fff', // Typically dashboards have light gray bg
                    overflow: 'initial'
                }}>
                    {children}
                </Content>
            </Layout>
        </Layout>
    );
}

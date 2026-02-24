"use client";

import { SessionProvider } from "next-auth/react";
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <AntdRegistry>
                <ConfigProvider theme={{ token: { colorPrimary: '#1677ff' } }}>
                    {children}
                </ConfigProvider>
            </AntdRegistry>
        </SessionProvider>
    );
}
